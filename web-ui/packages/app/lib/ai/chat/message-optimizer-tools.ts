import { generateObject, UIMessage } from 'ai';
import {
  LanguageModelV2Prompt,
  LanguageModelV2Message,
} from '@ai-sdk/provider';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';
import { log } from '@compliance-theater/logger';
import { createHash } from 'crypto';
// import { v4 as uuidv4 } from 'uuid';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';
// import { ToolMap } from '../services/model-stats/tool-map';
import { createAgentHistoryContext } from '../middleware/chat-history/create-chat-history-context';
import { LoggedError } from '@/lib/react-util';
import z from 'zod';
import { DbTransactionType, drizDbWithInit, schema } from '@/lib/drizzle-db';
import { ThisDbQueryProvider } from '@/lib/drizzle-db/schema';
import { and, eq, not } from 'drizzle-orm';
import { AttributeValue } from '@opentelemetry/api';
import { isKeyOf } from '@compliance-theater/typescript';
import { countTokens } from '../core/count-tokens';
import {
  ChatToolCallsType,
  ChatToolType,
} from '@/lib/drizzle-db/drizzle-types';
import { ToolMap } from '../services/model-stats/tool-map';
// import { sql } from 'drizzle-orm';

/**
 * Create a chat_tool_calls record for a specific tool call
 * @param tx Database transaction context
 * @param chatToolId The chat tool ID from the tool map
 * @param chatMessageId The UUID of the chat message this tool call belongs to
 * @param providerId The provider-specific tool call ID
 * @param toolRequest Array of tool request messages
 * @param toolResult Array of tool result/response messages
 * @returns The generated chatToolCallId UUID
 */
// Generic minimal part representation used internally (supports legacy UIMessage parts and V2 parts)
type GenericPart = {
  type: string;
  state?: string;
  toolCallId?: string;
  toolName?: string;
  [k: string]: unknown;
};
// Legacy UIMessage shape compatibility minimal subset
interface LegacyMessageShape {
  id?: string;
  role: string;
  parts?: GenericPart[];
  content?: unknown;
  toolInvocations?: unknown;
  [k: string]: unknown;
}
// Include UIMessage explicitly so test helpers passing UIMessage instances type-check
type OptimizerMessage = LegacyMessageShape | LanguageModelV2Message | UIMessage;

// Lightweight helpers (avoid pervasive any usage by local casting only)
const hasLegacyParts = (
  m: OptimizerMessage
): m is LegacyMessageShape & { parts: GenericPart[] } =>
  'parts' in m && Array.isArray((m as LegacyMessageShape).parts);
const readParts = (m: OptimizerMessage): GenericPart[] => {
  if (hasLegacyParts(m)) return m.parts as GenericPart[];
  const content = (m as unknown as { content?: unknown }).content;
  return Array.isArray(content) ? (content as GenericPart[]) : [];
};
const writeParts = <T extends OptimizerMessage>(
  m: T,
  parts: GenericPart[]
): T => {
  if (hasLegacyParts(m)) return { ...(m as object), parts } as T;
  return { ...(m as object), content: parts } as T;
};

const createChatToolCallRecord = async (
  tx: DbTransactionType,
  chatToolId: string,
  chatMessageId: string,
  providerId: string,
  toolRequest: Array<GenericPart>,
  toolResult: Array<GenericPart>
): Promise<string> => {
  // Serialize input and output for storage
  const input =
    toolRequest.length > 0
      ? JSON.stringify(
          toolRequest.map((req) => ({
            type: req.type,
            state: 'state' in req ? req.state : undefined,
            toolName: 'toolName' in req ? req.toolName : undefined,
            args: 'args' in req ? req.args : undefined,
            input: 'input' in req ? req.input : undefined,
          }))
        )
      : null;

  const output =
    toolResult.length > 0
      ? JSON.stringify(
          toolResult.map((res) => ({
            type: res.type,
            state: 'state' in res ? res.state : undefined,
            toolName: 'toolName' in res ? res.toolName : undefined,
            result: 'result' in res ? res.result : undefined,
            output: 'output' in res ? res.output : undefined,
            errorText: 'errorText' in res ? res.errorText : undefined,
          }))
        )
      : null;

  const result = await tx
    .insert(schema.chatToolCalls)
    .values({
      chatToolId,
      chatMessageId,
      providerId,
      input,
      output,
      timestamp: new Date().toISOString(), // Current timestamp
      providerOptions: null, // Can be extended later if needed
    })
    .returning({ chatToolCallId: schema.chatToolCalls.chatToolCallId })
    .execute();

  if (!result || result.length === 0) {
    throw new Error('Failed to create chat tool call record');
  }

  return result[0].chatToolCallId;
};

// OpenTelemetry Metrics for Message Optimization
const optimizationCounter = appMeters.createCounter(
  'ai_tool_message_optimization_total',
  {
    description: 'Total number of tool message optimization operations',
    unit: '1',
  }
);

const messageReductionHistogram = appMeters.createHistogram(
  'ai_tool_message_reduction_ratio',
  {
    description: 'Distribution of tool message reduction ratios (0-1)',
    unit: '1',
  }
);

const characterReductionHistogram = appMeters.createHistogram(
  'ai_tool_character_reduction_ratio',
  {
    description: 'Distribution of tool character reduction ratios (0-1)',
    unit: '1',
  }
);

