/**
 * @fileoverview Cache operations utilities for Redis middleware.
 * Handles storing successful responses and managing the cache jail for problematic responses.
 */

import type { CacheableResponse } from './types';
import type { getRedisClient } from '@compliance-theater/redis';

declare module '@/lib/ai/middleware/cacheWithRedis/cacheOperations' {
  /**
   * Handles caching of a successful response.
   * Stores the response content and metadata in Redis with the configured TTL.
   * Also records metrics and logs the operation if enabled.
   *
   * @param redis - The Redis client instance.
   * @param cacheKey - The cache key to store the response under.
   * @param response - The response object to cache.
   * @param context - Optional context string for logging (e.g., "stream ", "completion ").
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  export const cacheSuccessfulResponse: (
    redis: Awaited<ReturnType<typeof getRedisClient>>,
    cacheKey: string,
    response: CacheableResponse,
    context?: string,
  ) => Promise<void>;

  /**
   * Handles cache jail logic for problematic responses.
   * Increments the failure count for the given cache key. If the count exceeds the threshold,
   * the response is "promoted" to the cache (jailed) to prevent further failures.
   *
   * @param redis - The Redis client instance.
   * @param cacheKey - The cache key associated with the problematic response.
   * @param response - The problematic response object.
   * @param context - Optional context string for logging.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  export const handleCacheJail: (
    redis: Awaited<ReturnType<typeof getRedisClient>>,
    cacheKey: string,
    response: CacheableResponse,
    context?: string,
  ) => Promise<void>;
}
