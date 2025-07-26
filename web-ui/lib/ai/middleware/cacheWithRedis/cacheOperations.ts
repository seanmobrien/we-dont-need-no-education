/**
 * @fileoverview Cache operations utilities for Redis middleware
 */

import type { CacheableResponse, JailEntry } from './types';
import { getCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { createJailKey } from './cacheKeys';
import type { getRedisClient } from './redis-client';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';

const config = getCacheConfig();

/**
 * Handles caching of a successful response
 *
 * @param redis - Redis client instance
 * @param cacheKey - The cache key to store under
 * @param response - The response to cache
 * @param context - Optional context string for logging
 */
export const cacheSuccessfulResponse = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = '',
): Promise<void> => {
  try {
    await redis.setEx(
      cacheKey,
      config.cacheTtl,
      JSON.stringify({
        text: response.text,
        finishReason: response.finishReason,
        usage: response.usage,
        warnings: response.warnings,
        rawCall: response.rawCall,
        rawResponse: response.rawResponse,
        response: response.response,
      }),
    );

    const responseSize = response.text?.length || 0;

    // Record metrics
    if (config.enableMetrics) {
      metricsCollector.recordStore(cacheKey, responseSize);
    }

    if (config.enableLogging) {
      log( l => l.verbose(
        `💾 Cached successful ${context}response for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
      ));
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

/**
 * Handles cache jail logic for problematic responses
 *
 * @param redis - Redis client instance
 * @param cacheKey - The cache key for the response
 * @param response - The problematic response
 * @param context - Optional context string for logging
 */
export const handleCacheJail = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = '',
): Promise<void> => {
  const jailKey = createJailKey(cacheKey);

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
      textLength: response.text?.length || 0,
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
      log(l => l.verbose(
        `🏪 ${context}cache jail updated for key ${cacheKey.substring(0, config.maxKeyLogLength)}... (count: ${jailEntry.count}/${config.jailThreshold})`,
      ));
    }

    // Check if we've hit the threshold
    if (jailEntry.count >= config.jailThreshold) {
      if (config.enableLogging) {
      log(l => l.verbose(        
          `🔓 ${context}cache jail threshold reached for key ${cacheKey.substring(0, config.maxKeyLogLength)}... - promoting to cache`,
        ));
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
        const responseSize = response.text?.length || 0;
        metricsCollector.recordJailPromotion(cacheKey, responseSize);
      }
    }
  } catch (jailError) {
    if (config.enableMetrics) {
      metricsCollector.recordError(cacheKey, String(jailError));
    }
    if (config.enableLogging) {
      console.error(`Error managing ${context}cache jail:`, jailError);
    }
  }
};