const optimizationDurationHistogram = appMeters.createHistogram(
  'ai_tool_optimization_duration_ms',
  {
    description: 'Duration of tool message optimization operations',
    unit: 'ms',
  }
);

const toolCallSummariesCounter = appMeters.createCounter(
  'ai_tool_call_summaries_total',
  {
    description: 'Total number of tool call summaries generated',
    unit: '1',
  }
);

const cacheHitsCounter = appMeters.createCounter(
  'ai_tool_summary_cache_hits_total',
  {
    description: 'Total number of tool summary cache hits',
    unit: '1',
  }
);

const cacheMissesCounter = appMeters.createCounter(
  'ai_tool_summary_cache_misses_total',
  {
    description: 'Total number of tool summary cache misses',
    unit: '1',
  }
);

const summaryGenerationDurationHistogram = appMeters.createHistogram(
  'ai_tool_summary_generation_duration_ms',
  {
    description: 'Duration of individual tool summary generation operations',
    unit: 'ms',
  }
);

const originalMessageCountHistogram = appMeters.createHistogram(
  'ai_tool_original_message_count',
  {
    description: 'Distribution of original message counts in optimization',
    unit: '1',
  }
);

const optimizedMessageCountHistogram = appMeters.createHistogram(
  'ai_tool_optimized_message_count',
  {
    description: 'Distribution of optimized message counts after optimization',
    unit: '1',
  }
);

const cacheHitRateHistogram = appMeters.createHistogram(
  'ai_tool_summary_cache_hit_rate',
  {
    description: 'Distribution of cache hit rates for tool summary cache',
    unit: '1',
  }
);

/**
 * In-memory cache for tool call summaries
 * Key: hash of tool call sequence content
 * Value: cached summary content
 */
const toolSummaryCache = new Map<string, string>();

/**
 * Cache statistics for hit rate tracking and OpenTelemetry metrics
 */
const cacheStats = {
  hits: 0,
  misses: 0,
};

/**
 * Cache management utilities for tool call summaries
 * These can be easily migrated to Redis in the future
 */
export const cacheManager = {
  /**
   * Get cache statistics for monitoring and debugging
   */
  getStats(): { size: number; keys: string[]; hitRate: number } {
    return {
      size: toolSummaryCache.size,
      keys: Array.from(toolSummaryCache.keys()).map((k) => k.substring(0, 8)), // First 8 chars for privacy
      hitRate: this.getHitRate(),
    };
  },

  /**
   * Clear cache (useful for testing or memory management)
   */
  clear(): void {
    toolSummaryCache.clear();
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    log((l) => l.info('Tool summary cache cleared'));
  },

  /**
   * Get cache hit rate for the current session
   */
  getHitRate(): number {
    const total = cacheStats.hits + cacheStats.misses;
    return total > 0 ? cacheStats.hits / total : 0;
  },

  /**
   * Update cache hit rate metrics for OpenTelemetry
   */
  updateMetrics(): void {
    cacheHitRateHistogram.record(this.getHitRate(), {
      cache_type: 'tool_summary',
    });
  },

  /**
   * Export cache for migration to Redis or other storage
   */
  export(): Record<string, string> {
    return Object.fromEntries(toolSummaryCache.entries());
  },

  /**
   * Import cache from external storage
   */
  import(data: Record<string, string>): void {
    toolSummaryCache.clear();
    Object.entries(data).forEach(([key, value]) => {
      toolSummaryCache.set(key, value);
    });
    log((l) =>
      l.info('Tool summary cache imported', { size: toolSummaryCache.size })
    );
  },
};

/**
 * Create tool records for a tool call - handles chat_tool and chat_tool_calls creation
 */
const createToolRecordsForToolCall = async (
  record: ToolCallRecord,
  toolCallId: string
): Promise<void> => {
  if (record.chatToolCallId) {
    // Already processed
    return;
  }

  // Extract tool name from the tool request or result
  const toolData = record.toolResult[0] || record.toolRequest[0];
  if (!toolData || !('type' in toolData)) {
    throw new Error(
      `Unable to determine tool type for tool call ${toolCallId}`
    );
  }

  const toolName = toolData.type.startsWith('tool-')
    ? toolData.type.substring(5) // Remove 'tool-' prefix
    : toolData.type;

  await drizDbWithInit((db) =>
    db.transaction(async (tx) => {
      try {
        // Create or get chat_tool record
        const chatToolId = await ToolMap.getInstance().then((x) =>
          x.idOrThrow(toolName)
        );
        record.chatToolId = chatToolId;

        // Get the message ID - we need to find the actual chat_message_id from the database
        // For now, we'll use the messageId as the provider_id and assume we have the chat message ID
        const chatMessageId = record.messageId; // This should be the actual chat_message_id UUID

        // Create chat_tool_calls record
        const chatToolCallId = await createChatToolCallRecord(
          tx,
          chatToolId,
          chatMessageId,
          toolCallId, // Use tool call ID as provider ID
          record.toolRequest,
          record.toolResult
        );

        record.chatToolCallId = chatToolCallId;

        log((l) =>
          l.info('Created tool records for tool call', {
            toolCallId,
            chatToolId,
            chatToolCallId,
            toolName,
            messageId: record.messageId,
          })
        );
      } catch (error) {
        log((l) =>
          l.error('Failed to create tool records', {
            error,
            toolCallId,
            messageId: record.messageId,
          })
        );
        throw error;
      }
    })
  );
};

/**
 * Generate a deterministic hash for a tool call sequence
 */
