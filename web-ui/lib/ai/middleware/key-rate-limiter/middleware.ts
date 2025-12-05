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
import { MiddlewareStateManager } from '../state-management';
import { LoggedError } from '@/lib/react-util';

type RateLimitRetryState = {
  rateLimitContext: RateLimitRetryContext;
  timestamp: number;
};

// Model classification mapping - extract from model identifier
const getModelClassification = async ({
  model = 'unknown',
}: { model?: LanguageModel } = {}): Promise<ModelClassification> => {
  return await (await ModelMap.getInstance())
    .normalizeProviderModel(model)
    .then((x) => x.classification);
};

// Provider and model failover logic
const getFailoverConfig = (currentProvider: string): ModelFailoverConfig => {
  const primaryProvider = currentProvider.includes('azure')
    ? 'azure'
    : 'google';
  const fallbackProvider = primaryProvider === 'azure' ? 'google' : 'azure';

  return {
    primaryProvider,
    fallbackProvider,
    // modelClassification,
  };
};

export const retryRateLimitMiddlewareFactory = async (
  factoryOptions: RateLimitFactoryOptions | RateLimitRetryContext,
): Promise<RetryRateLimitMiddlewareType> => {
  let rateLimitContext = await (async () => {
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

  const originalRetryRateLimitMiddleware: RetryRateLimitMiddlewareType = {
    rateLimitContext: () => ({ ...rateLimitContext }),

    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      const modelClassification = rateLimitContext.modelClass;

      log((l) =>
        l.info('Advanced rate limit middleware - doGenerate called'),
      );
      log((l) => l.info(`Model classification: ${modelClassification}`));

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
      try {
        const modelClassification = await getModelClassification({ model });
        log((l) => l.verbose(`=== RetryRateLimitMiddleware - doStream called - Model classification: ${modelClassification} ===`));

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
                  log((l) =>
                    l.info(
                      `Stream rate limit detected: ${rateLimitErrorInfo.retryAfter}s`,
                    ),
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
                log((l) => l.info('doStream finished successfully'));
                log((l) =>
                  l.info(`Generated text length: ${generatedText.length}`),
                );
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
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          source: 'rateLimitMiddleware',
          log: true,
        })
      } finally {
        log((l) => l.verbose('=== RetryRateLimitMiddleware - doStream finished ==='));
      }
    },

    transformParams: async ({ params }) => {

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

  const serializeState = async (): Promise<RateLimitRetryState> => {
    return Promise.resolve({
      rateLimitContext,
      timestamp: Date.now(),
    });
  };

  const statefulMiddleware =
    MiddlewareStateManager.Instance.statefulMiddlewareWrapper<RateLimitRetryState>(
      {
        middlewareId: 'retry-rate-limiter',
        middleware: {
          ...originalRetryRateLimitMiddleware,
          serializeState,
          deserializeState: ({
            state: {
              rateLimitContext: rateLimiteContextFromState,
              timestamp: timestampFromState,
            },
          }) => {
            if (rateLimiteContextFromState) {
              rateLimitContext = rateLimiteContextFromState;
            }
            log((l) =>
              l.debug('Rate limiter state restored', {
                context: rateLimitContext,
                age: Date.now() - (timestampFromState || 0),
              }),
            );
            return Promise.resolve();
          },
        },
      },
    ) as RetryRateLimitMiddlewareType;

  // Add the rateLimitContext method to the stateful middleware
  statefulMiddleware.rateLimitContext = () => ({ ...rateLimitContext });

  return statefulMiddleware;
};
