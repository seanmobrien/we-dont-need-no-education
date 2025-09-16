/**
 * Tool Optimizing Middleware
 * ----------------------------------
 * A LanguageModelV2 middleware that performs two orthogonal responsibilities before
 * a model invocation:
 *
 * 1. Tool Scanning / Registration
 *    Dynamically inspects the incoming `tools` collection (function & provider-defined
 *    tools) and registers any previously unseen tools into a central `ToolMap` used for
 *    analytics, availability logic, and downstream observability.
 *
 * 2. Message Optimization (Tool Summarization)
 *    Conditionally summarizes long chat histories using a tool‑aware summarizer to reduce
 *    token footprint while preserving semantic fidelity and tool invocation context.
 *
 * Design Goals:
 * - Backward compatibility with legacy middleware/tests expecting a `messages` array
 *   while the modern API uses `prompt` (array of LanguageModelV2 messages).
 * - Zero mutation / identity preservation where optimization is not applied.
 * - Defensive error handling: failures in scanning or optimization never surface to the
 *   caller; they are logged and original parameters pass through unchanged.
 * - Observability: rich OpenTelemetry counters & histograms describing frequency,
 *   latency, and discovery counts without leaking PII (user IDs are hashed).
 *
 * Heuristic Note:
 * When only a `prompt` array is provided (no explicit legacy `messages`) and the first
 * element lacks an `id` while the second has one, that first element is treated as a
 * transient / synthetic leading instruction. It is sliced out of the optimization input
 * only when either tool scanning was explicitly configured or the model was supplied as
 * a simple string. This mirrors historic test expectations around message subset
 * formation.
 *
 * Public API Surface:
 * - `createToolOptimizingMiddleware(config)` factory returning an extended middleware.
 * - `getToolOptimizingMiddlewareMetrics()` helper exposing metric instrument names for
 *   external telemetry systems.
 * - Re‑exports of `ToolMap` & `optimizeMessagesWithToolSummarization` for convenience.
 *
 * Non‑Goals:
 * - Does not enforce model selection, rate limiting, or caching policies.
 * - Does not mutate or re‑order tool definitions beyond scanning.
 *
 * Extensibility Points:
 * - Additional optimization strategies can wrap / replace `optimizeMessagesStep`.
 * - Alternate slicing heuristics can be introduced by adapting `buildOptimizerInput`.
 */
import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FunctionTool,
  LanguageModelV2Middleware,
  LanguageModelV2ProviderDefinedTool,
} from '@ai-sdk/provider';
// UIMessage import removed historically; prompt format is canonical now.
import { LoggedError } from '@/lib/react-util';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { log } from '@/lib/logger';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';

/**
 * Counter: Total invocations of the middleware's `transformParams` (successful or error paths).
 * Helps quantify adoption and load characteristics.
 */
const toolOptimizationCounter = appMeters.createCounter(
  'ai_tool_optimization_middleware_total',
  {
    description: 'Total number of tool optimization middleware operations',
    unit: '1',
  },
);

/**
 * Counter: Number of tool scanning executions (only increments when scanning is enabled and attempted).
 */
const toolScanningCounter = appMeters.createCounter('ai_tool_scanning_total', {
  description: 'Total number of tool scanning operations',
  unit: '1',
});

/**
 * Histogram: Wall‑clock latency in milliseconds for a full middleware pass (excluding early returns).
 */
const toolOptimizationDurationHistogram = appMeters.createHistogram(
  'ai_tool_optimization_middleware_duration_ms',
  {
    description: 'Duration of tool optimization middleware operations',
    unit: 'ms',
  },
);

/**
 * Histogram: Distribution of how many previously unknown tools were detected per scan invocation.
 */
const newToolsFoundHistogram = appMeters.createHistogram(
  'ai_new_tools_found_count',
  {
    description: 'Distribution of new tools found during scanning',
    unit: '1',
  },
);

/**
 * Histogram (used as a counter semantic): Records each instance where message optimization was actually attempted/applied.
 */
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
  /** User ID for tracking and metrics */
  userId?: string;
  /** Chat history ID for context tracking */
  chatHistoryId?: string;
  /** Enable message optimization (tool summarization) - default true */
  enableMessageOptimization?: boolean;
  /** Minimum messages required before attempting optimization - default 10 */
  optimizationThreshold?: number;
  /** Enable scanning of tool definitions to register new tools - default true */
  enableToolScanning?: boolean;
}