const hashToolCallSequence = (toolMessages: GenericPart[]): string => {
  // Create a stable representation of the tool call sequence
  interface HashFriendly {
    type: string;
    state: string;
    toolName?: string;
    text?: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
  }
  const toHashFriendly = (p: GenericPart): HashFriendly => {
    const toolName =
      p.toolName || (p.type.startsWith('tool-') ? p.type.substring(5) : p.type);
    if (p.type === 'text') {
      return {
        type: p.type,
        state: p.state ?? 'state',
        text: (p as { text?: string }).text,
      };
    }
    return {
      type: p.type,
      state: p.state ?? 'unknown',
      toolName,
      input: (p as { input?: unknown }).input,
      output:
        (p as { output?: unknown; result?: unknown }).output ??
        (p as { result?: unknown }).result,
      errorText: (p as { errorText?: string }).errorText,
    };
  };
  const contentToHash = toolMessages.map(toHashFriendly).sort((a, b) => {
    if (a.type !== b.type) return (a.type || '').localeCompare(b.type || '');
    return String(a.text ?? a.input ?? '').localeCompare(
      String(b.text ?? b.input ?? '')
    );
  });

  const hashInput = JSON.stringify(contentToHash);
  return createHash('sha256').update(hashInput).digest('hex');
};

const InputToolStateValues = ['input-streaming', 'input-available'] as const;
const OutputToolStateValues = ['output-error', 'output-available'] as const;
const ToolStateValues = [
  ...InputToolStateValues,
  ...OutputToolStateValues,
] as const;

type InputToolState = (typeof InputToolStateValues)[number];
type OutputToolState = (typeof OutputToolStateValues)[number];

const isInputToolState = (state: unknown): state is InputToolState =>
  !!state && InputToolStateValues.includes(state.toString() as InputToolState);
const isOutputToolState = (state: unknown): state is OutputToolState =>
  !!state &&
  OutputToolStateValues.includes(state.toString() as OutputToolState);
const isTool = (check: unknown): check is GenericPart => {
  if (!check || typeof check !== 'object') return false;
  const part = check as GenericPart;
  if (!('type' in part)) return false;
  if (!('state' in part)) return false;
  return isKeyOf(part.state, ToolStateValues);
};

type ToolResponseMesage = GenericPart & {
  state: 'output-available' | 'output-error';
};
type ToolRequestMessage = GenericPart & {
  state: 'input-available' | 'input-streaming';
};

type SummarizedToolRequest = ToolRequestMessage;
type SummarizedToolResponse = ToolResponseMesage & {
  preliminary?: true;
  input?: unknown;
  output?: unknown;
};

/**
 * Interface for tracking tool call sequences
 */
interface ToolCallRecord {
  /**
   * The message this part was found in
   */
  messageId: string;
  /**
   * Tool response messages
   */
  toolResult: Array<ToolResponseMesage>;
  /**
   * Tool request messages
   */
  toolRequest: Array<ToolRequestMessage>;
  /**
   * Summary message text
   * */
  toolSummary: { type: 'text'; text: string };
  /**
   * Summarized tool request message
   */
  summarizedRequest?: SummarizedToolRequest;
  /**
   * Summarized tool response message
   */
  summarizedResult: SummarizedToolResponse;
  /**
   * Optional cached summary key for reference
   */
  tools: Array<ChatToolType>;
  /**
   * Stores the original tool call for search / retrieval
   */
  toolCalls: Array<ChatToolCallsType>;
  /**
   * The chat tool call ID from the database record
   */
  chatToolCallId?: string;
  /**
   * The chat tool ID from the tool map
   */
  chatToolId?: string;
}

/**
 * Enterprise-grade message optimization that preserves conversation integrity
 * while intelligently summarizing completed tool call sequences.
 *
 * Algorithm:
 * 1. Preserve the last two user interactions (loss-free current context)
 * 2. Work backwards through message history, grouping tool calls by ID
 * 3. Replace completed tool sequences with AI-generated summaries
 * 4. Maintain conversation flow and prevent recall loops
 */
