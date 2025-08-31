import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import { getRetryErrorInfo } from '@/lib/ai/chat';
import {
  isModelAvailable,
  getModelAvailabilityStatus,
} from '@/lib/ai/aiModelFactory';
import { rateLimitMetrics } from './metrics';
import type {
  ModelClassification,
  ModelFailoverConfig,
  RetryRateLimitMiddlewareType,
  RateLimitRetryContext,
  RateLimitFactoryOptions,
} from './types';
import { log } from '@/lib/logger';
import { checkModelAvailabilityAndFallback } from './model-availability';
import {
  handleRateLimitError,
  disableModelFromRateLimit,
} from './rate-limit-handler';
import {
  recordRequestMetrics,
  getCurrentProvider,
  constructModelKey,
} from './metrics-utils';
import { LanguageModel } from 'ai';
import { ModelMap } from '../../services/model-stats/model-map';
import { createStatefulMiddleware } from '../state-management';

// Model classification mapping - extract from model identifier
async function getModelClassification({
  model = 'unknown',
}: { model?: LanguageModel } = {}): Promise<ModelClassification> {
  const { modelId = 'unknown' } = await (
    await ModelMap.getInstance()
  ).normalizeProviderModel(model);
  if (
    modelId.includes('hifi') ||
    modelId.includes('gpt-4') ||
    modelId.includes('gemini-1.5-pro')
  ) {
    return 'hifi';
  }
  if (
    modelId.includes('lofi') ||
    modelId.includes('gpt-3.5') ||
    modelId.includes('gemini-1.5-flash')
  ) {
    return 'lofi';
  }
  if (modelId.includes('embedding')) {
    return 'embedding';
  }
  if (modelId.includes('completions')) {
    return 'completions';
  }

  return 'hifi'; // default fallback
}

// Provider and model failover logic
function getFailoverConfig(currentProvider: string): ModelFailoverConfig {
  const primaryProvider = currentProvider.includes('azure')
    ? 'azure'
    : 'google';
  const fallbackProvider = primaryProvider === 'azure' ? 'google' : 'azure';

  return {
    primaryProvider,
    fallbackProvider,
    // modelClassification,
  };
}

