/**
 * @fileoverview MCP (Model Context Protocol) Tool Cache System
 *
 * This module provides a sophisticated caching layer for MCP tools and their metadata,
 * implementing a two-tier caching strategy with Redis as the primary cache and an
 * in-memory fallback for high availability. The cache system reduces latency and load
 * on MCP servers by storing tool definitions, capabilities, and provider metadata.
 *
 * ## Architecture
 *
 * - **Primary Cache (Redis)**: Distributed, persistent cache shared across instances
 * - **Secondary Cache (Memory)**: Fast, in-process fallback when Redis is unavailable
 * - **Automatic Failover**: Seamlessly falls back to memory cache on Redis errors
 * - **TTL Management**: Configurable time-to-live for cache entries
 * - **User-Specific Caching**: Per-user tool provider caching with LRU eviction
 *
 * ## Key Features
 *
 * - Schema-aware serialization for type-safe cache operations
 * - Automatic cache invalidation and cleanup
 * - Health monitoring and statistics tracking
 * - Cache warming for common configurations
 * - Admin utilities for cache management
 *
 * @example
 * ```typescript
 * import { getToolCache, MCPToolCacheAdmin } from '@/ai/mcp/cache';
 *
 * // Get cached tools
 * const cache = getToolCache();
 * const tools = await cache.getCachedTools({
 *   url: 'http://localhost:3000',
 *   allowWrite: false
 * });
 *
 * if (!tools) {
 *   // Cache miss - fetch from MCP server
 *   const freshTools = await fetchFromMCPServer();
 *   await cache.setCachedTools(options, freshTools);
 * }
 *
 * // Monitor cache health
 * const health = await MCPToolCacheAdmin.healthCheck();
 * console.log('Cache healthy:', health.healthy);
 * ```
 *
 * @module @/ai/mcp/cache
 */

import type { ToolSet } from 'ai';
import type {
  ToolProviderFactoryOptions,
  UserToolProviderCache,
} from '../types';

declare module '@/ai/mcp/cache' {
  /**
   * Configuration options for cache behavior and storage limits.
   *
   * These options control cache TTL, memory limits, and key prefixing for
   * namespace isolation in shared Redis instances.
   *
   * @example
   * ```typescript
   * const config = {
   *   defaultTtl: 3600000,      // 1 hour in milliseconds
   *   maxMemoryEntries: 100,    // Maximum entries in memory cache
   *   keyPrefix: 'mcp:tools:'   // Redis key prefix
   * };
   * ```
   */
  export type ToolCacheConfig = {
    /**
     * Default time-to-live for cache entries in milliseconds.
     *
     * Entries older than this will be considered stale and refreshed
     * on next access.
     *
     * @default 3600000 (1 hour)
     */
    defaultTtl: number;

    /**
     * Maximum number of entries to store in the memory cache.
     *
     * When this limit is exceeded, the least recently used entries
     * are evicted. Does not affect Redis cache.
     *
     * @default 100
     */
    maxMemoryEntries: number;

    /**
     * Prefix for Redis keys to avoid collisions in shared instances.
     *
     * All Redis keys will be prefixed with this string followed by
     * a colon (e.g., 'mcp:tools:key-name').
     *
     * @default 'mcp:tools:'
     */
    keyPrefix: string;
  };

  /**
   * Statistics about cache usage and performance.
   *
   * Provides insights into cache effectiveness, memory usage, and
   * hit rates for optimization and monitoring.
   */
  export type CacheStats = {
    /**
     * Current number of entries in the memory cache.
     */
    memorySize: number;

    /**
     * Number of keys stored in Redis cache.
     *
     * May be 0 if Redis is unavailable or not configured.
     */
    redisKeys: number;

    /**
     * Cache hit rate as a percentage (0-100).
     *
     * Calculated as (hits / (hits + misses)) * 100.
     * Only available if hit/miss tracking is enabled.
     */
    hitRate?: number;
  };

