import { UIMessage } from 'ai';
import { aiModelFactory } from '@/lib/ai';
import { generateText } from 'ai';
import { log } from '@/lib/logger';
import { createHash } from 'crypto';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';

// OpenTelemetry Metrics for Message Optimization
const optimizationCounter = appMeters.createCounter(
  'ai_tool_message_optimization_total',
  {
    description: 'Total number of tool message optimization operations',
    unit: '1',
  },
);

const messageReductionHistogram = appMeters.createHistogram(
  'ai_tool_message_reduction_ratio',
  {
    description: 'Distribution of tool message reduction ratios (0-1)',
    unit: '1',
  },
);

const characterReductionHistogram = appMeters.createHistogram(
  'ai_tool_character_reduction_ratio',
  {
    description: 'Distribution of tool character reduction ratios (0-1)',
    unit: '1',
  },
);

const optimizationDurationHistogram = appMeters.createHistogram(
  'ai_tool_optimization_duration_ms',
  {
    description: 'Duration of tool message optimization operations',
    unit: 'ms',
  },
);

const toolCallSummariesCounter = appMeters.createCounter(
  'ai_tool_call_summaries_total',
  {
    description: 'Total number of tool call summaries generated',
    unit: '1',
  },
);

const cacheHitsCounter = appMeters.createCounter(
  'ai_tool_summary_cache_hits_total',
  {
    description: 'Total number of tool summary cache hits',
    unit: '1',
  },
);

const cacheMissesCounter = appMeters.createCounter(
  'ai_tool_summary_cache_misses_total',
  {
    description: 'Total number of tool summary cache misses',
    unit: '1',
  },
);

const summaryGenerationDurationHistogram = appMeters.createHistogram(
  'ai_tool_summary_generation_duration_ms',
  {
    description: 'Duration of individual tool summary generation operations',
    unit: 'ms',
  },
);

const originalMessageCountHistogram = appMeters.createHistogram(
  'ai_tool_original_message_count',
  {
    description: 'Distribution of original message counts in optimization',
    unit: '1',
  },
);

const optimizedMessageCountHistogram = appMeters.createHistogram(
  'ai_tool_optimized_message_count',
  {
    description: 'Distribution of optimized message counts after optimization',
    unit: '1',
  },
);

const cacheHitRateHistogram = appMeters.createHistogram(
  'ai_tool_summary_cache_hit_rate',
  {
    description: 'Distribution of cache hit rates for tool summary cache',
    unit: '1',
  },
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
      l.info('Tool summary cache imported', { size: toolSummaryCache.size }),
    );
  },
};

/**
 * Generate a deterministic hash for a tool call sequence
 */
const hashToolCallSequence = (toolMessages: UIMessage[]): string => {
  // Create a stable representation of the tool call sequence
  const contentToHash = toolMessages
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
      toolInvocations: msg.toolInvocations?.map((inv) => ({
        toolCallId: inv.toolCallId,
        toolName: 'toolName' in inv ? inv.toolName : 'unknown',
        args: 'args' in inv ? inv.args : {},
        result: 'result' in inv ? inv.result : 'No result',
      })),
    }))
    .sort((a, b) => {
      // Sort by role first, then content for consistency
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      return String(a.content).localeCompare(String(b.content));
    });

  const hashInput = JSON.stringify(contentToHash);
  return createHash('sha256').update(hashInput).digest('hex');
};

/**
 * Interface for tracking tool call sequences
 */