// Overloads preserve legacy inference when caller passes UIMessage[]
export async function optimizeMessagesWithToolSummarization(
  messages: UIMessage[],
  model: string,
  userId?: string,
  chatHistoryId?: string
): Promise<UIMessage[]>;
export async function optimizeMessagesWithToolSummarization(
  messages: LanguageModelV2Message[],
  model: string,
  userId?: string,
  chatHistoryId?: string
): Promise<LanguageModelV2Message[]>;
export async function optimizeMessagesWithToolSummarization(
  messages: UIMessage[] | LanguageModelV2Message[],
  model: string,
  userId?: string,
  chatHistoryId?: string
): Promise<UIMessage[] | LanguageModelV2Message[]> {
  const msgs = messages as OptimizerMessage[];
  const startTime = Date.now();

  // Calculate original context size for meaningful metrics
  const originalCharacterCount = calculateMessageCharacterCount(msgs);

  // Record original message count for OpenTelemetry
  originalMessageCountHistogram.record(messages.length, {
    model,
    user_id: userId ? hashUserId(userId) : 'anonymous',
  });

  log((l) =>
    l.verbose('Starting enterprise tool message optimization', {
      originalMessageCount: messages.length,
      originalCharacterCount,
      model,
      userId,
    })
  );

  // Step 1: Find cutoff point - preserve last two user interactions
  const { cutoffIndex, preservedToolIds } = findUserInteractionCutoff(msgs);
  if (cutoffIndex === 0) {
    // No optimization needed - all messages are recent
    log((l) => l.verbose('No optimization needed - all messages are recent'));

    // Record metrics for no-op optimization
    optimizationCounter.add(1, {
      model,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      optimization_type: 'no_optimization_needed',
    });

    optimizationDurationHistogram.record(Date.now() - startTime, {
      model,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      optimization_type: 'no_optimization_needed',
    });

    return messages;
  }

  const chatHistoryContext = createAgentHistoryContext({
    model,
    originatingUserId: userId ?? '-1',
    operation: 'context.summarize',
    metadata: {
      targetChatId: chatHistoryId,
      cutoffIndex,
      preservedToolIds: Array.from(preservedToolIds),
    },
  });

  try {
    // Step 2: Process older messages for tool summarization
    const { optimizedMessages, toolCallDict } =
      await processOlderMessagesForSummarization(
        msgs,
        cutoffIndex,
        preservedToolIds
      );

    // Step 3: Generate AI summaries for all collected tool calls
    await generateToolCallSummaries(toolCallDict, chatHistoryContext, msgs);
    const processingTime = Date.now() - startTime;

    // Calculate optimized context size for meaningful metrics
    const optimizedCharacterCount =
      calculateMessageCharacterCount(optimizedMessages);
    const characterReduction = Math.round(
      ((originalCharacterCount - optimizedCharacterCount) /
        originalCharacterCount) *
        100
    );

    const messageReduction = Math.round(
      ((messages.length - optimizedMessages.length) / messages.length) * 100
    );

    // Record comprehensive OpenTelemetry metrics
    const attributes = {
      model,
      user_id: userId ? hashUserId(userId) : 'anonymous',
      optimization_type: 'tool_summarization',
    };

    optimizationCounter.add(1, attributes);

    optimizationDurationHistogram.record(processingTime, attributes);

    optimizedMessageCountHistogram.record(optimizedMessages.length, attributes);

    messageReductionHistogram.record(
      (msgs.length - optimizedMessages.length) / msgs.length,
      attributes
    );

    characterReductionHistogram.record(
      (originalCharacterCount - optimizedCharacterCount) /
        originalCharacterCount,
      attributes
    );

    toolCallSummariesCounter.add(toolCallDict.size, attributes);

    log((l) =>
      l.info('Enterprise tool optimization completed', {
        originalMessages: msgs.length,
        optimizedMessages: optimizedMessages.length,
        originalCharacterCount,
        optimizedCharacterCount,
        characterReduction: `${characterReduction}%`,
        toolCallsProcessed: toolCallDict.size,
        messageReduction: `${messageReduction}%`,
        processingTimeMs: processingTime,
        model,
        userId,
      })
    );
    return optimizedMessages as unknown as
      | UIMessage[]
      | LanguageModelV2Message[];
  } catch (error) {
    chatHistoryContext.error = error;
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'processOlderMessagesForSummarization',
    });
  } finally {
    chatHistoryContext.dispose();
  }
}

/**
 * Find the cutoff point by locating the last two user prompts
 * Returns the index where optimization should begin and IDs of tools to preserve
 */
const findUserInteractionCutoff = (
  messages: OptimizerMessage[]
): {
  cutoffIndex: number;
  preservedToolIds: Set<string>;
} => {
  const preservedToolIds = new Set<string>();
  let userPromptCount = 0;
  let cutoffIndex = messages.length;

  // Work backwards from the end
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    if (message.role === 'user') {
      userPromptCount++;
      if (userPromptCount >= 2) {
        // Found our cutoff point - preserve everything from here forward
        cutoffIndex = i;
        break;
      }
    }

    // Collect tool IDs in the preserved section
    if (
      message.role === 'assistant' &&
      'toolInvocations' in message &&
      Array.isArray(message.toolInvocations)
    ) {
      for (const invocation of message.toolInvocations) {
        if (
          'toolCallId' in invocation &&
          typeof invocation.toolCallId === 'string'
        ) {
          preservedToolIds.add(invocation.toolCallId);
        }
      }
    }
  }

  return { cutoffIndex, preservedToolIds };
};

