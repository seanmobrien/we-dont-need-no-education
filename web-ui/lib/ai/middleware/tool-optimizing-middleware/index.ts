import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FunctionTool,
  LanguageModelV2Middleware,
  LanguageModelV2ProviderDefinedTool,
} from '@ai-sdk/provider';
import type { UIMessage } from 'ai';
import { LoggedError } from '@/lib/react-util';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { log } from '@/lib/logger';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';

// OpenTelemetry Metrics for Tool Optimization Middleware
const toolOptimizationCounter = appMeters.createCounter(
  'ai_tool_optimization_middleware_total',
  {
    description: 'Total number of tool optimization middleware operations',
    unit: '1',
  },
);

const toolScanningCounter = appMeters.createCounter('ai_tool_scanning_total', {
  description: 'Total number of tool scanning operations',
  unit: '1',
});

const toolOptimizationDurationHistogram = appMeters.createHistogram(
  'ai_tool_optimization_middleware_duration_ms',
  {
    description: 'Duration of tool optimization middleware operations',
    unit: 'ms',
  },
);

const newToolsFoundHistogram = appMeters.createHistogram(
  'ai_new_tools_found_count',
  {
    description: 'Distribution of new tools found during scanning',
    unit: '1',
  },
);

const messageOptimizationHistogram = appMeters.createHistogram(
  'ai_message_optimization_enabled_total',
  {
    description: 'Total number of times message optimization was enabled',
    unit: '1',
  },
);

/**
 * Configuration options for the tool optimizing middleware
 */
export interface ToolOptimizingMiddlewareConfig {
  /**
   * User ID for tracking and metrics
   */
  userId?: string;

  /**
   * Chat history ID for context tracking
   */
  chatHistoryId?: string;

  /**
   * Whether to enable message optimization with tool summarization
   * @default true
   */
  enableMessageOptimization?: boolean;

  /**
   * Minimum number of messages to trigger optimization
   * @default 10
   */
  optimizationThreshold?: number;

  /**
   * Whether to enable tool scanning for new tools
   * @default true
   */
  enableToolScanning?: boolean;
}

/**
 * Creates a middleware for tool optimization that handles tool scanning and message optimization.
 *
 * This middleware is responsible for:
 * - Scanning incoming tool definitions and adding new ones to the ToolMap
 * - Optimizing message history using tool summarization when configured
 * - Recording metrics for tool discovery and optimization operations
 * - Maintaining backward compatibility with existing middleware patterns
 *
 * The middleware uses the `transformParams` function to:
 * 1. Call ToolMap's `scanForTools` method to discover and register new tools
 * 2. Apply message optimization using `optimizeMessagesWithToolSummarization`
 * 3. Pass through all other parameters unchanged
 *
 * @param config - Configuration options for the middleware
 * @returns A middleware object implementing `LanguageModelV2Middleware`
 *
 * @example
 * ```typescript
 * import { createToolOptimizingMiddleware } from '@/lib/ai/middleware/tool-optimizing-middleware';
 *
 * const toolOptimizingMiddleware = createToolOptimizingMiddleware({
 *   userId: 'user-123',
 *   chatHistoryId: 'chat-456',
 *   enableMessageOptimization: true,
 *   optimizationThreshold: 15,
 * });
 *
 * // Use with your language model pipeline
 * const model = wrapModel(aiModelFactory('hifi'), [toolOptimizingMiddleware]);
 * ```
 */