  /**
   * Comprehensive MCP Tool Cache with Redis primary and memory fallback.
   *
   * This class implements a resilient two-tier caching strategy for MCP tools,
   * providing high availability and performance. It automatically handles
   * failover between Redis and memory caching, ensuring consistent operation
   * even when Redis is unavailable.
   *
   * ## Caching Strategy
   *
   * 1. **Read Path**: Check Redis → Check Memory → Return null (cache miss)
   * 2. **Write Path**: Write to Redis → Write to Memory (on Redis failure)
   * 3. **Invalidation**: Clear from both Redis and Memory
   *
   * ## Cache Keys
   *
   * Cache keys are generated from `ToolProviderFactoryOptions` including:
   * - MCP server URL
   * - Write permissions
   * - User identity (if applicable)
   *
   * @example
   * ```typescript
   * const cache = new MCPToolCache({
   *   defaultTtl: 3600000,
   *   maxMemoryEntries: 50,
   *   keyPrefix: 'mcp:prod:'
   * });
   *
   * // Cache tools
   * await cache.setCachedTools(
   *   { url: 'http://localhost:3000', allowWrite: false },
   *   toolSet,
   *   7200000 // 2 hour TTL
   * );
   *
   * // Retrieve tools
   * const tools = await cache.getCachedTools({
   *   url: 'http://localhost:3000',
   *   allowWrite: false
   * });
   *
   * // Monitor performance
   * const stats = await cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate}%`);
   * ```
   */
  export class MCPToolCache {
    /**
     * Creates a new MCP Tool Cache instance.
     *
     * @param config - Optional configuration overrides for cache behavior
     */
    constructor(config?: Partial<ToolCacheConfig>);

    /**
     * Retrieves cached tools for the specified MCP server configuration.
     *
     * Attempts to retrieve tools from Redis first, falling back to the
     * memory cache if Redis is unavailable. Returns null on cache miss.
     *
     * @template TOOLS - Type of the tool set being retrieved
     * @param options - MCP server configuration identifying the cache entry
     * @returns Promise resolving to cached tools or null if not found/expired
     *
     * @example
     * ```typescript
     * const tools = await cache.getCachedTools<MyToolSet>({
     *   url: 'http://localhost:3000',
     *   allowWrite: false
     * });
     *
     * if (!tools) {
     *   console.log('Cache miss - need to fetch from server');
     * }
     * ```
     */
    getCachedTools<TOOLS extends ToolSet = ToolSet>(
      options: ToolProviderFactoryOptions,
    ): Promise<TOOLS | null>;

    /**
     * Stores tools in the cache for the specified configuration.
     *
     * Writes to both Redis and memory cache for consistency. If Redis
     * write fails, the memory cache is still updated to ensure availability.
     *
     * @param options - MCP server configuration to use as cache key
     * @param tools - Tool set to cache
     * @param ttl - Optional custom TTL in milliseconds (overrides default)
     *
     * @example
     * ```typescript
     * // Cache with default TTL
     * await cache.setCachedTools(options, toolSet);
     *
     * // Cache with custom 30-minute TTL
     * await cache.setCachedTools(options, toolSet, 1800000);
     * ```
     */
    setCachedTools(
      options: ToolProviderFactoryOptions,
      tools: ToolSet,
      ttl?: number,
    ): Promise<void>;

    /**
     * Invalidates (deletes) cached tools for a specific configuration.
     *
     * Removes the entry from both Redis and memory caches. Use this when
     * the MCP server configuration changes or tools are known to be stale.
     *
     * @param options - MCP server configuration identifying the cache entry
     *
     * @example
     * ```typescript
     * // Invalidate after server update
     * await mcpServer.updateConfiguration();
     * await cache.invalidateCache(serverOptions);
     * ```
     */
    invalidateCache(options: ToolProviderFactoryOptions): Promise<void>;

    /**
     * Clears all entries from both Redis and memory caches.
     *
     * Use with caution - this removes all cached tools across all
     * configurations. Useful for maintenance or testing scenarios.
     *
     * @example
     * ```typescript
     * // Clear all caches during deployment
     * await cache.clearAll();
     * ```
     */
    clearAll(): Promise<void>;

    /**
     * Retrieves current cache statistics and performance metrics.
     *
     * Provides insights into cache size, Redis connectivity, and hit rates.
     * Useful for monitoring and optimization.
     *
     * @returns Promise resolving to cache statistics
     *
     * @example
     * ```typescript
     * const stats = await cache.getStats();
     * console.log(`Memory entries: ${stats.memorySize}`);
     * console.log(`Redis keys: ${stats.redisKeys}`);
     * if (stats.hitRate) {
     *   console.log(`Hit rate: ${stats.hitRate.toFixed(2)}%`);
     * }
     * ```
     */
    getStats(): Promise<CacheStats>;

    /**
     * Disposes of cache resources and closes connections.
     *
     * Cleans up Redis connections, stops background processes, and
     * clears the memory cache. Call this during application shutdown
     * to prevent resource leaks.
     *
     * @example
     * ```typescript
     * // Cleanup on application shutdown
     * process.on('SIGTERM', async () => {
     *   await cache.dispose();
     *   process.exit(0);
     * });
     * ```
     */
    dispose(): Promise<void>;
  }

  /**
   * Retrieves the singleton instance of the MCP Tool Cache.
   *
   * Returns the globally shared cache instance, creating it if necessary
   * with default configuration from environment variables.
   *
   * @returns Singleton MCPToolCache instance
   *
   * @example
   * ```typescript
   * import { getToolCache } from '@/ai/mcp/cache';
   *
   * const cache = getToolCache();
   * const tools = await cache.getCachedTools(options);
   * ```
   */
  export function getToolCache(): MCPToolCache;