export const summarizeMessageRecord = async ({
  tx,
  chatId,
  turnId,
  messageId,
  write = false,
  deep = false,
}: {
  /**
   * Dabase transactional context
   */
  tx?: DbTransactionType;
  /**
   * Chat ID to summarize
   */
  chatId: string;
  /**
   * Turn ID to summarize
   */
  turnId: number;
  /**
   * Message ID to summarize
   */
  messageId: number;
  /**
   * If true results are used to update the database record
   */
  write?: boolean;
  /**
   * If true, the full contents of historical messages will be considered for context;
   * otherwise, the optimized output will be favored and used when present.
   */
  deep?: boolean;
  /**
   * Additional metadata to send to the model when summarizing.
   */
  metadata?: Record<string, AttributeValue>;
}): Promise<{
  /**
   * An AI-optimized / summarized version of this message's content
   */
  optimizedContent: string;
  /**
   * The most appropriately descriptive title for the chat given current context
   */
  chatTitle: string;
  /**
   * When true it signals this is a different title than what was assigned before this message was processed
   */
  newTitle: boolean;
}> => {
  try {
    const qp: ThisDbQueryProvider = (await (tx
      ? Promise.resolve(tx)
      : drizDbWithInit())) as unknown as ThisDbQueryProvider;

    const isThisMessage = and(
      eq(schema.chatMessages.chatId, chatId),
      eq(schema.chatMessages.turnId, turnId),
      eq(schema.chatMessages.messageId, messageId)
    )!;
    // First assemble previous message state
    const prevMessages = await qp.query.chatMessages
      .findMany({
        where: and(eq(schema.chatMessages.chatId, chatId), not(isThisMessage)),
        columns: {
          content: deep === true,
          optimizedContent: deep !== true,
        },
        orderBy: [schema.chatMessages.turnId, schema.chatMessages.messageId],
      })
      .execute()
      .then((q) =>
        q
          .map(
            deep
              ? (m: object) => (m as { content: string }).content
              : (m: object) =>
                  (m as { optimizedContent: string }).optimizedContent
          )
          .filter(
            (content): content is string =>
              typeof content === 'string' && content.trim().length > 0
          )
      );
    // Then retrieve the target message
    const thisMessage = await qp.query.chatMessages.findFirst({
      where: isThisMessage,
      columns: {
        content: true,
        optimizedContent: true,
      },
      with: {
        chat: {
          columns: {
            title: true,
          },
        },
      },
    });
    if (!thisMessage) {
      throw new Error('Message not found');
    }

    // Validate that thisMessage.content is valid for prompt construction
    if (!thisMessage.content || typeof thisMessage.content !== 'string') {
      throw new Error('Message content is invalid or missing');
    }

    // Let the models work their magic...
    const prompt = `You are an expert at summarizing message output for AI conversation context.

  CONVERSATIONAL CONTEXT:
  ${prevMessages.join('\n----\n')}

  CURRENT MESSAGE:
  ${
    typeof thisMessage.content === 'string'
      ? thisMessage.content
      : JSON.stringify(thisMessage.content, null, 2)
  }

  CURRENT CHAT TITLE:
  ${thisMessage.chat.title || 'Untitled Chat'}

  Create a short, concise summary that:
  1. Maintains context for ongoing conversation flow
  2. Extracts the key findings that might be relevant for future conversation
  3. Notes any important patterns, insights, errors, or ommissions
  4. Maintains high-fidelity context for ongoing conversation flow

  Additionally,
  5. Provide a short (4-5 word max) title that accurately describes the conversation as a whole - this will be used as the new Chat Title.

  Keep the summary as short as possible while preserving essential meaning.`;

    // Validate prompt is not empty and reasonable length
    if (!prompt.trim() || prompt.length > 50000) {
      throw new Error('Generated prompt is invalid (empty or too long)');
    }

    const model = await aiModelFactory('lofi');
    const summarized = (
      await generateObject({
        model,
        prompt,
        schema: z.object({
          messageSummary: z.string(),
          chatTitle: z.string(),
        }),
        temperature: 0.3,
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'completion-message-summarization',
        },
      })
    ).object;
    const ret = {
      optimizedContent: summarized.messageSummary,
      chatTitle: summarized.chatTitle,
      newTitle: summarized.chatTitle !== thisMessage.chat.title,
    };
    if (write) {
      (await drizDbWithInit())
        // Update the specific chat message identified by (chatId, turnId, messageId)
        .update(schema.chatMessages)
        .set({ optimizedContent: ret.optimizedContent })
        .where(isThisMessage)
        .execute();

      // Update chat title by chat id
      await qp
        .update(schema.chats)
        .set({ title: ret.chatTitle })
        .where(eq(schema.chats.id, chatId))
        .execute();

      /*
    await qp
      .update(schema.chatMessages)
      .set({ optimizedContent: ret.optimizedContent })
      .where(isThisMessage)
      .execute();
    */
    }
    return ret;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'tools-optimizer -  summarizeMessageRecord',
      log: true,
    });
  }
};

// const requestSummaryFactory = ({
//   responseSummary,
//   toolRequest,
// }: {
//   responseSummary: SummarizedToolResponse;
//   toolRequest: ToolRequestMessage;
// }): SummarizedToolRequest => {
//   const requestSummary = {
//     state: toolRequest.state,
//     type: toolRequest.type,
//   } as Record<string, unknown>;
//   const ignoreKeys = ['state', 'type', 'output', 'errorText'];
//   for (const key of Object.keys(responseSummary).filter(
//     (k) => !ignoreKeys.includes(k),
//   )) {
//     const value = responseSummary[key as keyof SummarizedToolResponse];
//     if (value) {
//       requestSummary[key] = value;
//     }
//   }
//   return requestSummary as SummarizedToolRequest;
// };

/**
 * Process older messages (before cutoff) for tool summarization
 * Groups tool calls by ID and replaces them with summary placeholders
 */