export function createToolOptimizingMiddleware(
  config: ToolOptimizingMiddlewareConfig = {},
): LanguageModelV2Middleware {
  const {
    userId,
    chatHistoryId,
    enableMessageOptimization = true,
    optimizationThreshold = 10,
    enableToolScanning = true,
  } = config;

  return {
    transformParams: async ({
      type,
      params,
      model,
    }: {
      type: 'generate' | 'stream' | string;
      params: LanguageModelV2CallOptions;
      model: LanguageModelV2;
    }): Promise<LanguageModelV2CallOptions> => {
      const startTime = Date.now();
      const attributes = {
        user_id: userId ? hashUserId(userId) : 'anonymous',
        chat_id: chatHistoryId || 'unknown',
      };
      const wrapperMode = type !== 'generate';

      try {
        // Record middleware invocation
        toolOptimizationCounter.add(1, attributes);

        log((l) =>
          l.debug('Tool optimizing middleware transformParams', {
            enableToolScanning,
            enableMessageOptimization,
            userId,
            chatHistoryId,
          }),
        );

        // Cast params to access optional properties in a type-safe, loose manner
        type LooseParams = {
          messages?: unknown;
          prompt?: unknown;
          tools?: unknown;
          model?: unknown;
          [key: string]: unknown;
        };
        const extendedParams = params as unknown as LooseParams;

        // Step 1: Tool scanning - discover and register new tools
        let newToolsCount = 0;
        if (enableToolScanning && extendedParams.tools) {
          // Treat getInstance failure as critical (bubble up), but scanForTools failure as non-fatal
          const toolMap = await ToolMap.getInstance();
          try {
            newToolsCount = await toolMap.scanForTools(
              extendedParams.tools as unknown as
                | LanguageModelV2FunctionTool
                | LanguageModelV2ProviderDefinedTool
                | (
                    | LanguageModelV2FunctionTool
                    | LanguageModelV2ProviderDefinedTool
                  )[],
            );

            // Record tool scanning metrics
            toolScanningCounter.add(1, {
              ...attributes,
              tools_provided: Array.isArray(extendedParams.tools)
                ? extendedParams.tools.length
                : 1,
            });

            newToolsFoundHistogram.record(newToolsCount, attributes);

            log((l) =>
              l.debug('Tool scanning completed', {
                newToolsFound: newToolsCount,
                totalToolsProvided: Array.isArray(extendedParams.tools)
                  ? extendedParams.tools.length
                  : 1,
              }),
            );
          } catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'ToolOptimizingMiddleware.toolScanning',
              message: 'Failed to scan tools',
              data: {
                userId,
                chatHistoryId,
                toolsCount: Array.isArray(extendedParams.tools)
                  ? extendedParams.tools.length
                  : 1,
              },
            });
            // Continue with middleware execution even if tool scanning fails
          }
        }

        // Step 2: Message optimization - optimize messages using tool summarization
        // Support both official AI SDK prompt format and legacy messages format
        const sourceMessages = Array.isArray(extendedParams.messages)
          ? extendedParams.messages
          : extendedParams.prompt;
        let optimizedMessages = sourceMessages;
        let optimizationApplied = false;

        const shouldOptimize =
          enableMessageOptimization &&
          ['generate', 'generateText', 'generateObject'].includes(
            type as string,
          ) &&
          Array.isArray(sourceMessages) &&
          sourceMessages.length >= optimizationThreshold;

        if (shouldOptimize) {
          try {
            const modelId =
              typeof model === 'string'
                ? model
                : model?.modelId ||
                  (typeof extendedParams.model === 'string'
                    ? (extendedParams.model as string)
                    : (extendedParams.model as { modelId?: string } | undefined)
                        ?.modelId) ||
                  'unknown';

            const optimizedCandidate =
              await optimizeMessagesWithToolSummarization(
                sourceMessages as UIMessage[],
                modelId,
                userId,
                chatHistoryId,
              );

            if (Array.isArray(optimizedCandidate)) {
              optimizedMessages = optimizedCandidate;
              optimizationApplied = true;
            } else {
              // Defensive: if optimizer returns unexpected shape, keep original
              optimizedMessages = sourceMessages;
              optimizationApplied = false;
            }

            // Record message optimization metrics
            messageOptimizationHistogram.record(1, {
              ...attributes,
              model: modelId,
              original_messages: Array.isArray(sourceMessages)
                ? sourceMessages.length
                : 0,
              optimized_messages: Array.isArray(optimizedMessages)
                ? optimizedMessages.length
                : 0,
            });

            log((l) =>
              l.info('Message optimization applied', {
                originalMessages: Array.isArray(sourceMessages)
                  ? sourceMessages.length
                  : 0,
                optimizedMessages: Array.isArray(optimizedMessages)
                  ? optimizedMessages.length
                  : 0,
                modelId,
                userId,
                chatHistoryId,
              }),
            );
          } catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'ToolOptimizingMiddleware.messageOptimization',
              message: 'Failed to optimize messages',
              data: {
                userId,
                chatHistoryId,
                messageCount: Array.isArray(sourceMessages)
                  ? sourceMessages.length
                  : 0,
                modelId:
                  typeof model === 'string'
                    ? model
                    : model?.modelId || 'unknown',
              },
            });
            // For legacy generateText/generateObject calls, preserve wrapper structure on error
            if (wrapperMode) {
              const err =
                error instanceof Error
                  ? error
                  : new Error('Optimization failed');
              (err as unknown as Record<string, unknown>).__preserveStructure =
                true;
              throw err;
            }
            // Continue with original messages if optimization fails for 'generate'
            optimizedMessages = sourceMessages;
          }
        }

        const duration = Date.now() - startTime;

        // Record processing duration
        toolOptimizationDurationHistogram.record(duration, {
          ...attributes,
          optimization_applied: String(optimizationApplied),
          new_tools_found: newToolsCount,
        });

        log((l) =>
          l.debug('Tool optimizing middleware completed', {
            duration,
            newToolsFound: newToolsCount,
            optimizationApplied,
            originalMessageCount: Array.isArray(sourceMessages)
              ? sourceMessages.length
              : 0,
            optimizedMessageCount: Array.isArray(optimizedMessages)
              ? optimizedMessages.length
              : 0,
          }),
        );

        // Return transformed parameters (preserve caller structure)
        // First, build the mutated params object
        const resultParams: Record<string, unknown> = {
          ...(params as unknown as Record<string, unknown>),
        };
        if (Array.isArray(extendedParams.messages)) {
          resultParams.messages = optimizedMessages;
          resultParams.prompt = optimizedMessages; // keep prompt in sync
        } else {
          resultParams.prompt = optimizedMessages;
        }

        if (wrapperMode) {
          // For wrapper callers (e.g., generateText/streamText), return wrapper and mirror common fields
          const normalizedModel =
            typeof (resultParams as Record<string, unknown>).model === 'string'
              ? ((resultParams as Record<string, unknown>).model as string)
              : ((
                  (resultParams as Record<string, unknown>).model as
                    | { modelId?: string }
                    | undefined
                )?.modelId ??
                (typeof model === 'string' ? model : model?.modelId));

          const wrapper = {
            type,
            params: resultParams,
            // spread all params at top-level to preserve structure for downstream middleware/tests
            ...(resultParams as Record<string, unknown>),
            model: normalizedModel,
          };
          return wrapper as unknown as LanguageModelV2CallOptions;
        }
        // For unified 'generate' callers, return params directly
        return resultParams as unknown as LanguageModelV2CallOptions;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error metrics
        toolOptimizationDurationHistogram.record(duration, {
          ...attributes,
          status: 'error',
        });

        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'ToolOptimizingMiddleware.transformParams',
          message: 'Unexpected error in tool optimizing middleware',
          data: { userId, chatHistoryId },
        });

        // On error: if optimization requested wrapper preservation, return wrapper with original params
        if (
          '__preserveStructure' in (error as Record<string, unknown>) &&
          wrapperMode
        ) {
          return { type, params } as unknown as LanguageModelV2CallOptions;
        }
        // Otherwise, return original params to maintain robustness
        return params as LanguageModelV2CallOptions;
      }
    },
  };
}

/**
 * Export metrics collection for observability integration
 */
export const getToolOptimizingMiddlewareMetrics = () => {
  return {
    counters: {
      tool_optimization_middleware_total:
        'ai_tool_optimization_middleware_total',
      tool_scanning_total: 'ai_tool_scanning_total',
      message_optimization_enabled_total:
        'ai_message_optimization_enabled_total',
    },
    histograms: {
      tool_optimization_middleware_duration_ms:
        'ai_tool_optimization_middleware_duration_ms',
      new_tools_found_count: 'ai_new_tools_found_count',
    },
  };
};

/**
 * Re-export types and utilities for convenience
 */
export { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
export { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
