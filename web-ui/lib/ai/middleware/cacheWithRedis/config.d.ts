/**
 * @fileoverview Enterprise-grade configuration for AI caching middleware.
 * Supports environment variables with sensible defaults.
 */

declare module '@/lib/ai/middleware/cacheWithRedis/config' {
  /**
   * Configuration interface for the AI caching middleware.
   */
  export interface CacheConfig {
    /**
     * Cache Time-To-Live (TTL) in seconds.
     * Determines how long a successful response remains in the cache.
     * Default: 24 hours (86400 seconds).
     */
    cacheTtl: number;

    /**
     * Cache jail threshold.
     * The number of times a problematic request must occur before it is "jailed" (cached as a failure).
     * Default: 3.
     */
    jailThreshold: number;

    /**
     * Cache jail Time-To-Live (TTL) in seconds.
     * Determines how long a request remains in the jail.
     * Default: 24 hours (86400 seconds).
     */
    jailTtl: number;

    /**
     * Stream chunk size for cached responses.
     * The number of characters per chunk when streaming a cached response.
     * Default: 5 characters.
     */
    streamChunkSize: number;

    /**
     * Enable detailed logging.
     * If true, the middleware will log cache hits, misses, and other events.
     * Default: true.
     */
    enableLogging: boolean;

    /**
     * Enable metrics collection.
     * If true, the middleware will collect and report performance metrics.
     * Default: true.
     */
    enableMetrics: boolean;

    /**
     * Cache key prefix.
     * A string prepended to all cache keys to avoid collisions.
     * Default: 'ai-cache'.
     */
    cacheKeyPrefix: string;

    /**
     * Jail key prefix.
     * A string prepended to all jail keys to avoid collisions.
     * Default: 'ai-jail'.
     */
    jailKeyPrefix: string;

    /**
     * Maximum cache key length for logging.
     * Truncates long keys in logs to keep them readable.
     * Default: 20.
     */
    maxKeyLogLength: number;
  }

  /**
   * Retrieves the cache configuration from environment variables, applying sensible defaults.
   *
   * @returns {CacheConfig} The fully resolved cache configuration object.
   */
  export function getCacheConfig(): CacheConfig;

  /**
   * Validates the provided cache configuration object.
   * Throws an error if any configuration values are invalid (e.g., negative TTLs).
   *
   * @param {CacheConfig} config - The configuration object to validate.
   * @throws {Error} If any configuration property is invalid.
   */
  export function validateCacheConfig(config: CacheConfig): void;
}
