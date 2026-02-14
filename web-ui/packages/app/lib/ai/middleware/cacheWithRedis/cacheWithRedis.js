import { getRedisClient } from '@compliance-theater/redis';
import { getCacheConfig, validateCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { createCacheKey } from './cacheKeys';
import { handleCacheHit, handleCacheMiss } from './cacheEventHandlers';
import { createStreamFromCachedText } from './streamUtils';
import { handleResponseCaching } from './cacheStrategy';
import { LoggedError, log } from '@compliance-theater/logger';
import { newUuid } from '@compliance-theater/typescript';
import { MiddlewareStateManager } from '../state-management';
const config = getCacheConfig();
validateCacheConfig(config);
const originalCacheWithRedis = {
    wrapGenerate: async ({ doGenerate, params, model }) => {
        const cacheKey = createCacheKey(params, model?.modelId);
        try {
            if (cacheKey.length === 0) {
                throw new Error('Cache key is empty, cannot proceed with caching.');
            }
            const redis = await getRedisClient();
            const cachedResponse = await redis.get(cacheKey);
            if (cachedResponse) {
                const parsed = JSON.parse(cachedResponse);
                handleCacheHit(cacheKey, parsed);
                return parsed;
            }
            handleCacheMiss(cacheKey);
            const result = await doGenerate();
            await handleResponseCaching(redis, cacheKey, {
                ...result,
                id: newUuid(),
            });
            return result;
        }
        catch (error) {
            if (config.enableMetrics) {
                metricsCollector.recordError(cacheKey, String(error));
            }
            if (config.enableLogging) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                });
            }
            return await doGenerate();
        }
    },
    wrapStream: async ({ doStream, params, model }) => {
        const cacheKey = createCacheKey(params, model?.modelId);
        try {
            log((l) => l.verbose('=== Cache with redis stream start ==='));
            if (cacheKey.length === 0) {
                throw new Error('Cache key is empty, cannot proceed with caching.');
            }
            const redis = await getRedisClient();
            const cachedResponse = await redis.get(cacheKey);
            if (cachedResponse) {
                const parsed = JSON.parse(cachedResponse);
                handleCacheHit(cacheKey, parsed, 'Stream ');
                const cachedStream = createStreamFromCachedText(parsed);
                return {
                    stream: cachedStream,
                    warnings: parsed.warnings,
                    rawCall: parsed.rawCall,
                    rawResponse: parsed.rawResponse,
                };
            }
            handleCacheMiss(cacheKey, 'Stream ');
            const { stream, ...rest } = await doStream();
            let generatedText = '';
            let finishReason = 'stop';
            let usage = undefined;
            const cacheStream = new TransformStream({
                transform(chunk, controller) {
                    if (chunk.type === 'text-delta') {
                        generatedText += chunk.delta;
                    }
                    else if ('text' in chunk) {
                        generatedText += chunk.text;
                    }
                    else if (chunk.type === 'finish') {
                        finishReason = chunk.finishReason;
                        usage = chunk.usage;
                    }
                    controller.enqueue(chunk);
                },
                async flush() {
                    const streamResponse = {
                        id: newUuid(),
                        content: [{ type: 'text', text: generatedText }],
                        finishReason,
                        usage,
                        rawResponse: rest.response.body,
                    };
                    await handleResponseCaching(redis, cacheKey, streamResponse, 'stream ');
                },
            });
            return {
                stream: stream.pipeThrough(cacheStream),
                ...rest,
            };
        }
        catch (error) {
            if (config.enableMetrics) {
                metricsCollector.recordError(cacheKey, String(error));
            }
            if (config.enableLogging) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'cacheWithRedis',
                });
            }
            return await doStream();
        }
        finally {
            log((l) => l.verbose('=== Cache with redis stream end ==='));
        }
    },
};
export const cacheWithRedis = MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'cache-with-redis',
    middleware: originalCacheWithRedis,
});
//# sourceMappingURL=cacheWithRedis.js.map