import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Message,
  LanguageModelV2Middleware,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Memory, MemoryClient } from '../mem0';
import { log, safeSerialize } from '@/lib/logger';
import { MiddlewareStateManager } from './state-management';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ToolProviderSet } from '../mcp';
import { ImpersonationService } from '@/lib/auth/impersonation';
import { aiModelFactory } from '../aiModelFactory';
import { ChatHistoryContext, chatIdFromParams, createAgentHistoryContext, wrapChatHistoryMiddleware } from './chat-history';
import { generateTextWithRetry } from '../core/generate-text-with-retry';
import { getDefinitionsFromText } from '@semanticencoding/core';
import { DeepPartial, generateObject, hasToolCall, NoOutputSpecifiedError, NoSuchToolError, Output, stepCountIs, Tool, tool, ToolCallRepairFunction, ToolSet, wrapLanguageModel } from 'ai';
import z from 'zod';
import { wrapWithToolProxyMiddleware } from './tool-proxy';

type MemoryMiddlewareOptions = {
  projectId?: string;
  orgId?: string;
  impersonation?: ImpersonationService;
  mem0Enabled?: boolean;
  directAccess?: boolean;
  userId: string | undefined;
  chatId: string;
  messageId: string;
  toolProviders?: ToolProviderSet;
};

type MemoryMiddlewareContext = {
  memClient: MemoryClient | undefined;
  impersonation: ImpersonationService | undefined;
  projectId: string | undefined;
  organizationId: string | undefined;
  mem0Enabled: boolean | undefined;
  directAccess: boolean | undefined;
  userId: string | undefined;
  chatId: string;
  messageId: string;
  memoryInsertSlot?: number;
  toolProviders?: ToolProviderSet;
};

const MemoryAugmentationResultSchema = z.object({
  searchSemantics: z.array(
    z.object({
      term: z.string(),
      type: z.enum(['coreTerms', 'broadTerms', 'precisionTerms']),
      hits: z.number(),
    })
  ).describe('Array of derived search semantics - at least three expected')
    .nonempty()
    .min(3),
  topMemories: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the memory item'),
      content: z.string().describe('Content of the memory item'),
      hash: z.string().describe('Hash of the memory content for integrity verification'),
      createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/).describe('ISO-8601 Timestamp when the memory was created'),
      score: z.number().describe('Relevance score of the memory item'),
      integrity: z.string().describe('Integrity status of the memory item'),
    })
  ).nonempty()
    .describe('Array of top memories retrieved - returned verbatim'),
  additionalMemoriesSummarized: z.array(
    z.object({
      searchTerm: z.string().describe('Search term used to find these or similar memories'),
      summary: z.string().describe('Summary of the additional memory cluster'),
    })
  ).describe('Array of summarized additional memories')
    .optional(),
  truncated: z.boolean().describe('Indicates if results were truncated').default(false),
  traceability: z.object({
    influencing_memory_ids: z.array(z.string()).describe('IDs of memories that influenced the results'),
    confidence_estimate: z.object({
      number: z.number().describe('Confidence score for the memory retrieval'),
      reasons: z.array(z.string()).describe('Reasons supporting the confidence estimate'),
    }).describe('Confidence estimate details')
      .required(),
  }).describe('Traceability information for the memory retrieval')
    .required(),
  additionalSearchTerms: z.array(
    z.object({
      term: z.string().describe('Additional search term recommended for further retrieval'),
      reason: z.string().describe('Reason for recommending this additional search term'),
    })
  ).describe('Array of additional search terms recommended for further retrieval')
    .optional(),
  comments: z.array(z.string()).describe('Additional comments regarding the memory retrieval process')
    .optional(),
}).describe('Result structure for memory augmentation retrieval');