const processOlderMessagesForSummarization = async (
  messages: OptimizerMessage[],
  cutoffIndex: number,
  preservedToolIds: Set<string>
): Promise<{
  optimizedMessages: OptimizerMessage[];
  toolCallDict: Map<string, ToolCallRecord>;
}> => {
  const toolCallDict = new Map<string, ToolCallRecord>();
  //const pendingToolIds = new Set<string>();
  const optimizedMessages: OptimizerMessage[] = [
    ...messages.slice(cutoffIndex),
  ];
  // Iterate through messages to build optimized output
  for (let i = cutoffIndex - 1; i >= 0; i--) {
    const message = messages[i];
    const processedParts: GenericPart[] = [];

    const getParts = readParts;
    const setParts = writeParts;

    let messageDirtyFlag = false;
    // Ensure we only insert a single summary per toolCallId within this message
    const summaryInsertedFor = new Set<string>();

    // Process invocations backwards to maintain consistency with message processing
    const messageParts = getParts(message);
    for (let j = messageParts.length - 1; j >= 0; j--) {
      const invocation = messageParts[j];
      // If we are not a tool, or do not have an id, or have an id thats been bucketed as preserved
      // then no additional processing is needed
      if (
        !isTool(invocation) ||
        !invocation.toolCallId ||
        preservedToolIds.has(invocation.toolCallId)
      ) {
        processedParts.unshift(invocation);
        continue;
      }
      // First process records we've already seen a response for
      if (toolCallDict.has(invocation.toolCallId)) {
        const record = toolCallDict.get(invocation.toolCallId)!;
        if (isInputToolState(invocation.state)) {
          if (invocation.state === 'input-available') {
            // Keep only a single summary in place of the request and capture request for summarization context
            record.toolRequest.push({ ...invocation } as ToolRequestMessage);
            if (!summaryInsertedFor.has(invocation.toolCallId)) {
              processedParts.unshift(record.toolSummary);
              summaryInsertedFor.add(invocation.toolCallId);
              messageDirtyFlag = true;
            }
          } else {
            // NO-OP: skip streaming message input when response present
          }
        } else if (isOutputToolState(invocation.state)) {
          // Preserve the tool response (output-available/error) in the optimized message
          processedParts.unshift(invocation);
        } else {
          log((l) =>
            l.warn(
              'Encountered existing tool invocation with unrecognized or missing state - preserving as-is',
              { invocation }
            )
          );
          processedParts.unshift(invocation);
        }
      } else {
        // Then process records we've never seen
        if (isOutputToolState(invocation.state)) {
          // If the first thing we see is a result then we want to create a new record
          const record: ToolCallRecord = {
            messageId: (message as LegacyMessageShape).id ?? `msg-${i} `,
            toolResult: [{ ...invocation } as ToolResponseMesage],
            toolRequest: [],
            toolSummary: {
              type: 'text',
              text: '[TOOL SUMMARY LOADING...]',
            },
            summarizedResult: {
              ...invocation,
              preliminary: true,
              input: '[SUMMARIZED - (input) See summary message]',
              output: '[SUMMARIZED - (output) See summary message]',
            } as SummarizedToolResponse,
            tools: [],
            toolCalls: [],
          };
          toolCallDict.set(invocation.toolCallId, record); // Replace this invocation with the summary message
          // Preserve the actual output in the optimized message; we'll insert the summary in place of the request
          processedParts.unshift(invocation);
          messageDirtyFlag = true; // message changed because we'll later replace the request with summary and drop streaming
        } else if (isInputToolState(invocation.state)) {
          // If the first thing we see is a tool request, we want to preserve it
          preservedToolIds.add(invocation.toolCallId);
          processedParts.unshift(invocation);
        } else {
          log((l) =>
            l.warn(
              'Encountered new tool invocation with unrecognized or missing state - preserving as-is',
              { invocation }
            )
          );
          processedParts.unshift(invocation);
        }
      }
    }
    if (messageDirtyFlag) {
      optimizedMessages.unshift(setParts(message, processedParts));
    } else {
      optimizedMessages.unshift(message);
    }
  }
  return { optimizedMessages, toolCallDict };
};

/**
 * Generate AI-powered summaries for all collected tool calls
 * Updates summary messages by reference
 */
const generateToolCallSummaries = async (
  toolCallDict: Map<string, ToolCallRecord>,
  chatHistoryContext: ChatHistoryContext,
  allMessages?: OptimizerMessage[]
): Promise<void> => {
  if (toolCallDict.size === 0) {
    return;
  }

  log((l) =>
    l.debug(
      `Generating AI summaries for ${toolCallDict.size} tool call sequences`
    )
  );

  // Process all tool call summaries in parallel for efficiency
  const summaryPromises = Array.from(toolCallDict.entries()).map(
    async ([toolCallId, record]) => {
      try {
        // First, ensure tool records and chat_tool_calls are created
        await createToolRecordsForToolCall(record, toolCallId);

        const summary = await generateSingleToolCallSummary(
          record,
          chatHistoryContext,
          allMessages
        );

        // Update the summary message to include chat_tool_call_id
        const summaryWithId = record.chatToolCallId
          ? `${summary} [ID: ${record.chatToolCallId}]`
          : summary;
        record.toolSummary.text = summaryWithId;

        log((l) =>
          l.debug(`Generated summary for tool call ${toolCallId} `, {
            originalLength: record.toolResult.reduce(
              (acc, msg) => acc + JSON.stringify(msg).length,
              0
            ),
            summaryLength: summary.length,
          })
        );
      } catch (error) {
        log((l) =>
          l.error(`Failed to generate summary for tool call ${toolCallId} `, {
            error,
          })
        ); // Fallback to basic summary on error
        const fallbackText = `[TOOL CALL COMPLETED]ID: ${toolCallId} - Summary generation failed, see logs for details.`;
        const fallbackWithId = record.chatToolCallId
          ? `${fallbackText}[ID: ${record.chatToolCallId}]`
          : fallbackText;
        record.toolSummary.text = fallbackWithId;
      }
    }
  );

  await Promise.all(summaryPromises);
  log((l) =>
    l.info(
      `Completed AI summary generation for ${toolCallDict.size} tool sequences`
    )
  );
};

/**
 * Generate a single tool call summary using the lofi model (with caching)
 */