interface ToolCallRecord {
  toolResult: UIMessage[]; // Tool response messages (in chronological order)
  toolRequest: UIMessage[]; // Tool request messages (in chronological order)
  toolSummary: UIMessage; // Summary placeholder message (by reference)
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
export async function optimizeMessagesWithToolSummarization(
  messages: UIMessage[],
  model: string,
  userId?: string,
): Promise<UIMessage[]> {
  const startTime = Date.now();

  // Calculate original context size for meaningful metrics
  const originalCharacterCount = calculateMessageCharacterCount(messages);

  // Record original message count for OpenTelemetry
  originalMessageCountHistogram.record(messages.length, {
    model,
    user_id: userId ? hashUserId(userId) : 'anonymous',
  });

  log((l) =>
    l.debug('Starting enterprise tool message optimization', {
      originalMessageCount: messages.length,
      originalCharacterCount,
      model,
      userId,
    }),
  );

  // Step 1: Find cutoff point - preserve last two user interactions
  const { cutoffIndex, preservedToolIds } = findUserInteractionCutoff(messages);

  if (cutoffIndex === 0) {
    // No optimization needed - all messages are recent
    log((l) => l.debug('No optimization needed - all messages are recent'));

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

  // Step 2: Process older messages for tool summarization
  const { optimizedMessages, toolCallDict } =
    await processOlderMessagesForSummarization(
      messages,
      cutoffIndex,
      preservedToolIds,
    );

  // Step 3: Generate AI summaries for all collected tool calls
  await generateToolCallSummaries(toolCallDict, messages);
  const processingTime = Date.now() - startTime;

  // Calculate optimized context size for meaningful metrics
  const optimizedCharacterCount =
    calculateMessageCharacterCount(optimizedMessages);
  const characterReduction = Math.round(
    ((originalCharacterCount - optimizedCharacterCount) /
      originalCharacterCount) *
      100,
  );

  const messageReduction = Math.round(
    ((messages.length - optimizedMessages.length) / messages.length) * 100,
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
    (messages.length - optimizedMessages.length) / messages.length,
    attributes,
  );

  characterReductionHistogram.record(
    (originalCharacterCount - optimizedCharacterCount) / originalCharacterCount,
    attributes,
  );

  toolCallSummariesCounter.add(toolCallDict.size, attributes);

  log((l) =>
    l.info('Enterprise tool optimization completed', {
      originalMessages: messages.length,
      optimizedMessages: optimizedMessages.length,
      originalCharacterCount,
      optimizedCharacterCount,
      characterReduction: `${characterReduction}%`,
      toolCallsProcessed: toolCallDict.size,
      messageReduction: `${messageReduction}%`,
      processingTimeMs: processingTime,
      model,
      userId,
    }),
  );

  return optimizedMessages;
}

/**
 * Find the cutoff point by locating the last two user prompts
 * Returns the index where optimization should begin and IDs of tools to preserve
 */
const findUserInteractionCutoff = (
  messages: UIMessage[],
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

/**
 * Process older messages (before cutoff) for tool summarization
 * Groups tool calls by ID and replaces them with summary placeholders
 */
const processOlderMessagesForSummarization = async (
  messages: UIMessage[],
  cutoffIndex: number,
  preservedToolIds: Set<string>,
): Promise<{
  optimizedMessages: UIMessage[];
  toolCallDict: Map<string, ToolCallRecord>;
}> => {
  const toolCallDict = new Map<string, ToolCallRecord>();
  const pendingToolIds = new Set<string>();
  const optimizedMessages: UIMessage[] = [];

  // Keep preserved messages (from cutoff forward) as-is
  const preservedMessages = messages.slice(cutoffIndex);

  // Process older messages backwards (this is key for proper tool pairing)
  const olderMessages = messages.slice(0, cutoffIndex);

  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const message = olderMessages[i];
    let shouldIncludeMessage = true;

    if (
      message.role === 'assistant' &&
      'toolInvocations' in message &&
      Array.isArray(message.toolInvocations)
    ) {
      // Process tool invocations in this assistant message (backwards to match message iteration)
      const processedInvocations = [];
      let hasRemovedInvocations = false;

      // Process invocations backwards to maintain consistency with message processing
      for (let j = message.toolInvocations.length - 1; j >= 0; j--) {
        const invocation = message.toolInvocations[j];
        const toolCallId =
          'toolCallId' in invocation ? (invocation.toolCallId as string) : null;
        if (!toolCallId) {
          // No tool call ID - keep as-is (add to front since we're iterating backwards)
          processedInvocations.unshift(invocation);
          continue;
        }

        if (preservedToolIds.has(toolCallId)) {
          // This tool call is in the preserved section - keep it
          processedInvocations.unshift(invocation);
          continue;
        }

        // Check if this is a tool request or response
        const isToolRequest =
          !('result' in invocation) || invocation.result === undefined;
        const isToolResponse =
          'result' in invocation && invocation.result !== undefined;
        if (isToolRequest && !toolCallDict.has(toolCallId)) {
          // This is a pending request (we're going backwards, so we'd see response first)
          pendingToolIds.add(toolCallId);
          processedInvocations.unshift(invocation);
        } else if (pendingToolIds.has(toolCallId)) {
          // This tool is pending - don't process it
          processedInvocations.unshift(invocation);
        } else if (toolCallDict.has(toolCallId)) {
          // Add to existing record
          const record = toolCallDict.get(toolCallId)!;
          const messageWithInvocation = {
            ...message,
            toolInvocations: [invocation],
          };

          if (isToolRequest) {
            record.toolRequest.unshift(messageWithInvocation);
          } else if (isToolResponse) {
            record.toolResult.unshift(messageWithInvocation);
          }

          hasRemovedInvocations = true;
          // Don't add this invocation to processedInvocations
        } else if (isToolResponse) {
          // New completed tool call - create summary placeholder
          const summaryMessage: UIMessage = {
            role: 'assistant',
            content: '[TOOL SUMMARY LOADING...]', // Required field
            parts: [{ type: 'text', text: '[TOOL SUMMARY LOADING...]' }], // Will be replaced by AI summary
            id: `tool-summary-${toolCallId}-${Date.now()}`,
            createdAt: new Date(),
          };

          // Create new record
          const record: ToolCallRecord = {
            toolResult: [{ ...message, toolInvocations: [invocation] }],
            toolRequest: [],
            toolSummary: summaryMessage,
          };

          toolCallDict.set(toolCallId, record); // Replace this invocation with the summary message
          processedInvocations.unshift({
            ...invocation,
            result: '[SUMMARIZED - See summary message]',
          });

          // Add summary message to the stream
          optimizedMessages.unshift(summaryMessage);
          hasRemovedInvocations = true;
        } else {
          // Keep as-is for edge cases
          processedInvocations.unshift(invocation);
        }
      }

      // Update the message with processed invocations
      if (hasRemovedInvocations && processedInvocations.length > 0) {
        optimizedMessages.unshift({
          ...message,
          toolInvocations: processedInvocations,
        });
        shouldIncludeMessage = false;
      } else if (processedInvocations.length === 0) {
        // All invocations were removed - don't include this message
        shouldIncludeMessage = false;
      }
    }

    if (shouldIncludeMessage) {
      optimizedMessages.unshift(message);
    }
  }

  // Add preserved messages at the end
  optimizedMessages.push(...preservedMessages);
  return { optimizedMessages, toolCallDict };
};

/**
 * Generate AI-powered summaries for all collected tool calls
 * Updates summary messages by reference
 */
const generateToolCallSummaries = async (
  toolCallDict: Map<string, ToolCallRecord>,
  allMessages?: UIMessage[],
): Promise<void> => {
  if (toolCallDict.size === 0) {
    return;
  }

  log((l) =>
    l.debug(
      `Generating AI summaries for ${toolCallDict.size} tool call sequences`,
    ),
  );

  // Process all tool call summaries in parallel for efficiency
  const summaryPromises = Array.from(toolCallDict.entries()).map(
    async ([toolCallId, record]) => {
      try {
        const summary = await generateSingleToolCallSummary(
          record,
          allMessages,
        ); // Update the summary message by reference
        record.toolSummary.content = summary;
        if (
          record.toolSummary.parts &&
          record.toolSummary.parts[0]?.type === 'text'
        ) {
          record.toolSummary.parts[0].text = summary;
        }

        log((l) =>
          l.debug(`Generated summary for tool call ${toolCallId}`, {
            originalLength: record.toolResult.reduce(
              (acc, msg) => acc + JSON.stringify(msg).length,
              0,
            ),
            summaryLength: summary.length,
          }),
        );
      } catch (error) {
        log((l) =>
          l.error(`Failed to generate summary for tool call ${toolCallId}`, {
            error,
          }),
        ); // Fallback to basic summary on error
        const fallbackText = `[TOOL CALL COMPLETED] ID: ${toolCallId} - Summary generation failed, see logs for details.`;
        record.toolSummary.content = fallbackText;
        if (
          record.toolSummary.parts &&
          record.toolSummary.parts[0]?.type === 'text'
        ) {
          record.toolSummary.parts[0].text = fallbackText;
        }
      }
    },
  );

  await Promise.all(summaryPromises);
  log((l) =>
    l.info(
      `Completed AI summary generation for ${toolCallDict.size} tool sequences`,
    ),
  );
};

/**
 * Generate a single tool call summary using the lofi model (with caching)
 */
const generateSingleToolCallSummary = async (
  record: ToolCallRecord,
  allMessages?: UIMessage[],
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
      }),
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
      : [],
  );

  const toolResults = record.toolResult.flatMap((msg) =>
    'toolInvocations' in msg && Array.isArray(msg.toolInvocations)
      ? msg.toolInvocations.map((inv) => ({
          result: 'result' in inv ? inv.result : 'No result',
          tool: 'toolName' in inv ? inv.toolName : 'unknown',
        }))
      : [],
  );

  // Extract conversational context that explains WHY tools were called
  const conversationalContext = extractConversationalContext(
    record,
    allMessages,
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
  2,
)}