const segregateLatestRequest = (prompt: LanguageModelV2Prompt) => {
  const latest: Array<LanguageModelV2Message> = [];
  const prior: Array<LanguageModelV2Message> = [];
  if (!Array.isArray(prompt)) {
    return {
      latest: [prompt],
      prior: [],
    };
  }

  // Run backwards until we encounter an assistant response  
  let i = prompt.length - 1;
  for (; i >= 0; i--) {
    const p = prompt[i];
    if (p.role !== 'assistant') {
      latest.unshift(p);
    } else {
      // Break out of loop to keep iterator at this position
      break;
    }
  }
  // All remaining messages are prior and should have tool 
  // requests and responses stripped out
  for (let j = 0; j <= i; j++) {
    const p = prompt[j];
    if (p.content === undefined) {
      continue;
    }
    if (typeof p.content === 'string') {
      prior.push(p);
      continue;
    }
    if (Array.isArray(p.content)) {
      type LanguageModelV2MessageContent = LanguageModelV2Message['content'] extends infer TContent
        ? TContent extends string
        ? string
        : TContent extends Array<infer ArrayItemType>
        ? ArrayItemType
        : never
        : never;

      const filteredContents = p.content.filter((m: LanguageModelV2MessageContent) => {
        if (typeof m === 'object' && !!m && (m.type === 'tool-call' || m.type === 'tool-result')) {
          return false;
        }
        return true;
      });
      if (filteredContents.length === 0) {
        continue;
      }
      prior.push({
        ...p,
        content: filteredContents as any,
      });
    } else {
      prior.push(p);
      if (p.role === 'user' || p.role === 'assistant' || p.role === 'system') {
        prior.push(p);
      }
    }
  }

  return {
    latest,
    prior,
  };
};

type MemoryAugmentationResult = {
  searchSemantics: Array<{
    term: string;
    type: 'coreTerms' | 'broadTerms' | 'precisionTerms';
    hits: number;
  }>;
  topMemories: Array<{
    id: string;
    content: string;
    hash: string;
    createdAt: string;
    score: number;
    integrity: string;
  }>;
  additionalMemoriesSummarized?: Array<{
    searchTerm: string;
    summary: string;
  }>;
  truncated?: boolean;
  traceability?: {
    influencing_memory_ids: Array<string>;
    confidence_estimate: {
      number: number;
      reasons: string[];
    };
  };
  additionalSearchTerms?: Array<{
    term: string;
    reason: string;
  }>;
  comments?: Array<string>;
};

export const repairTopMemoriesToolCall: ToolCallRepairFunction<ToolSet> = async (options) => {
  if (NoSuchToolError.isInstance(options.error)) {
    return null;
  }

  let parsedInput: unknown;
  try {
    parsedInput = JSON.parse(options.toolCall.input);
  } catch {
    return null;
  }

  const inputAsRecord = parsedInput as Record<string, unknown>;
  const topMemories = Array.isArray(inputAsRecord?.topMemories)
    ? inputAsRecord.topMemories
    : null;

  if (!topMemories) {
    return null;
  }

  const normalizeOffset = (offset: string | undefined) => {
    if (!offset) return '';
    if (offset === 'Z') return 'Z';
    if (offset.includes(':')) return offset;
    return `${offset.slice(0, 3)}:${offset.slice(3)}`;
  };

  const normalizeCreatedAt = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    const match = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})[T ]([0-9]{2}:[0-9]{2})(?::[0-9]{2}(?:\.[0-9]+)?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$/);

    const dateValue = new Date(value);
    if (!match || Number.isNaN(dateValue.getTime())) {
      return null;
    }

    const [, datePart, timePart, offsetPart] = match;
    return `${datePart}T${timePart}${normalizeOffset(offsetPart)}`;
  };

  let mutated = false;
  const repairedTopMemories = (topMemories as Array<Record<string, unknown>>).map((memory) => {
    if (!memory || typeof memory !== 'object') {
      return memory;
    }

    const currentCreatedAt = (memory as { createdAt?: unknown }).createdAt;
    const repaired = normalizeCreatedAt(currentCreatedAt);
    if (!repaired || repaired === currentCreatedAt) {
      return memory;
    }

    mutated = true;
    return {
      ...memory,
      createdAt: repaired,
    };
  });

  if (!mutated) {
    return null;
  }

  return {
    ...options.toolCall,
    input: JSON.stringify({
      ...inputAsRecord,
      topMemories: repairedTopMemories,
    }),
  };
};