  /**
   * Configures and returns the MCP Tool Cache with custom settings.
   *
   * Creates or reconfigures the singleton cache instance with the provided
   * configuration. Subsequent calls to `getToolCache()` will return this
   * configured instance.
   *
   * @param config - Partial configuration to override defaults
   * @returns Configured MCPToolCache instance
   *
   * @example
   * ```typescript
   * import { configureToolCache } from '@/ai/mcp/cache';
   *
   * const cache = configureToolCache({
   *   defaultTtl: 7200000,     // 2 hours
   *   maxMemoryEntries: 200,
   *   keyPrefix: 'prod:mcp:'
   * });
   * ```
   */
  export function configureToolCache(
    config: Partial<ToolCacheConfig>,
  ): MCPToolCache;

  /**
   * Serializes an object to JSON string with schema validation.
   *
   * Performs type-safe serialization with error handling. Returns undefined
   * if serialization fails instead of throwing to enable graceful degradation.
   *
   * @template T - Type of object being serialized
   * @param data - Object to serialize
   * @returns JSON string or undefined on error
   *
   * @example
   * ```typescript
   * const json = serializeWithSchema({ tools, timestamp: Date.now() });
   * if (json) {
   *   await writeToCache(json);
   * }
   * ```
   */
  export function serializeWithSchema<T extends object>(data: T): string;

  /**
   * Deserializes a JSON string to a typed object with schema validation.
   *
   * Performs type-safe deserialization with error handling. Returns the
   * parsed object or throws on invalid JSON/schema mismatch.
   *
   * @template T - Expected type of the deserialized object
   * @param json - JSON string to deserialize
   * @returns Parsed and validated object
   * @throws {Error} If JSON is invalid or schema validation fails
   *
   * @example
   * ```typescript
   * const data = deserializeWithSchema<CacheEntry>(cachedJson);
   * console.log(data.timestamp);
   * ```
   */
  export function deserializeWithSchema<T extends object>(json: string): T;

  /**
   * Serializes a cache entry containing tools and metadata.
   *
   * Specialized serializer for cache entries that includes tools, timestamp,
   * and optional server capabilities. Returns undefined on serialization error
   * for graceful error handling.
   *
   * @template TOOLS - Type of the tool set being serialized
   * @param entry - Cache entry to serialize
   * @param entry.tools - Tool set to cache
   * @param entry.timestamp - Entry creation timestamp
   * @param entry.serverCapabilities - Optional server capability string
   * @returns Serialized JSON string or undefined on error
   *
   * @example
   * ```typescript
   * const json = serializeCacheEntry({
   *   tools: myToolSet,
   *   timestamp: Date.now(),
   *   serverCapabilities: 'v2.0'
   * });
   * ```
   */
  export function serializeCacheEntry<TOOLS extends ToolSet>(entry: {
    tools: TOOLS;
    timestamp: number;
    serverCapabilities?: string;
  }): string | undefined;

  /**
   * Deserializes a cached entry back to tools with metadata.
   *
   * Parses a previously serialized cache entry, returning the tools and
   * optional timestamp. Returns undefined on deserialization error for
   * graceful cache miss handling.
   *
   * @template TOOLS - Expected type of the tool set
   * @param json - Serialized cache entry string
   * @returns Deserialized tools with metadata or undefined on error
   *
   * @example
   * ```typescript
   * const entry = deserializedCacheEntry<MyToolSet>(cachedJson);
   * if (entry) {
   *   console.log('Cached at:', new Date(entry.timestamp!));
   *   return entry; // Contains the tools
   * }
   * ```
   */
  export function deserializedCacheEntry<TOOLS extends ToolSet = ToolSet>(
    json: string,
  ): (TOOLS & { timestamp?: number }) | undefined;

  /**
   * Cache administration and monitoring utilities.
   *
   * Provides static methods for cache management, health monitoring, and
   * performance analysis. Use these utilities for operational tasks like
   * warming the cache, checking health, and viewing statistics.
   *
   * @example
   * ```typescript
   * import { MCPToolCacheAdmin } from '@/ai/mcp/cache';
   *
   * // Check cache health
   * const health = await MCPToolCacheAdmin.healthCheck();
   * if (!health.healthy) {
   *   console.error('Cache unhealthy:', health.details);
   * }
   *
   * // View cache statistics
   * await MCPToolCacheAdmin.showStats();
   *
   * ```
   */
  export class MCPToolCacheAdmin {
    /**
     * Internal reference to the managed cache instance.
     * @private
     */
    private static toolCache: MCPToolCache;

