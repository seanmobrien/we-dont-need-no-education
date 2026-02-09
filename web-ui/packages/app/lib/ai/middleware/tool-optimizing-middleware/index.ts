import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FunctionTool,
  LanguageModelV2Middleware,
  LanguageModelV2ProviderDefinedTool,
} from '@ai-sdk/provider';
// UIMessage import removed historically; prompt format is canonical now.
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { log } from '@compliance-theater/logger';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';

const toolOptimizationCounter = appMeters.createCounter(
  'ai_tool_optimization_middleware_total',
  {
    description: 'Total number of tool optimization middleware operations',
    unit: '1',
  }
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
  }
);

const newToolsFoundHistogram = appMeters.createHistogram(
  'ai_new_tools_found_count',
  {
    description: 'Distribution of new tools found during scanning',
    unit: '1',
  }
);

const messageOptimizationHistogram = appMeters.createHistogram(
  'ai_message_optimization_enabled_total',
  {
    description: 'Total number of times message optimization was enabled',
    unit: '1',
  }
);

export interface ToolOptimizingMiddlewareConfig {
  userId?: string;
  chatHistoryId?: string;
  enableMessageOptimization?: boolean;
  optimizationThreshold?: number;
  enableToolScanning?: boolean;
}

export interface ExtendedCallOptions extends LanguageModelV2CallOptions {
  messages?: unknown[];
  middlewareStack?: string[];
  chatHistory?: unknown;
  rateLimitInfo?: unknown;
  telemetry?: unknown;
}

export interface ExtendedToolOptimizingMiddleware
  extends Omit<LanguageModelV2Middleware, 'transformParams'> {
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

export function createToolOptimizingMiddleware(
  config: ToolOptimizingMiddlewareConfig = {}
): ExtendedToolOptimizingMiddleware {
  const {
    userId,
    chatHistoryId,
    enableMessageOptimization = true,
    optimizationThreshold = 10,
    enableToolScanning = true,
  } = config;
  // Track whether enableToolScanning was explicitly provided (vs relying on default)
  const enableToolScanningExplicit = Object.hasOwn(
    config,
    'enableToolScanning'
  );

  async function performToolScanning(
    params: ExtendedCallOptions,
    attributes: Record<string, string>
  ): Promise<number> {
    if (!enableToolScanning || !params.tools) return 0;
    let newToolsCount = 0;
    const toolMap = await ToolMap.getInstance();
    try {
      newToolsCount = await toolMap.scanForTools(
        params.tools as unknown as
          | LanguageModelV2FunctionTool
          | LanguageModelV2ProviderDefinedTool
          | (LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool)[]
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
        })
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

  function selectSourceMessages(params: ExtendedCallOptions): {
    hasLegacyMessagesKey: boolean;
    legacyMessagesValue: unknown;
    legacyArray?: unknown[];
    promptArray?: unknown[];
    sourceMessages?: unknown[];
  } {
    const hasLegacyMessagesKey = Object.prototype.hasOwnProperty.call(
      params as unknown as Record<string, unknown>,
      'messages'
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

  function buildOptimizerInput(
    legacyArray: unknown[] | undefined,
    promptArray: unknown[] | undefined,
    params: ExtendedCallOptions
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

  async function optimizeMessagesStep(
    params: ExtendedCallOptions,
    model: LanguageModelV2 | string | undefined,
    opType: 'generate' | 'stream',
    attributes: Record<string, string>
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
      params
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
        chatHistoryId
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
        })
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
          })
        );

        // Step 1
        const newToolsCount = await performToolScanning(
          params as ExtendedCallOptions,
          attributes
        );

        // Step 2
        const optimization = await optimizeMessagesStep(
          params as ExtendedCallOptions,
          model,
          opType,
          attributes
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
            })
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

export { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
export { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
