import type {
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { getRedisClient } from './redis-client';
import { getCacheConfig, validateCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { createCacheKey } from './cacheKeys';
import type { CacheableResponse } from './types';
import { handleCacheHit, handleCacheMiss } from './cacheEventHandlers';
import { createStreamFromCachedText } from './streamUtils';
import { handleResponseCaching } from './cacheStrategy';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { newUuid } from '@/lib/typescript/_record-decorators';
import { MiddlewareStateManager } from '../state-management';

// Enterprise configuration and metrics
const config = getCacheConfig();
validateCacheConfig(config);

/**
 * Enterprise-grade Redis caching middleware for AI language models (Original Implementation)
 * - Configurable via environment variables
 * - Comprehensive metrics collection
 * - Caches successful responses immediately
 * - Uses "cache jail" for problematic responses (content-filter, other, warnings)
 * - Promotes jailed responses to cache after configurable threshold
 * - Never caches error responses
 */
const originalCacheWithRedis: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params, model }) => {
    const cacheKey = createCacheKey(params, model?.modelId);

    try {
      if (cacheKey.length === 0) {
        throw new Error('Cache key is empty, cannot proceed with caching.');
      }
      const redis = await getRedisClient();

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        handleCacheHit(cacheKey, parsed);
        return parsed as Awaited<ReturnType<typeof doGenerate>>;
      }

      handleCacheMiss(cacheKey);

      // Generate new response
      const result = await doGenerate();

      // Handle caching strategy
      await handleResponseCaching(redis, cacheKey, {
        ...result,
        id: newUuid(),
      });

      return result;
    } catch (error) {
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
      if (cacheKey.length === 0) {
        throw new Error('Cache key is empty, cannot proceed with caching.');
      }
      const redis = await getRedisClient();

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        handleCacheHit(cacheKey, parsed, 'Stream ');

        // Convert cached text back to a stream
        const cachedStream = createStreamFromCachedText(parsed);

        return {
          stream: cachedStream,
          warnings: parsed.warnings,
          rawCall: parsed.rawCall,
          rawResponse: parsed.rawResponse,
        };
      }

      handleCacheMiss(cacheKey, 'Stream ');

      // Generate new stream
      const { stream, ...rest } = await doStream();

      let generatedText = '';
      let finishReason = 'stop';
      let usage: Record<string, unknown> | undefined = undefined;

      const cacheStream = new TransformStream<
        LanguageModelV2StreamPart,
        LanguageModelV2StreamPart
      >({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            generatedText += chunk.delta;
          } else if ('text' in chunk) {
            generatedText += chunk.text;
          } else if (chunk.type === 'finish') {
            finishReason = chunk.finishReason;
            usage = chunk.usage;
          }

          controller.enqueue(chunk);
        },

        async flush() {
          // Create response object for caching logic
          const streamResponse: CacheableResponse = {
            id: newUuid(),
            content: [{ type: 'text', text: generatedText }],
            finishReason,
            usage,
            rawResponse: (rest.response as Record<string, unknown>).body,
          };

          // Handle caching strategy for streaming response
          await handleResponseCaching(
            redis,
            cacheKey,
            streamResponse,
            'stream ',
          );
        },
      });

      return {
        stream: stream.pipeThrough(cacheStream),
        ...rest,
      };
    } catch (error) {
      if (config.enableMetrics) {
        metricsCollector.recordError(cacheKey, String(error));
      }
      if (config.enableLogging) {
        console.error('Redis cache error in wrapStream:', error);
      }
      return await doStream();
    }
  },
};

/**
 * Cache with Redis Middleware with State Management Support
 *
 * This middleware supports the state management protocol and can participate
 * in state collection and restoration operations.
 */
export const cacheWithRedis =
  MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'cache-with-redis',
    middleware: originalCacheWithRedis,
  });
