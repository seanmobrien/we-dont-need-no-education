/**
 * Enterprise-grade configuration for AI caching middleware
 * Supports environment variables with sensible defaults
 */

export interface CacheConfig {
  /** Cache TTL in seconds (default: 24 hours) */
  cacheTtl: number;
  /** Cache jail threshold - number of occurrences before promotion (default: 3) */
  jailThreshold: number;
  /** Cache jail TTL in seconds (default: 24 hours) */
  jailTtl: number;
  /** Stream chunk size for cached responses (default: 5 characters) */
  streamChunkSize: number;
  /** Enable detailed logging (default: true) */
  enableLogging: boolean;
  /** Enable metrics collection (default: true) */
  enableMetrics: boolean;
  /** Cache key prefix (default: 'ai-cache') */
  cacheKeyPrefix: string;
  /** Jail key prefix (default: 'ai-jail') */
  jailKeyPrefix: string;
  /** Maximum cache key length for logging (default: 20) */
  maxKeyLogLength: number;
}

/**
 * Parse environment variable as integer with fallback
 */
function parseIntEnv(envVar: string | undefined, defaultValue: number): number {
  if (!envVar) return defaultValue;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean with fallback
 */
function parseBoolEnv(
  envVar: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!envVar) return defaultValue;
  return envVar.toLowerCase() === 'true' || envVar === '1';
}

/**
 * Get cache configuration from environment variables with defaults
 */
export function getCacheConfig(): CacheConfig {
  return {
    cacheTtl: parseIntEnv(process.env.AI_CACHE_TTL, 86400), // 24 hours
    jailThreshold: parseIntEnv(process.env.AI_CACHE_JAIL_THRESHOLD, 3),
    jailTtl: parseIntEnv(process.env.AI_CACHE_JAIL_TTL, 86400), // 24 hours
    streamChunkSize: parseIntEnv(process.env.AI_CACHE_STREAM_CHUNK_SIZE, 5),
    enableLogging: parseBoolEnv(process.env.AI_CACHE_ENABLE_LOGGING, true),
    enableMetrics: parseBoolEnv(process.env.AI_CACHE_ENABLE_METRICS, true),
    cacheKeyPrefix: process.env.AI_CACHE_KEY_PREFIX || 'ai-cache',
    jailKeyPrefix: process.env.AI_CACHE_JAIL_KEY_PREFIX || 'ai-jail',
    maxKeyLogLength: parseIntEnv(process.env.AI_CACHE_MAX_KEY_LOG_LENGTH, 20),
  };
}

/**
 * Validate cache configuration
 */
export function validateCacheConfig(config: CacheConfig): void {
  if (config.cacheTtl <= 0) {
    throw new Error('Cache TTL must be positive');
  }
  if (config.jailThreshold <= 0) {
    throw new Error('Jail threshold must be positive');
  }
  if (config.jailTtl <= 0) {
    throw new Error('Jail TTL must be positive');
  }
  if (config.streamChunkSize <= 0) {
    throw new Error('Stream chunk size must be positive');
  }
  if (config.maxKeyLogLength <= 0) {
    throw new Error('Max key log length must be positive');
  }
}
