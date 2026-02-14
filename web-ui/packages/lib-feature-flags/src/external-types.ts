/**
 * External type definitions for dependencies that are still in the app package.
 * These types are copied here to allow the package to build independently.
 * In the future, these should be refactored into proper packages or made injectable.
 */

/**
 * AI Provider types - from @/components/ai/chat-panel/types
 */
export type AiProvider = 'azure' | 'google' | 'openai';

/**
 * Model types available across providers - from @/components/ai/chat-panel/types
 */
export type ModelType = 'lofi' | 'hifi' | 'reasoning-medium' | 'reasoning-high';

/**
 * Storage strategy configuration - from @/lib/ai/tools/todo/storage/types
 */
export interface StorageStrategyConfig {
  /**
   * Time-to-live for cached entries (Redis only), in seconds
   */
  ttl?: number;
  /**
   * Key prefix for storage keys (Redis only)
   */
  keyPrefix?: string;
  /**
   * Enable fallback to in-memory storage if Redis is unavailable
   */
  enableFallback?: boolean;
}

/**
 * Base configuration settings for cached data - from @/lib/react-util/types
 */
export type CacheConfig = {
  /**
   * Time-to-live for cached entries, in seconds
   */
  ttl?: number;
};

/**
 * Redis cache configuration - from @/lib/react-util/types
 */
export type RedisCacheConfig = CacheConfig & {
  /**
   * Key prefix for storage keys (Redis only)
   */
  keyPrefix?: string;
};

/**
 * LRU cache configuration - from @/lib/react-util/types
 */
export type LruCacheConfig = CacheConfig & {
  max?: number;
};