    /**
     * Displays comprehensive cache statistics to the console.
     *
     * Logs memory usage, Redis key count, hit rates, and other performance
     * metrics. Useful for debugging and monitoring cache effectiveness.
     *
     * @example
     * ```typescript
     * await MCPToolCacheAdmin.showStats();
     * // Output:
     * // Cache Statistics:
     * //   Memory entries: 45
     * //   Redis keys: 120
     * //   Hit rate: 87.5%
     * ```
     */
    static showStats(): Promise<void>;

    /**
     * Clears all entries from the cache.
     *
     * Removes all cached tools from both Redis and memory. Use during
     * maintenance windows or when cache invalidation is required.
     *
     * @example
     * ```typescript
     * // Clear cache during deployment
     * console.log('Clearing MCP tool cache...');
     * await MCPToolCacheAdmin.clearCache();
     * console.log('Cache cleared successfully');
     * ```
     */
    static clearCache(): Promise<void>;

    /**
     * Performs a health check on the cache system.
     *
     * Verifies that both memory and Redis caches are functioning correctly.
     * Returns detailed status information for monitoring and alerting.
     *
     * @returns Promise resolving to health check results
     *
     * @example
     * ```typescript
     * const health = await MCPToolCacheAdmin.healthCheck();
     *
     * if (health.healthy) {
     *   console.log('✓ Cache system healthy');
     * } else {
     *   console.error('✗ Cache issues detected:', health.details);
     *   if (!health.details.redisCache) {
     *     console.error('  - Redis cache unavailable');
     *   }
     * }
     * ```
     */
    static healthCheck(): Promise<{
      /** Overall health status - true if all caches are operational */
      healthy: boolean;
      /** Detailed status of individual cache components */
      details: {
        /** Memory cache operational status */
        memoryCache: boolean;
        /** Redis cache operational status */
        redisCache: boolean;
        /** Optional cache statistics if available */
        stats?: CacheStats;
      };
    }>;
  }

  /**
   * Retrieves MCP cache configuration from environment variables.
   *
   * Loads cache settings from environment variables with sensible defaults.
   * Configuration includes TTL, memory limits, enable flag, and key prefix.
   *
   * @returns Cache configuration object
   *
   * @example
   * ```typescript
   * const config = getCacheEnvConfig();
   * console.log('Cache TTL:', config.MCP_CACHE_TTL);
   * console.log('Cache enabled:', config.MCP_CACHE_ENABLED);
   * ```
   */
  export const getCacheEnvConfig: () => {
    /** Cache entry time-to-live in milliseconds */
    MCP_CACHE_TTL: number;
    /** Maximum entries in memory cache */
    MCP_CACHE_MAX_MEMORY: number;
    /** Whether caching is enabled */
    MCP_CACHE_ENABLED: boolean;
    /** Redis key prefix for namespacing */
    MCP_CACHE_PREFIX: string;
  };

  /**
   * Initializes the MCP cache system during application startup.
   *
   * Sets up the singleton cache instance with configuration from environment
   * variables, establishes Redis connection, and prepares the memory cache.
   * Should be called once during application initialization.
   *
   * @example
   * ```typescript
   * // In application startup
   * async function initializeApp() {
   *   await initializeMCPCache();
   *   console.log('MCP cache initialized');
   *   // Continue with app initialization...
   * }
   * ```
   */
  export const initializeMCPCache: () => Promise<void>;

  /**
   * Retrieves or creates a user-specific tool provider cache.
   *
   * Creates an LRU cache for storing user-specific tool provider instances
   * with automatic cleanup and eviction. Each user has isolated cache entries
   * to prevent cross-user contamination.
   *
   * @param config - Optional cache configuration
   * @param config.maxEntriesPerUser - Maximum cached providers per user
   * @param config.maxTotalEntries - Maximum total cached providers across all users
   * @param config.ttl - Entry time-to-live in milliseconds
   * @param config.cleanupInterval - Interval for cleanup tasks in milliseconds
   * @returns Promise resolving to user tool provider cache
   *
   * @example
   * ```typescript
   * const userCache = await getUserToolProviderCache({
   *   maxEntriesPerUser: 5,
   *   maxTotalEntries: 500,
   *   ttl: 3600000,  // 1 hour
   *   cleanupInterval: 300000  // 5 minutes
   * });
   *
   * // Cache user's tool provider
   * await userCache.set(userId, serverUrl, toolProvider);
   *
   * // Retrieve cached provider
   * const provider = await userCache.get(userId, serverUrl);
   * ```
   */
  export function getUserToolProviderCache(
    config?: Partial<{
      maxEntriesPerUser: number;
      maxTotalEntries: number;
      ttl: number;
      cleanupInterval: number;
    }>,
  ): Promise<UserToolProviderCache>;
}