const retrieveMemories = async ({
  params: { prompt: incomingPrompt, ...params }, context }:
  { params: LanguageModelV2CallOptions; context: MemoryMiddlewareContext }
): Promise<MemoryAugmentationResult | null> => {
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
        content: `The following definitions are provided to help you understand the context and terminology used in the user's prompt:\n\n${JSON.stringify(ontology, null, 2)}`
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: searchPrompt,
          }
        ]
      }
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
        }
      }
    });

    const tools = Object.entries((context.toolProviders?.tools ?? {})).reduce((acc, [key, providerTool]) => {
      if (key !== 'search_memory') {
        return acc;
      }
      acc[key] = providerTool;
      return acc;
    }, {} as ToolSet);
    if (Object.keys(tools).length === 0) {
      log(l => l.warn('No search_memory tool provider found in context for direct access memory retrieval.'));
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
      chatHistoryContext
    });


    const response = await generateTextWithRetry<ToolSet, MemoryAugmentationResult, DeepPartial<MemoryAugmentationResult>>({
      model: memoryModel,
      experimental_output: Output.object({
        schema: MemoryAugmentationResultSchema,
      }),
      prompt,
      stopWhen: [
        stepCountIs(150),
        hasToolCall('askConfirmation'),
        ({ steps }) => steps.every(step => step.finishReason !== 'tool-calls')
      ],
      tools,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-tool-mem0-search-augmentation',
        metadata: {},
      },
      experimental_repairToolCall: repairTopMemoriesToolCall,
    });
    chatHistoryContext?.dispose()
      ?.catch((err) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'memory-middleware:retrieve-memories:chat-history:dispose',
          log: false,
        });
      });
    try {
      return (response as { resolvedOutput?: MemoryAugmentationResult }).resolvedOutput ??
        response.experimental_output ?? null;
    } catch (error) {
      if (NoOutputSpecifiedError.isInstance(error)) {
        log(l => l.silly(`Memory retrieval did not return expected output structure.  Response: ${safeSerialize(response, { maxObjectDepth: 3 })}`));
      } else {
        throw error;
      }
    }
  } catch (error) {
    chatHistoryContext?.dispose()
      ?.catch((err) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'memory-middleware:retrieve-memories:chat-history:dispose',
          log: false,
        });
      });
  }
  return null;
};

const augmentWithDirectAccess = async ({
  params, context }:
  { params: LanguageModelV2CallOptions; context: MemoryMiddlewareContext }): Promise<LanguageModelV2CallOptions> => {
  const memoryAugmentation = await retrieveMemories({ params, context });
  if (!memoryAugmentation || !memoryAugmentation.topMemories?.length) {
    // No memories retrieved, return original params
    log(l => l.warn(`No memories retrieved for direct access augmentation for chat id ${context.chatId}/message id ${context.messageId}`));
    return params;
  }
  const incomingPrompt = Array.isArray(params.prompt) ? params.prompt : [params.prompt];
  // Find the last system prompt for prepending memory context
  const insertSlot = context.memoryInsertSlot ?? 0;
  // Splice mutates in-place so we can just return params afterwards
  incomingPrompt.splice(insertSlot, 0, {
    role: 'system',
    content: `The following memories were retrieved to assist in generating your response:\n\n` +
      `${JSON.stringify(memoryAugmentation, null, 2)}\n\n` +
      `Incorporate these memories as needed to provide accurate and contextually relevant answers.` +
      `If deeper context is required, use the \`search_memory\` tool to find additional information.`,
  }) satisfies LanguageModelV2Prompt;
  return params;
};

