/**
 * Base configuration settings for cached data
 */
export type CacheConfig = {
  /**
   * Time-to-live for cached entries, in seconds
   */
  ttl?: number;


};

export type RedisCacheConfig = CacheConfig & {
  /**
   * Key prefix for storage keys (Redis only)
   */
  keyPrefix?: string;
};

/**
 * Extends {@link CacheConfig} with LRU-specific settings
 */
export type LruCacheConfig = CacheConfig & {
  max?: number;
};
