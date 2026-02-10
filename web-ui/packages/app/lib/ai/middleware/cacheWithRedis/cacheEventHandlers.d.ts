/**
 * @fileoverview Cache event handlers for hit/miss scenarios and metrics.
 * Handles logging and metric recording for cache hits and misses.
 */

import type { CacheableResponse } from './types';

declare module '@/lib/ai/middleware/cacheWithRedis/cacheEventHandlers' {
  /**
   * Handles cache hit logic with metrics and logging.
   * Records a cache hit metric, calculates response size, and logs the event if enabled.
   * Also attempts to fix up timestamps and IDs in the cached response if they are missing or invalid.
   *
   * @param cacheKey - The cache key that was hit.
   * @param parsed - The parsed cached response object.
   * @param context - Optional context string for logging (e.g., "Stream ").
   */
  export const handleCacheHit: (
    cacheKey: string,
    parsed: CacheableResponse,
    context?: string,
  ) => void;

  /**
   * Handles cache miss logic with metrics and logging.
   * Records a cache miss metric and logs the event if enabled.
   *
   * @param cacheKey - The cache key that was missed.
   * @param context - Optional context string for logging.
   */
  export const handleCacheMiss: (cacheKey: string, context?: string) => void;
}