const generateSingleToolCallSummary = async (
  record: ToolCallRecord,
  chatHistoryContext: ChatHistoryContext,
  allMessages?: OptimizerMessage[]
): Promise<string> => {
  // Generate cache key from the tool call sequence
  const allToolMessages = [...record.toolRequest, ...record.toolResult];
  const cacheKey = hashToolCallSequence(allToolMessages);
  // Check cache first to avoid redundant LLM calls
  const cachedSummary = toolSummaryCache.get(cacheKey);
  if (cachedSummary) {
    // Record cache hit metrics
    cacheStats.hits++;
    cacheHitsCounter.add(1, {
      cache_type: 'tool_summary',
    });

    // Update gauge metrics
    cacheManager.updateMetrics();

    log((l) =>
      l.debug('Using cached tool summary', {
        cacheKey: cacheKey.substring(0, 8),
      })
    );
    return cachedSummary;
  }

  // Record cache miss metrics
  cacheStats.misses++;
  cacheMissesCounter.add(1, {
    cache_type: 'tool_summary',
  });

  // Update gauge metrics
  cacheManager.updateMetrics();

  // Extract key information from tool requests and responses
  const toolRequests = record.toolRequest.flatMap((msg) =>
    'toolInvocations' in msg && Array.isArray(msg.toolInvocations)
      ? msg.toolInvocations.map((inv) => ({
          tool: 'toolName' in inv ? inv.toolName : 'unknown',
          args: 'args' in inv ? inv.args : {},
        }))
      : []
  );

  const toolResults = record.toolResult.flatMap((msg) =>
    'toolInvocations' in msg && Array.isArray(msg.toolInvocations)
      ? msg.toolInvocations.map((inv) => ({
          result: 'result' in inv ? inv.result : 'No result',
          tool: 'toolName' in inv ? inv.toolName : 'unknown',
        }))
      : []
  );

  // Extract conversational context that explains WHY tools were called
  const conversationalContext = extractConversationalContext(
    record,
    allMessages
  );

  // Create summarization prompt with context
  const prompt = `You are an expert at summarizing tool execution results for AI conversation context.

CONVERSATIONAL CONTEXT:
${conversationalContext}

TOOL REQUESTS:
${JSON.stringify(toolRequests, null, 2)}

TOOL RESULTS:
${JSON.stringify(
  toolResults.map((r) => ({
    tool: r.tool,
    result:
      typeof r.result === 'string' &&
      /*r.result.length > 500
         ? r.result.substring(0, 500) + '...[truncated]'
        : */ r.result,
  })),
  null,
  2
)}

Create a concise summary that:
    1. Identifies what tools were executed and why(based on the conversational context)
    2. Extracts the key findings that might be relevant for future conversation
3. Notes any important patterns, insights, or errors
    4. Maintains context for ongoing conversation flow

Keep the summary under 300 characters while preserving essential meaning.
Respond with just the summary text, no additional formatting.`;

  // Validate prompt is not empty and reasonable length
  if (!prompt.trim() || prompt.length > 50000) {
    throw new Error('Generated prompt is invalid (empty or too long)');
  }

  const startSummaryTime = Date.now();

  try {
    const lofiModel = await aiModelFactory('lofi');
    const result = await generateObject({
      model: lofiModel,
      prompt,
      schema: z.object({
        messageSummary: z.string(),
        chatTitle: z.string(),
      }),
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-message-tool-summarization',
      },
    });
    const summaryDuration = Date.now() - startSummaryTime;

    // Record summary generation duration
    summaryGenerationDurationHistogram.record(summaryDuration, {
      model: 'lofi',
      status: 'success',
    });

    const summary = result.object?.messageSummary;
    if (summary) {
      // Cache the result for future use
      toolSummaryCache.set(cacheKey, summary);

      log((l) =>
        l.debug('Generated and cached new tool summary', {
          cacheKey: cacheKey.substring(0, 8),
          summaryLength: summary.length,
          cacheSize: toolSummaryCache.size,
          durationMs: summaryDuration,
        })
      );
    }
    return summary;
  } catch (error) {
    const summaryDuration = Date.now() - startSummaryTime;

    // Record error metrics
    summaryGenerationDurationHistogram.record(summaryDuration, {
      model: 'lofi',
      status: 'error',
    });

    log((l) => l.error('Tool summarization failed', { error }));

    // Fallback to basic summary
    const toolNames = toolRequests.map((r) => r.tool).join(', ');
    const fallbackSummary = `Tool execution completed: ${toolNames}. Data processed successfully.`;
    // Cache fallback summary too to avoid retrying failures
    toolSummaryCache.set(cacheKey, fallbackSummary);
    return fallbackSummary;
  }
};

/**
 * Extract relevant conversational context to explain why tools were called
 */