export const memoryMiddlewareFactory: (context: MemoryMiddlewareContext) => LanguageModelV2Middleware = (context) => ({
  wrapStream: async ({ doStream }) => {
    try {
      log(l => l.verbose('=== Memory middleware stream start ==='));
      const { stream, ...rest } = await doStream();
      const transformStream = new TransformStream<
        LanguageModelV2StreamPart,
        LanguageModelV2StreamPart
      >({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        flush() {
          log(l => l.verbose('Memory middleware stream flushed'));
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'memoryMiddleware',
        log: true,
      })
    } finally {
      log(l => l.verbose('=== Memory middleware stream end ==='));
    }
  },

  transformParams: async ({ params }) => {
    try {
      const { mem0Enabled, directAccess } = context;
      if (!mem0Enabled) {
        return params;
      }
      if (directAccess) {
        // Use direct (well, model-assisted) access to memory system for retrieval.  More complex, but better results.
        try {
          params = await augmentWithDirectAccess({ params, context });
          if (params) {
            log(l => l.warn('Memory augmentation returned null - falling back to prompt-based injection.'));
            return params;
          }
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'memory-middleware:augment-with-direct-access',
            log: true,
          });
          log(l => l.warn(`An error occurred augmenting prompt with direct access memory retrieval - falling back to prompt-based injection.  Details: ${safeSerialize(error, { maxObjectDepth: 3 })}`));
        }
      }
      // Inject memory system prompt and let model use tools for retrieval and updates - quick and easy, but burns tokens
      // against the user prompt and does not provide the same robust search and ranking capabilities as direct access.
      if (!Array.isArray(params.prompt)) {
        params.prompt = [params.prompt];
      }
      const insertIndex = params.prompt.findLastIndex(m => m.role === 'assistant');
      const memoryPrompt = {
        role: 'system',
        content:
          'You are a helpful assistant equipped with an advanced memory module that enables you to remember past interactions.' +
          ' Your memory is designed to assist you in providing more relevant and personalized responses based on previous conversations.' +
          ' Before generating a response, you will use the `search_memory` tool to search your memory for relevant past interactions.' +
          ' If you find relevant memories, you will incorporate them into your response.' +
          ' If no relevant memories are found, you will respond based solely on the current prompt.' +
          ' After generating a response, you will provide the `add_memories` tool with all details needed to update your memory with ' +
          'information from the new interaction.'
      } as const;
      if (insertIndex === -1) {
        params.prompt = [
          memoryPrompt,
          ...params.prompt,
        ];
      } else {
        params.prompt.splice(insertIndex + 1, 0, memoryPrompt);
      }
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'memory-middleware:transform-params',
        log: true,
      });
      log(l => l.warn(`An error occurred accessing memory - some context may not be available.  Details: ${safeSerialize(error, { maxObjectDepth: 3 })}`));
    }
    return params;
  },
});

export const memoryMiddlewareContextFactory = ({
  projectId,
  orgId,
  impersonation,
  mem0Enabled,
  userId,
  chatId,
  messageId,
  toolProviders,
  directAccess = true
}: Omit<MemoryMiddlewareOptions, 'model'>): MemoryMiddlewareContext => {

  return {
    impersonation,
    projectId: projectId,
    organizationId: orgId,
    toolProviders,
    mem0Enabled,
    directAccess,
    userId,
    chatId,
    messageId,
    memClient: undefined,
  };
};

export const memoryMiddleware = (options: MemoryMiddlewareOptions) => {
  const context = memoryMiddlewareContextFactory(options);
  return MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'memory-middleware',
    middleware: memoryMiddlewareFactory(context),
  });
};

export const wrapMemoryMiddleware = ({
  model,
  ...options
}: MemoryMiddlewareOptions & { model: LanguageModelV2 }) =>
  wrapLanguageModel({
    model,
    middleware: memoryMiddleware(options),
  });


export default memoryMiddleware;
