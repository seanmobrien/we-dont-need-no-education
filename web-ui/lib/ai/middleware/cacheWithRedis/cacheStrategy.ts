/**
 * @fileoverview Main cache strategy orchestrator
 */

import type { CacheableResponse } from './types';
import {
  isSuccessfulResponse,
  isProblematicResponse,
} from './responseClassifiers';
import { cacheSuccessfulResponse, handleCacheJail } from './cacheOperations';
import { getCacheConfig } from './config';
import type { getRedisClient } from './redis-client';
import { log } from '@/lib/logger';

const config = getCacheConfig();

/**
 * Handles the caching strategy for any response based on its classification
 *
 * @param redis - Redis client instance
 * @param cacheKey - The cache key for the response
 * @param response - The AI response to process
 * @param context - Optional context string for logging
 */
export const handleResponseCaching = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = '',
): Promise<void> => {
  const isSuccessful = isSuccessfulResponse(response);
  const isProblematic = isProblematicResponse(response);

  if (isSuccessful) {
    await cacheSuccessfulResponse(redis, cacheKey, response, context);
  } else if (isProblematic) {
    await handleCacheJail(redis, cacheKey, response, context);
  } else {
    // Log why we're not caching
    if (config.enableLogging) {
      log(l => l.warn(
        `❌ Not caching ${context}response (finishReason: ${response.finishReason}, hasText: ${!!(response.content && response.content.length > 0)}) for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`,
      ));
    }
  }
};
