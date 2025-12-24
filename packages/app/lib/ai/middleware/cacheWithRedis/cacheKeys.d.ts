/**
 * @fileoverview Cache key generation utilities for the AI caching middleware.
 * Handles normalization and hashing of complex objects to ensure consistent keys.
 */

declare module '@/lib/ai/middleware/cacheWithRedis/cacheKeys' {
  /**
   * Creates a unique cache key from parameters and model information.
   * Handles complex objects, arrays, and other types by normalizing and hashing them.
   *
   * @param params - The parameters object (e.g., prompt, messages, options).
   * @param modelId - The ID of the model being used (optional).
   * @returns {string} A unique cache key string.
   */
  export const createCacheKey: (
    params: Record<string, unknown>,
    modelId?: string,
  ) => string;

  /**
   * Creates a jail key for tracking problematic responses.
   * The jail key is derived from the cache key but stored separately.
   *
   * @param cacheKey - The original cache key.
   * @returns {string} A unique jail key string.
   */
  export const createJailKey: (cacheKey: string) => string;
}
