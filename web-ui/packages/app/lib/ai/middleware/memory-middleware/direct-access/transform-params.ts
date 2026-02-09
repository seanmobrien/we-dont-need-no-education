import {
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';
import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { aiModelFactory } from '../../../aiModelFactory';
import {
  ChatHistoryContext,
  createAgentHistoryContext,
  wrapChatHistoryMiddleware,
} from '../../chat-history';
import { generateTextWithRetry } from '../../../core/generate-text-with-retry';
import { getDefinitionsFromText } from '@semanticencoding/core';
import {
  DeepPartial,
  hasToolCall,
  NoOutputSpecifiedError,
  Output,
  stepCountIs,
  ToolSet,
} from 'ai';
import { StopConditions } from '../../stop-conditions';
import {
  type MemoryAugmentationResult,
  MemoryAugmentationResultSchema,
} from '../memory-augmentation-result';
import type {
  MemoryMiddlewareContext,
  MemoryMiddlewareAugmentationStrategy,
} from '../types';
import { repairTopMemoriesToolCall } from '../repair-top-memories';
import { segregateLatestRequest } from '../util';

const retrieveMemories = async ({
  params: { prompt: incomingPrompt },
  context,
}: {
  params: LanguageModelV2CallOptions;
  context: MemoryMiddlewareContext;
}): Promise<MemoryAugmentationResult | null> => {
  let chatHistoryContext: ChatHistoryContext | undefined = undefined;
  try {
    // Split request into latest and prior messages to
    // focus memory search on latest user input
    const promptParts = segregateLatestRequest(incomingPrompt);
    context.memoryInsertSlot = promptParts.prior?.length ?? 0;
    const searchPrompt = `You are the **Memory Optimization Module** for a compliance and legal analysis engine.  
Your purpose is to retrieve, consolidate, evaluate, and rank memories that support accurate reasoning for the **Latest User Input**.

🗂️ Responsibilities  
📌 You MUST follow all constraints exactly.  
🧭 Maintain alignment with compliance-oriented policy goals.

📝 Workflow(Follow in Order)

1. 🔍 Derive Search Semantics
  - Extract up to **5 search terms**:
    - 🔑 coreTerms from explicit user language
    - 🌐 broadTerms from contextual/legal synonyms
    - 🎯 precisionTerms targeting narrow disambiguation
  - 🧱 Do NOT invent entities or terms not grounded in memory or input.

2. 🔍 Execute Memory Retrieval
  - Perform one search per term via the memory-search tool.  
  - 📤 Exclude irrelevant or out-of-domain clusters.  
  - 📥 Include clusters directly tied to legal frameworks, deadlines, or violations.

3. 🗃️ Consolidate Memory Records
  - Deduplicate identical or near-identical items.  
  - Aggregate items with >70% similarity into a single 🧮 derived cluster.  
  - Annotate data integrity indicators:
    - 🧩 incomplete records
    - 🛑 missing required records
    - 🏷️ tampered or inconsistent metadata

4. 🧠 Rank Memories  
  Apply ranking using the following hierarchy:
  1. Semantic relevance to Latest User Input
  2. Goal alignment with Prior Interactions
  3. Information utility for compliance/legal reasoning  
  4. Temporal significance(⏱️ deadlines, 🕰️ delays, 📅 key events)
  5. Recency as final tie-breaker
5. 📝 Construct Output
  - Return **top 5 memories verbatim**
  - Summaries for up to **10 additional memories**
    - Annotate traceability:
  - 🔎 list influencing memory IDs
  - 📊 confidence estimate
  - If >15 total, truncate and provide recommended search refinements.

🧱 Boundary Constraint  
You MUST NOT fabricate memories, facts, dates, actors, or policies.

🗂️ Inputs

--- Prior Interactions(Context Only)---
${JSON.stringify(promptParts.prior, null, 2)}

--- Latest User Input(Search Target)---
${JSON.stringify(promptParts.latest, null, 2)}
`;
    const ontology = getDefinitionsFromText(searchPrompt);
    const prompt = [
      {
        role: 'system' as const,
        content: `The following definitions are provided to help you understand the context and terminology used in the user's prompt:\n\n${JSON.stringify(
          ontology,
          null,
          2
        )}`,
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: searchPrompt,
          },
        ],
      },
    ];
    chatHistoryContext = createAgentHistoryContext({
      operation: 'mem0.chat::retrieval',
      iteration: 1,
      originatingUserId: '-1',
      metadata: {
        ...{
          sourceChatId: context.chatId,
          sourceMessageId: context.messageId,
          chatId: context.chatId,
          userId: context.userId,
        },
      },
    });

    const tools = Object.entries(context.toolProviders?.tools ?? {}).reduce(
      (acc, [key, providerTool]) => {
        if (key !== 'search_memory') {
          return acc;
        }
        acc[key] = providerTool;
        return acc;
      },
      {} as ToolSet
    );
    if (Object.keys(tools).length === 0) {
      log((l) =>
        l.warn(
          'No search_memory tool provider found in context for direct access memory retrieval.'
        )
      );
      return null;
    }
    // Currently wrapping chat history inside memory, so chat ID won't be available here - but we don't need to
    // set up a full chat history for this operation if we're inserting our prompt before the chat history middleware
    // runs.
    // const chatId = chatIdFromParams(params) ?? {} as { chatId?: string; turnId?: string; messageId?: string };
    // Wrap model with chat history middleware so we can keep an eye on memory retrieval and updates
    // and tool proxy middleware to enable memory search tool
    const memoryModel = wrapChatHistoryMiddleware({
      model: await aiModelFactory('completions'),
      chatHistoryContext,
    });

    const response = await generateTextWithRetry<
      ToolSet,
      MemoryAugmentationResult,
      DeepPartial<MemoryAugmentationResult>
    >({
      model: memoryModel,
      experimental_output: Output.object({
        schema: MemoryAugmentationResultSchema,
      }),
      prompt,
      stopWhen: [
        stepCountIs(150),
        hasToolCall('askConfirmation'),
        StopConditions<ToolSet>((sc) => sc.noToolsPending),
      ],
      tools,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-tool-mem0-search-augmentation',
        metadata: {},
      },
      experimental_repairToolCall: repairTopMemoriesToolCall,
    });
    chatHistoryContext?.dispose()?.catch((err: unknown) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        source: 'memory-middleware:retrieve-memories:chat-history:dispose',
        log: false,
      });
    });
    try {
      return (
        (response as { resolvedOutput?: MemoryAugmentationResult })
          .resolvedOutput ??
        response.experimental_output ??
        null
      );
    } catch (error) {
      if (NoOutputSpecifiedError.isInstance(error)) {
        log((l) =>
          l.silly(
            `Memory retrieval did not return expected output structure.  Response: ${safeSerialize(
              response,
              { maxObjectDepth: 3 }
            )}`
          )
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    chatHistoryContext?.dispose()?.catch((err: unknown) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        source: 'memory-middleware:retrieve-memories:chat-history:dispose',
        log: false,
        data: {
          outer: safeSerialize(error),
        },
      });
    });
  }
  return null;
};