const extractConversationalContext = (
  record: ToolCallRecord,
  allMessages?: OptimizerMessage[]
): string => {
  if (!allMessages || allMessages.length === 0) {
    return 'No conversational context available.';
  }

  const contextParts: string[] = [];

  // Extract content from the assistant messages that contain tool requests
  record.toolRequest.forEach((msg) => {
    // Also check parts for AI SDK v5 structure
    if ('parts' in msg && Array.isArray(msg.parts)) {
      msg.parts.forEach((part) => {
        if (
          part.type === 'text' &&
          typeof part.text === 'string' &&
          part.text.trim()
        ) {
          contextParts.push(`Assistant reasoning: ${part.text.trim()} `);
        }
      });
    }
  });

  // Look for the user message that likely prompted this tool sequence
  // We'll search backwards from tool request messages to find recent user input
  if (record.toolRequest.length > 0) {
    const toolRequestIndex = allMessages.findIndex((msg) => {
      const legacy = msg as LegacyMessageShape;
      return legacy.id === record.messageId;
    });

    if (toolRequestIndex > 0) {
      // Look for the most recent user message before this tool request
      for (
        let i = toolRequestIndex - 1;
        i >= 0 && i >= toolRequestIndex - 5;
        i--
      ) {
        const prevMessage = allMessages[i];
        if (prevMessage.role === 'user') {
          const prevContent = (
            prevMessage as Partial<LegacyMessageShape> & { content?: unknown }
          ).content;
          const prevParts = hasLegacyParts(prevMessage)
            ? prevMessage.parts
            : Array.isArray(prevContent)
            ? (prevContent as GenericPart[])
            : [];
          const userContent = prevParts
            .filter((part: GenericPart) => part.type === 'text')
            .map((part: GenericPart) => (part as { text?: string }).text ?? '')
            .join(' ');
          if (userContent.trim()) {
            // Truncate user content to avoid bloating the prompt
            const truncatedContent =
              userContent.length > 200
                ? userContent.substring(0, 200) + '...'
                : userContent;
            contextParts.unshift(`User request: ${truncatedContent.trim()} `);
            break;
          }
        }
      }
    }
  }
  return contextParts.length > 0
    ? contextParts.join('\n')
    : 'No specific conversational context found.';
};

/**
 * Utility function to extract tool call IDs from a message
 */
// Overloads for clearer typing in tests
export function extractToolCallIds(message: UIMessage): string[];
export function extractToolCallIds(message: OptimizerMessage): string[];
export function extractToolCallIds(message: unknown): string[] {
  if (!message || typeof message !== 'object') return [];
  const m = message as { role?: string; parts?: unknown };
  if (m.role !== 'assistant' || !Array.isArray(m.parts)) return [];
  return Array.from(
    new Set<string>(
      m.parts
        .map((inv: unknown) =>
          inv && typeof inv === 'object' && 'toolCallId' in inv
            ? (inv as { toolCallId?: unknown }).toolCallId
            : null
        )
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );
}

/**
 * Utility function to check if a message contains tool calls
 */
export function hasToolCalls(message: UIMessage): boolean;
export function hasToolCalls(message: OptimizerMessage): boolean;
export function hasToolCalls(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false;
  const m = message as { role?: string; parts?: unknown };
  if (m.role !== 'assistant' || !Array.isArray(m.parts)) return false;
  return m.parts.some(
    (p: unknown) =>
      !!(
        p &&
        typeof p === 'object' &&
        'toolCallId' in p &&
        (p as { toolCallId?: unknown }).toolCallId
      )
  );
}

/**
 * Calculate total character count for a message array
 * This gives a much better indication of actual context consumption than message count
 */
const calculateMessageCharacterCount = (
  messages: OptimizerMessage[]
): number => {
  const promptMessages: LanguageModelV2Prompt = messages.map((msg) => {
    if (msg.role === 'system') {
      const systemContent = (
        msg as Partial<LegacyMessageShape> & { content?: unknown }
      ).content;
      return {
        role: 'system',
        content: typeof systemContent === 'string' ? systemContent : '',
      };
    }
    const parts = readParts(msg);
    // Best-effort casting for token counting; SDK will only use structural fields for length calc
    // Cast through unknown to satisfy prompt shape for token counting only.
    return {
      role: msg.role,
      content: parts,
    } as unknown as LanguageModelV2Message;
  });
  return countTokens({ prompt: promptMessages });
};

/**
 * Helper functions for OpenTelemetry integration and metrics export
 */

/**
 * Export all message optimizer metrics for Prometheus or other observability backends
 * This can be called periodically or on-demand for metric collection
 */
export const exportMessageOptimizerMetrics = () => {
  // Update gauge metrics to current values
  cacheManager.updateMetrics();

  return {
    optimization_counters: {
      total_optimizations: 'ai_message_optimization_total',
      tool_summaries_generated: 'ai_tool_call_summaries_total',
      cache_hits: 'ai_tool_summary_cache_hits_total',
      cache_misses: 'ai_tool_summary_cache_misses_total',
    },
    histograms: {
      message_reduction_ratio: 'ai_message_reduction_ratio',
      character_reduction_ratio: 'ai_character_reduction_ratio',
      optimization_duration: 'ai_optimization_duration_ms',
      summary_generation_duration: 'ai_summary_generation_duration_ms',
      original_message_count: 'ai_original_message_count',
      optimized_message_count: 'ai_optimized_message_count',
    },
    gauges: {
      cache_hit_rate: 'ai_tool_summary_cache_hit_rate',
    },
    cache_stats: cacheManager.getStats(),
  };
};

/**
 * Start periodic metrics update for gauges that need regular updates
 * This ensures OpenTelemetry collectors get fresh gauge values
 */
export const startPeriodicMetricsUpdate = (intervalMs: number = 30000) => {
  const updateInterval = setInterval(() => {
    try {
      cacheManager.updateMetrics();
    } catch (error) {
      log((l) => l.error('Failed to update periodic metrics', { error }));
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(updateInterval);
    log((l) =>
      l.debug('Stopped periodic metrics updates for message optimizer')
    );
  };
};
