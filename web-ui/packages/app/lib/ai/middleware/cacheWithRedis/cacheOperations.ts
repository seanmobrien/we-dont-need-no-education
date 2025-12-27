import type { CacheableResponse, JailEntry } from './types';
import { getCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { createJailKey } from './cacheKeys';
import type { getRedisClient } from '@/lib/redis-client';
import { log } from '@repo/lib-logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { LanguageModelV2Content } from '@ai-sdk/provider';

const config = getCacheConfig();

export const cacheSuccessfulResponse = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = '',
): Promise<void> => {
  const extractText = (content: Array<LanguageModelV2Content>) => {
    return content
      .map((item) => (item.type === 'text' ? item.text : ''))
      .filter((text) => text.length > 0)
      .join(' ');
  };
  try {
    const extractedText = extractText(response.content);

    await redis.setEx(
      cacheKey,
      config.cacheTtl,
      JSON.stringify({
        text: extractedText,
        finishReason: response.finishReason,
        usage: response.usage,
        warnings: response.warnings,
        rawCall: response.rawCall,
        rawResponse: response.rawResponse,
        response: response.response,
      }),
    );

    const responseSize = extractedText?.length || 0;

    // Record metrics
    if (config.enableMetrics) {
      metricsCollector.recordStore(cacheKey, responseSize);
    }

    if (config.enableLogging) {
      log((l) =>
        l.verbose(
          `💾 Cached successful ${context}response for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
        ),
      );
    }
  } catch (cacheStoreError) {
    if (config.enableMetrics) {
      metricsCollector.recordError(cacheKey, String(cacheStoreError));
    }
    if (config.enableLogging) {
      LoggedError.isTurtlesAllTheWayDownBaby(cacheStoreError, {
        message: `Error storing ${context}response in cache`,
        data: {
          cacheKey,
        },
        source: 'cacheWithRedis',
        log: true,
      });
    }
  }
};

export const handleCacheJail = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = '',
): Promise<void> => {
  const jailKey = createJailKey(cacheKey);
  debugger;

  try {
    // Get current jail data
    const jailData = await redis.get(jailKey);
    const jailEntry: JailEntry = jailData
      ? JSON.parse(jailData)
      : { count: 0, firstSeen: Date.now() };

    // Increment count
    jailEntry.count += 1;
    jailEntry.lastSeen = Date.now();
    jailEntry.lastResponse = {
      finishReason: response.finishReason || 'unknown',
      hasWarnings: !!(response.warnings && response.warnings.length > 0),
      textLength:
        response.content?.reduce(
          (acc, part) => acc + (part.type === 'text' ? part.text.length : 0),
          0,
        ) || 0,
    };

    // Store updated jail entry
    await redis.setEx(jailKey, config.jailTtl, JSON.stringify(jailEntry));

    // Record metrics
    if (config.enableMetrics) {
      metricsCollector.recordJailUpdate(
        cacheKey,
        jailEntry.count,
        config.jailThreshold,
      );
    }

    if (config.enableLogging) {
      log((l) =>
        l.verbose(
          `🏪 ${context}cache jail updated for key ${cacheKey.substring(0, config.maxKeyLogLength)}... (count: ${jailEntry.count}/${config.jailThreshold})`,
        ),
      );
    }

    // Check if we've hit the threshold
    if (jailEntry.count >= config.jailThreshold) {
      if (config.enableLogging) {
        log((l) =>
          l.verbose(
            `🔓 ${context}cache jail threshold reached for key ${cacheKey.substring(0, config.maxKeyLogLength)}... - promoting to cache`,
          ),
        );
      }

      // Promote to cache
      await cacheSuccessfulResponse(
        redis,
        cacheKey,
        response,
        `${context}problematic `,
      );

      // Record promotion metrics
      if (config.enableMetrics) {
        const responseSize =
          response.content?.reduce(
            (acc, part) => acc + (part.type === 'text' ? part.text.length : 0),
            0,
          ) || 0;
        metricsCollector.recordJailPromotion(cacheKey, responseSize);
      }
    }
  } catch (jailError) {
    if (config.enableMetrics) {
      metricsCollector.recordError(cacheKey, String(jailError));
    }
    if (config.enableLogging) {
      LoggedError.isTurtlesAllTheWayDownBaby(jailError, {
        log: true,
        source: 'cacheWithRedis',
      });
    }
  }
};