const augmentWithDirectAccess = async ({
  params,
  context,
}: {
  params: LanguageModelV2CallOptions;
  context: MemoryMiddlewareContext;
}): Promise<LanguageModelV2CallOptions> => {
  const memoryAugmentation = await retrieveMemories({ params, context });
  if (!memoryAugmentation || !memoryAugmentation.topMemories?.length) {
    // No memories retrieved, return original params
    log((l) =>
      l.warn(
        `No memories retrieved for direct access augmentation for chat id ${context.chatId}/message id ${context.messageId}`
      )
    );
    return params;
  }
  const incomingPrompt = Array.isArray(params.prompt)
    ? params.prompt
    : [params.prompt];
  // Find the last system prompt for prepending memory context
  const insertSlot = context.memoryInsertSlot ?? 0;
  // Splice mutates in-place so we can just return params afterwards
  incomingPrompt.splice(insertSlot, 0, {
    role: 'system',
    content:
      `The following memories were retrieved to assist in generating your response:\n\n` +
      `${JSON.stringify(memoryAugmentation, null, 2)}\n\n` +
      `Incorporate these memories as needed to provide accurate and contextually relevant answers.` +
      `If deeper context is required, use the \`search_memory\` tool to find additional information.`,
  }) satisfies LanguageModelV2Prompt;
  return params;
};

export const transformParams: MemoryMiddlewareAugmentationStrategy['transformParams'] =
  ({
    params,
    context,
  }: {
    params: LanguageModelV2CallOptions;
    context: MemoryMiddlewareContext;
  }): Promise<LanguageModelV2CallOptions> =>
    augmentWithDirectAccess({ params, context });

export default transformParams;
