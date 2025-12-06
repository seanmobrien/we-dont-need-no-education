/**
 * @fileoverview Main cache strategy orchestrator.
 * Determines how to handle responses based on their classification (successful, problematic, etc.).
 */

import type { CacheableResponse } from './types';
import type { getRedisClient } from '../../../redis-client';

declare module '@/lib/ai/middleware/cacheWithRedis/cacheStrategy' {
  /**
   * Handles the caching strategy for any response based on its classification.
   * - Successful responses are cached normally.
   * - Problematic responses are sent to the cache jail.
   * - Other responses are ignored with a warning log.
   *
   * @param redis - The Redis client instance.
   * @param cacheKey - The cache key for the response.
   * @param response - The AI response to process.
   * @param context - Optional context string for logging.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  export const handleResponseCaching: (
    redis: Awaited<ReturnType<typeof getRedisClient>>,
    cacheKey: string,
    response: CacheableResponse,
    context?: string,
  ) => Promise<void>;
}