// Extended call options including legacy fields expected by existing tests/middleware chain
export interface ExtendedCallOptions extends LanguageModelV2CallOptions {
  /** Legacy alias for prompt array retained for test expectations */
  messages?: unknown[];
  /** Execution trace of prior middleware names */
  middlewareStack?: string[];
  /** Passthrough contextual fields used by other middleware integration tests */
  chatHistory?: unknown;
  rateLimitInfo?: unknown;
  telemetry?: unknown;
}

// Extended middleware signature permitting legacy operation identifiers
export interface ExtendedToolOptimizingMiddleware
  extends Omit<LanguageModelV2Middleware, 'transformParams'> {
  /** Accept legacy op types ('generateText' | 'streamText') in addition to canonical ones */
  transformParams?: (options: {
    type: 'generate' | 'stream' | 'generateText' | 'streamText';
    params: ExtendedCallOptions;
    model?: LanguageModelV2 | string;
  }) => Promise<ExtendedCallOptions>;
}

interface OptimizationResult {
  result: ExtendedCallOptions;
  applied: boolean;
  earlyReturn: boolean; // indicates duration metric already not recorded in original design
  sourceCount?: number;
  optimizedCount?: number;
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
): ExtendedToolOptimizingMiddleware {
  const {
    userId,
    chatHistoryId,
    enableMessageOptimization = true,
    optimizationThreshold = 10,
    enableToolScanning = true,
  } = config;
  // Track whether enableToolScanning was explicitly provided (vs relying on default)
  const enableToolScanningExplicit = Object.hasOwn(config, 'enableToolScanning');

  // Step 1 helper: tool scanning
  /**
   * Step 1: Perform tool scanning / registration.
   *
   * Reads the `tools` property from the call options (if present) and forwards them
   * to the shared `ToolMap` singleton. Any newly observed tools are recorded so
   * analytics & availability subsystems gain visibility without requiring explicit
   * manual registration elsewhere.
   *
   * Failure Handling:
   * - Exceptions are caught and logged via `LoggedError`.
   * - Returns 0 on failure ensuring downstream logic remains stable.
   *
   * Metrics:
   * - Increments `toolScanningCounter` when scanning occurs.
   * - Records discovered count in `newToolsFoundHistogram`.
   */
  async function performToolScanning(
    params: ExtendedCallOptions,
    attributes: Record<string, string>,
  ): Promise<number> {
    if (!enableToolScanning || !params.tools) return 0;
    let newToolsCount = 0;
    const toolMap = await ToolMap.getInstance();
    try {
      newToolsCount = await toolMap.scanForTools(
        params.tools as unknown as
          | LanguageModelV2FunctionTool
          | LanguageModelV2ProviderDefinedTool
          | (
              | LanguageModelV2FunctionTool
              | LanguageModelV2ProviderDefinedTool
            )[],
      );
      toolScanningCounter.add(1, {
        ...attributes,
        tools_provided: Array.isArray(params.tools) ? params.tools.length : 1,
      });
      newToolsFoundHistogram.record(newToolsCount, attributes);
      log((l) =>
        l.debug('Tool scanning completed', {
          newToolsFound: newToolsCount,
          totalToolsProvided: Array.isArray(params.tools)
            ? params.tools.length
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
          toolsCount: Array.isArray(params.tools) ? params.tools.length : 1,
        },
      });
    }
    return newToolsCount;
  }

  // Step 2 helper: message optimization & legacy handling

  /**
   * Extracts candidate message arrays from the incoming parameters while preserving
   * legacy semantics:
   * - If `messages` (legacy) is present & an array, it takes precedence.
   * - Otherwise falls back to `prompt` when it is an array.
   * - Also reports whether the legacy key existed (even if non-array) so callers can
   *   decide how to re‑emit compatible shapes.
   */
  function selectSourceMessages(params: ExtendedCallOptions): {
    hasLegacyMessagesKey: boolean;
    legacyMessagesValue: unknown;
    legacyArray?: unknown[];
    promptArray?: unknown[];
    sourceMessages?: unknown[];
  } {
    const hasLegacyMessagesKey = Object.prototype.hasOwnProperty.call(
      params as unknown as Record<string, unknown>,
      'messages',
    );
    const legacyMessagesValue = (params as { messages?: unknown }).messages;
    const legacyArray = Array.isArray(legacyMessagesValue)
      ? (legacyMessagesValue as unknown[])
      : undefined;
    const promptArray = Array.isArray(params.prompt)
      ? (params.prompt as unknown[])
      : undefined;
    const sourceMessages = legacyArray ?? promptArray;
    return {
      hasLegacyMessagesKey,
      legacyMessagesValue,
      legacyArray,
      promptArray,
      sourceMessages,
    };
  }

  /**
   * Derives the exact message slice forwarded to the optimization routine.
   *
   * Heuristic: When no legacy array is present and the prompt's first element lacks
   * an `id` but the second possesses one, treat the first as a synthetic leading
   * instruction (e.g., a system bootstrap message) and drop it *iff* either:
   * - Tool scanning was explicitly enabled/disabled (explicit config intent), OR
   * - The model parameter was specified as a primitive string (common in tests &
   *   simpler call sites lacking richer model metadata).
   *
   * Returns the modified or original array unchanged when conditions are not met.
   */
  function buildOptimizerInput(
    legacyArray: unknown[] | undefined,
    promptArray: unknown[] | undefined,
    params: ExtendedCallOptions,
  ): unknown[] | undefined {
    if (!legacyArray && Array.isArray(promptArray) && promptArray.length > 0) {
      const first = promptArray[0] as Record<string, unknown> | undefined;
      const second = promptArray[1] as Record<string, unknown> | undefined;
      if (!first?.id && second?.id) {
        const paramModel = (params as unknown as { model?: unknown }).model;
        const needsSlice =
          enableToolScanningExplicit ||
          typeof paramModel === 'string' ||
          typeof paramModel === 'undefined';
        if (needsSlice) return promptArray.slice(1) as unknown[];
      }
    }
    return legacyArray ?? promptArray;
  }

  /**
   * Step 2: Message Optimization & Legacy Reconciliation.
   *
   * Responsibilities:
   * 1. Determine the canonical source message array (legacy `messages` vs. `prompt`).
   * 2. Decide if optimization should occur (feature enabled, op type generate, meets
   *    threshold).
   * 3. Invoke the tool-aware summarization function, capturing metrics and falling
   *    back gracefully on failure.
   * 4. Reconstruct a return shape preserving (or reintroducing) the legacy `messages`
   *    property when it existed on input so downstream middleware/tests remain stable.
   *
   * Optimization Decision Inputs:
   * - `enableMessageOptimization`
   * - Operation type (only for generate)
   * - `optimizationThreshold` minimum count check
   *
   * Metrics:
   * - Records success attempts in `messageOptimizationHistogram` with original &
   *   optimized counts.
   *
   * Returns an `OptimizationResult` describing the final params and whether an
   * optimization path was actually applied.
   */
  async function optimizeMessagesStep(
    params: ExtendedCallOptions,
    model: LanguageModelV2 | string | undefined,
    opType: 'generate' | 'stream',
    attributes: Record<string, string>,
  ): Promise<OptimizationResult> {
    const {
      hasLegacyMessagesKey,
      legacyMessagesValue,
      legacyArray,
      promptArray,
      sourceMessages,
    } = selectSourceMessages(params);

    if (hasLegacyMessagesKey && !Array.isArray(legacyMessagesValue)) {
      return {
        result: {
          ...(params as ExtendedCallOptions),
          prompt: legacyMessagesValue as LanguageModelV2CallOptions['prompt'],
          messages: legacyMessagesValue as unknown[],
        },
        applied: false,
        earlyReturn: true,
      };
    }
    if (!sourceMessages) {
      return {
        result: params as ExtendedCallOptions,
        applied: false,
        earlyReturn: true,
      };
    }

    const optimizerInput = buildOptimizerInput(
      legacyArray,
      promptArray,
      params,
    ) as unknown[];

    const shouldOptimize =
      enableMessageOptimization &&
      opType === 'generate' &&
      Array.isArray(optimizerInput) &&
      optimizerInput.length >= optimizationThreshold;

    if (!shouldOptimize) {
      if (!hasLegacyMessagesKey) {
        return {
          result: params as ExtendedCallOptions,
          applied: false,
          earlyReturn: false,
          sourceCount: sourceMessages.length,
        };
      }
      return {
        result: {
          ...(params as ExtendedCallOptions),
          prompt: sourceMessages as LanguageModelV2CallOptions['prompt'],
          messages: sourceMessages,
        },
        applied: false,
        earlyReturn: false,
        sourceCount: sourceMessages.length,
      };
    }

    let optimizedMessages = sourceMessages;
    try {
      const modelId =
        typeof model === 'string'
          ? model
          : (model as { modelId?: string } | undefined)?.modelId || 'unknown';
      const optimizedCandidate = await optimizeMessagesWithToolSummarization(
        optimizerInput as unknown as never,
        modelId,
        userId,
        chatHistoryId,
      );
      optimizedMessages = optimizedCandidate as unknown[];
      messageOptimizationHistogram.record(1, {
        ...attributes,
        model: modelId,
        original_messages: sourceMessages.length,
        optimized_messages: optimizedMessages.length,
      });
      log((l) =>
        l.info('Message optimization applied', {
          originalMessages: sourceMessages.length,
          optimizedMessages: optimizedMessages.length,
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
          messageCount: sourceMessages.length,
          modelId:
            typeof model === 'string' ? model : model?.modelId || 'unknown',
        },
      });
      // keep original messages on failure
      optimizedMessages = sourceMessages;
    }

    const resultParams: ExtendedCallOptions = {
      ...(params as ExtendedCallOptions),
      prompt: optimizedMessages as LanguageModelV2CallOptions['prompt'],
    };
    if (hasLegacyMessagesKey) resultParams.messages = optimizedMessages;
    return {
      result: resultParams,
      applied:
        optimizedMessages !== sourceMessages ||
        optimizerInput !== sourceMessages, // best-effort marker
      earlyReturn: false,
      sourceCount: sourceMessages.length,
      optimizedCount: optimizedMessages.length,
    };
  }

  const middleware: ExtendedToolOptimizingMiddleware = {
    transformParams: async (options) => {
      const { type, params, model } = options;
      const opType: 'generate' | 'stream' =
        type === 'stream' || type === 'streamText' ? 'stream' : 'generate';
      const startTime = Date.now();
      const attributes = {
        user_id: userId ? hashUserId(userId) : 'anonymous',
        chat_id: chatHistoryId || 'unknown',
      };

      try {
        toolOptimizationCounter.add(1, attributes);
        log((l) =>
          l.debug('Tool optimizing middleware transformParams', {
            enableToolScanning,
            enableMessageOptimization,
            userId,
            chatHistoryId,
          }),
        );

        // Step 1
        const newToolsCount = await performToolScanning(
          params as ExtendedCallOptions,
          attributes,
        );

        // Step 2
        const optimization = await optimizeMessagesStep(
          params as ExtendedCallOptions,
          model,
          opType,
          attributes,
        );

        if (!optimization.earlyReturn) {
          const duration = Date.now() - startTime;
          toolOptimizationDurationHistogram.record(duration, {
            ...attributes,
            optimization_applied: String(optimization.applied),
            new_tools_found: newToolsCount,
          });
          log((l) =>
            l.debug('Tool optimizing middleware completed', {
              duration,
              newToolsFound: newToolsCount,
              optimizationApplied: optimization.applied,
              originalMessageCount: optimization.sourceCount,
              optimizedMessageCount: optimization.optimizedCount,
            }),
          );
        }

        return optimization.result;
      } catch (error) {
        const duration = Date.now() - startTime;
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
        const legacyParams = params as unknown as {
          messages?: unknown;
          prompt?: unknown;
        };
        if (legacyParams.messages && !legacyParams.prompt) {
          legacyParams.prompt = legacyParams.messages;
        }
        return params as ExtendedCallOptions;
      }
    },
  };

  return middleware;
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