export const retryRateLimitMiddlewareFactory = async (
  factoryOptions: RateLimitFactoryOptions | RateLimitRetryContext,
): Promise<RetryRateLimitMiddlewareType> => {
  /**
   * Advanced rate limit middleware context data
   */
  const rateLimitContext = await (async () => {
    if ('modelClass' in factoryOptions) {
      return factoryOptions;
    }
    // If factoryOptions is a FactoryOptions, derive context from it
    const { model } = factoryOptions;
    if (!model) {
      throw new Error('Model is required to create rate limit context');
    }
    const normalModel = await (
      await ModelMap.getInstance()
    ).normalizeProviderModel(model);
    const modelClass = await getModelClassification({
      model: normalModel.modelId,
    });
    const { primaryProvider, fallbackProvider } = getFailoverConfig(
      normalModel.provider,
    );
    return {
      modelClass,
      failover: {
        primaryProvider,
        fallbackProvider,
      },
    };
  })();

  /**
   * Original rate limit middleware implementation
   */
  const originalRetryRateLimitMiddleware: RetryRateLimitMiddlewareType = {
    rateLimitContext: () => ({ ...rateLimitContext }),

    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      const modelClassification = rateLimitContext.modelClass;

      console.log('Advanced rate limit middleware - doGenerate called');
      console.log(`Model classification: ${modelClassification}`);

      // Check if current model is available, attempt fallback if not
      const currentProvider = getCurrentProvider();
      const currentModelKey = constructModelKey(
        currentProvider,
        modelClassification,
      );

      try {
        await checkModelAvailabilityAndFallback(
          currentModelKey,
          modelClassification,
          rateLimitContext.failover,
          {
            ...params,
            ...{
              chatId: 'unassigned',
              turnId: '1',
              ...(params?.providerOptions?.backoffice ?? {}),
            },
          },
        );
      } catch (error) {
        // Model unavailable and no fallback - error already thrown with appropriate message
        throw error;
      }

      try {
        const result = await doGenerate();

        recordRequestMetrics(startTime, modelClassification, 'generate');
        console.log('doGenerate finished successfully');
        return result;
      } catch (error) {
        recordRequestMetrics(startTime, modelClassification, 'generate');

        // Use utility function to handle rate limit errors
        await handleRateLimitError(
          error,
          currentModelKey,
          modelClassification,
          rateLimitContext.failover,
          {
            ...params,
            ...{
              chatId: 'unassigned',
              turnId: '1',
              ...(params?.providerOptions?.backoffice ?? {}),
            },
          },
          'generate',
        );
        // This line should never be reached as handleRateLimitError always throws
        throw error;
      }
    },

    wrapStream: async ({ doStream, params, model }) => {
      const startTime = Date.now();
      const modelClassification = await getModelClassification({ model });

      console.log('Advanced rate limit middleware - doStream called');
      console.log(`Model classification: ${modelClassification}`);

      // Similar model availability check as in wrapGenerate
      const currentProvider = getCurrentProvider();
      const currentModelKey = constructModelKey(
        currentProvider,
        modelClassification,
      );

      try {
        await checkModelAvailabilityAndFallback(
          currentModelKey,
          modelClassification,
          getFailoverConfig(currentProvider),
          {
            ...params,
            ...{
              chatId: 'unassigned',
              turnId: '1',
              ...(params?.providerOptions?.backoffice ?? {}),
            },
          },
        );
      } catch (error) {
        // Model unavailable and no fallback - error already thrown with appropriate message
        throw error;
      }

      try {
        const { stream, ...rest } = await doStream();
        let generatedText = '';
        let hasError = false;

        const transformStream = new TransformStream<
          LanguageModelV2StreamPart,
          LanguageModelV2StreamPart
        >({
          transform(chunk, controller) {
            if (chunk.type === 'text-delta') {
              generatedText += chunk.delta;
            }

            // Check for error chunks that might indicate rate limiting
            if (chunk.type === 'error') {
              hasError = true;
              const rateLimitErrorInfo = getRetryErrorInfo(chunk.error);
              if (
                rateLimitErrorInfo?.isRetry &&
                rateLimitErrorInfo.retryAfter
              ) {
                console.log(
                  `Stream rate limit detected: ${rateLimitErrorInfo.retryAfter}s`,
                );
                disableModelFromRateLimit(
                  currentModelKey,
                  rateLimitErrorInfo.retryAfter,
                );
                rateLimitMetrics.recordError(
                  'stream_rate_limit',
                  modelClassification,
                );
              }
            }

            controller.enqueue(chunk);
          },

          flush() {
            recordRequestMetrics(startTime, modelClassification, 'stream');

            if (!hasError) {
              console.log('doStream finished successfully');
              console.log(`Generated text length: ${generatedText.length}`);
            }
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
          ...rest,
        };
      } catch (error) {
        recordRequestMetrics(startTime, modelClassification, 'stream');

        // Handle rate limit errors using utility function
        await handleRateLimitError(
          error,
          currentModelKey,
          modelClassification,
          getFailoverConfig(currentProvider),
          params,
          'stream_setup',
        );
        // This line should never be reached as handleRateLimitError always throws
        throw error;
      }
    },

    transformParams: async ({ params }) => {
      console.log('transformParams called - checking model availability');

      const modelClassification = rateLimitContext.modelClass;
      const currentProvider =
        rateLimitContext.failover?.primaryProvider ?? 'azure';
      const currentModelKey = `${currentProvider}:${modelClassification}`;

      // Log current model availability status
      const availabilityStatus = getModelAvailabilityStatus();
      log((l) => l.verbose('Model availability status:', availabilityStatus));

      // If current model is not available, we could potentially modify params here
      // to use a different model, but this would require careful handling
      if (!isModelAvailable(currentModelKey)) {
        log((l) =>
          l.warn(`Requested model ${currentModelKey} is not available`),
        );
      }
      // Forward to token tracking middleware to generate token counts
      return {
        ...params,
      };
    },
  };

  /**
   * Stateful wrapper with rate limit context preservation
   */
  const statefulMiddleware = createStatefulMiddleware({
    middlewareId: 'retry-rate-limiter',
    originalMiddleware: originalRetryRateLimitMiddleware,
    stateHandlers: {
      serialize: () => ({
        rateLimitContext: { ...rateLimitContext },
        currentProvider: getCurrentProvider(),
        timestamp: Date.now(),
      }),
      deserialize: (state: {
        rateLimitContext?: RateLimitRetryContext;
        currentProvider?: string;
        timestamp?: number;
      }) => {
        if (state?.rateLimitContext) {
          log((l) =>
            l.debug('Rate limiter state restored', {
              context: state.rateLimitContext,
              provider: state.currentProvider,
              age: Date.now() - (state.timestamp || 0),
            }),
          );
        }
      },
    },
  }) as RetryRateLimitMiddlewareType;

  // Add the rateLimitContext method to the stateful middleware
  statefulMiddleware.rateLimitContext = () => ({ ...rateLimitContext });

  return statefulMiddleware;
};