Create a concise summary that:
1. Identifies what tools were executed and why (based on the conversational context)
2. Extracts the key findings that might be relevant for future conversation
3. Notes any important patterns, insights, or errors
4. Maintains context for ongoing conversation flow

Keep the summary under 300 characters while preserving essential meaning.
Respond with just the summary text, no additional formatting.`;

  const startSummaryTime = Date.now();

  try {
    const lofiModel = aiModelFactory('lofi');

    const result = await generateText({
      model: lofiModel,
      prompt,
      maxTokens: 150,
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'completion-tool-summarization',
        metadata: {},
      },
    });

    const summaryDuration = Date.now() - startSummaryTime;

    // Record summary generation duration
    summaryGenerationDurationHistogram.record(summaryDuration, {
      model: 'lofi',
      status: 'success',
    });

    const summary = result.text.trim();
    // Cache the result for future use
    toolSummaryCache.set(cacheKey, summary);

    log((l) =>
      l.debug('Generated and cached new tool summary', {
        cacheKey: cacheKey.substring(0, 8),
        summaryLength: summary.length,
        cacheSize: toolSummaryCache.size,
        durationMs: summaryDuration,
      }),
    );

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
  allMessages?: UIMessage[],
): string => {
  if (!allMessages || allMessages.length === 0) {
    return 'No conversational context available.';
  }

  const contextParts: string[] = [];

  // Extract content from the assistant messages that contain tool requests
  record.toolRequest.forEach((msg) => {
    if (
      'content' in msg &&
      typeof msg.content === 'string' &&
      msg.content.trim()
    ) {
      contextParts.push(`Assistant reasoning: ${msg.content.trim()}`);
    }

    // Also check parts for AI SDK v5 structure
    if ('parts' in msg && Array.isArray(msg.parts)) {
      msg.parts.forEach((part) => {
        if (
          part.type === 'text' &&
          typeof part.text === 'string' &&
          part.text.trim()
        ) {
          contextParts.push(`Assistant reasoning: ${part.text.trim()}`);
        }
      });
    }
  });

  // Look for the user message that likely prompted this tool sequence
  // We'll search backwards from tool request messages to find recent user input
  if (record.toolRequest.length > 0) {
    const toolRequestMessage = record.toolRequest[0];
    const toolRequestIndex = allMessages.findIndex(
      (msg) =>
        msg.id === toolRequestMessage.id ||
        (msg.createdAt &&
          toolRequestMessage.createdAt &&
          Math.abs(
            msg.createdAt.getTime() - toolRequestMessage.createdAt.getTime(),
          ) < 1000),
    );

    if (toolRequestIndex > 0) {
      // Look for the most recent user message before this tool request
      for (
        let i = toolRequestIndex - 1;
        i >= 0 && i >= toolRequestIndex - 5;
        i--
      ) {
        const prevMessage = allMessages[i];
        if (prevMessage.role === 'user') {
          let userContent = '';

          if (
            'content' in prevMessage &&
            typeof prevMessage.content === 'string'
          ) {
            userContent = prevMessage.content;
          } else if (
            'parts' in prevMessage &&
            Array.isArray(prevMessage.parts)
          ) {
            userContent = prevMessage.parts
              .filter((part) => part.type === 'text')
              .map((part) => ('text' in part ? part.text : ''))
              .join(' ');
          }

          if (userContent.trim()) {
            // Truncate user content to avoid bloating the prompt
            const truncatedContent =
              userContent.length > 200
                ? userContent.substring(0, 200) + '...'
                : userContent;
            contextParts.unshift(`User request: ${truncatedContent.trim()}`);
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
export function extractToolCallIds(message: UIMessage): string[] {
  if (
    message.role !== 'assistant' ||
    !('toolInvocations' in message) ||
    !Array.isArray(message.toolInvocations)
  ) {
    return [];
  }

  return message.toolInvocations
    .map((inv) => ('toolCallId' in inv ? (inv.toolCallId as string) : null))
    .filter((id): id is string => id !== null);
}

/**
 * Utility function to check if a message contains tool calls
 */
export function hasToolCalls(message: UIMessage): boolean {
  return (
    message.role === 'assistant' &&
    'toolInvocations' in message &&
    Array.isArray(message.toolInvocations) &&
    message.toolInvocations.length > 0
  );
}

/**
 * Calculate total character count for a message array
 * This gives a much better indication of actual context consumption than message count
 */
const calculateMessageCharacterCount = (messages: UIMessage[]): number => {
  return messages.reduce((total, message) => {
    let messageSize = 0;

    // Count content characters
    if ('content' in message && typeof message.content === 'string') {
      messageSize += message.content.length;
    }

    // Count parts characters (AI SDK v5 structure)
    if ('parts' in message && Array.isArray(message.parts)) {
      messageSize += message.parts.reduce((partTotal, part) => {
        if (part.type === 'text' && typeof part.text === 'string') {
          return partTotal + part.text.length;
        }
        // For other part types, estimate based on JSON size
        return partTotal + JSON.stringify(part).length;
      }, 0);
    }

    // Count tool invocation characters
    if (
      'toolInvocations' in message &&
      Array.isArray(message.toolInvocations)
    ) {
      messageSize += message.toolInvocations.reduce((toolTotal, invocation) => {
        return toolTotal + JSON.stringify(invocation).length;
      }, 0);
    }
    return total + messageSize;
  }, 0);
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
      l.debug('Stopped periodic metrics updates for message optimizer'),
    );
  };
};
