import { getRetryErrorInfo } from '@/lib/ai/chat';
import { isModelAvailable, getModelAvailabilityStatus, } from '@/lib/ai/aiModelFactory';
import { rateLimitMetrics } from './metrics';
import { log, LoggedError } from '@compliance-theater/logger';
import { checkModelAvailabilityAndFallback } from './model-availability';
import { handleRateLimitError, disableModelFromRateLimit, } from './rate-limit-handler';
import { recordRequestMetrics, getCurrentProvider, constructModelKey, } from './metrics-utils';
import { ModelMap } from '../../services/model-stats/model-map';
import { MiddlewareStateManager } from '../state-management';
const getModelClassification = async ({ model = 'unknown', } = {}) => {
    return await (await ModelMap.getInstance())
        .normalizeProviderModel(model)
        .then((x) => x.classification);
};
const getFailoverConfig = (currentProvider) => {
    const primaryProvider = currentProvider.includes('azure')
        ? 'azure'
        : 'google';
    const fallbackProvider = primaryProvider === 'azure' ? 'google' : 'azure';
    return {
        primaryProvider,
        fallbackProvider,
    };
};
export const retryRateLimitMiddlewareFactory = async (factoryOptions) => {
    let rateLimitContext = await (async () => {
        if ('modelClass' in factoryOptions) {
            return factoryOptions;
        }
        const { model } = factoryOptions;
        if (!model) {
            throw new Error('Model is required to create rate limit context');
        }
        const normalModel = await (await ModelMap.getInstance()).normalizeProviderModel(model);
        const modelClass = await getModelClassification({
            model: normalModel.modelId,
        });
        const { primaryProvider, fallbackProvider } = getFailoverConfig(normalModel.provider);
        return {
            modelClass,
            failover: {
                primaryProvider,
                fallbackProvider,
            },
        };
    })();
    const originalRetryRateLimitMiddleware = {
        rateLimitContext: () => ({ ...rateLimitContext }),
        wrapGenerate: async ({ doGenerate, params }) => {
            const startTime = Date.now();
            const modelClassification = rateLimitContext.modelClass;
            log((l) => l.info('Advanced rate limit middleware - doGenerate called'));
            log((l) => l.info(`Model classification: ${modelClassification}`));
            const currentProvider = getCurrentProvider();
            const currentModelKey = constructModelKey(currentProvider, modelClassification);
            try {
                await checkModelAvailabilityAndFallback(currentModelKey, modelClassification, rateLimitContext.failover, {
                    ...params,
                    ...{
                        chatId: 'unassigned',
                        turnId: '1',
                        ...(params?.providerOptions?.backoffice ?? {}),
                    },
                });
            }
            catch (error) {
                throw error;
            }
            try {
                const result = await doGenerate();
                recordRequestMetrics(startTime, modelClassification, 'generate');
                return result;
            }
            catch (error) {
                recordRequestMetrics(startTime, modelClassification, 'generate');
                await handleRateLimitError(error, currentModelKey, modelClassification, rateLimitContext.failover, {
                    ...params,
                    ...{
                        chatId: 'unassigned',
                        turnId: '1',
                        ...(params?.providerOptions?.backoffice ?? {}),
                    },
                }, 'generate');
                throw error;
            }
        },
        wrapStream: async ({ doStream, params, model }) => {
            const startTime = Date.now();
            try {
                const modelClassification = await getModelClassification({ model });
                log((l) => l.verbose(`=== RetryRateLimitMiddleware - doStream called - Model classification: ${modelClassification} ===`));
                const currentProvider = getCurrentProvider();
                const currentModelKey = constructModelKey(currentProvider, modelClassification);
                try {
                    await checkModelAvailabilityAndFallback(currentModelKey, modelClassification, getFailoverConfig(currentProvider), {
                        ...params,
                        ...{
                            chatId: 'unassigned',
                            turnId: '1',
                            ...(params?.providerOptions?.backoffice ?? {}),
                        },
                    });
                }
                catch (error) {
                    throw error;
                }
                try {
                    const { stream, ...rest } = await doStream();
                    let generatedText = '';
                    let hasError = false;
                    const transformStream = new TransformStream({
                        transform(chunk, controller) {
                            if (chunk.type === 'text-delta') {
                                generatedText += chunk.delta;
                            }
                            if (chunk.type === 'error') {
                                hasError = true;
                                const rateLimitErrorInfo = getRetryErrorInfo(chunk.error);
                                if (rateLimitErrorInfo?.isRetry &&
                                    rateLimitErrorInfo.retryAfter) {
                                    log((l) => l.info(`Stream rate limit detected: ${rateLimitErrorInfo.retryAfter}s`));
                                    disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);
                                    rateLimitMetrics.recordError('stream_rate_limit', modelClassification);
                                }
                            }
                            controller.enqueue(chunk);
                        },
                        flush() {
                            recordRequestMetrics(startTime, modelClassification, 'stream');
                            if (!hasError) {
                                log((l) => l.info('doStream finished successfully'));
                                log((l) => l.info(`Generated text length: ${generatedText.length}`));
                            }
                        },
                    });
                    return {
                        stream: stream.pipeThrough(transformStream),
                        ...rest,
                    };
                }
                catch (error) {
                    recordRequestMetrics(startTime, modelClassification, 'stream');
                    await handleRateLimitError(error, currentModelKey, modelClassification, getFailoverConfig(currentProvider), params, 'stream_setup');
                    throw error;
                }
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    source: 'rateLimitMiddleware',
                    log: true,
                });
            }
            finally {
                log((l) => l.verbose('=== RetryRateLimitMiddleware - doStream finished ==='));
            }
        },
        transformParams: async ({ params }) => {
            const modelClassification = rateLimitContext.modelClass;
            const currentProvider = rateLimitContext.failover?.primaryProvider ?? 'azure';
            const currentModelKey = `${currentProvider}:${modelClassification}`;
            const availabilityStatus = getModelAvailabilityStatus();
            log((l) => l.verbose('Model availability status:', availabilityStatus));
            if (!isModelAvailable(currentModelKey)) {
                log((l) => l.warn(`Requested model ${currentModelKey} is not available`));
            }
            return {
                ...params,
            };
        },
    };
    const serializeState = async () => {
        return Promise.resolve({
            rateLimitContext,
            timestamp: Date.now(),
        });
    };
    const statefulMiddleware = MiddlewareStateManager.Instance.statefulMiddlewareWrapper({
        middlewareId: 'retry-rate-limiter',
        middleware: {
            ...originalRetryRateLimitMiddleware,
            serializeState,
            deserializeState: ({ state: { rateLimitContext: rateLimiteContextFromState, timestamp: timestampFromState, }, }) => {
                if (rateLimiteContextFromState) {
                    rateLimitContext = rateLimiteContextFromState;
                }
                log((l) => l.debug('Rate limiter state restored', {
                    context: rateLimitContext,
                    age: Date.now() - (timestampFromState || 0),
                }));
                return Promise.resolve();
            },
        },
    });
    statefulMiddleware.rateLimitContext = () => ({ ...rateLimitContext });
    return statefulMiddleware;
};
//# sourceMappingURL=middleware.js.map