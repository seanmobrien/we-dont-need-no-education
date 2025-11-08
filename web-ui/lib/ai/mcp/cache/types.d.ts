/**
 * @fileoverview Type definitions for MCP tool caching system
 *
 * This module provides type definitions for the MCP (Model Context Protocol) tool
 * cache system, including cache entry structures, configuration options, and
 * serialization envelopes. These types ensure type safety across the caching
 * infrastructure and provide clear contracts for cache operations.
 *
 * ## Key Concepts
 *
 * - **Cache Entries**: Structured data containing tools, metadata, and timestamps
 * - **Type Safety**: Generic types for strongly-typed cache operations
 * - **Serialization**: Special envelope types for schema-aware serialization
 * - **Configuration**: Strongly-typed cache configuration options
 *
 * @example
 * ```typescript
 * import type { ToolCacheEntry, ToolCacheConfig } from 'ai/mcp/cache/types';
 *
 * // Type-safe cache entry
 * const entry: ToolCacheEntry = {
 *   tools: myToolSet,
 *   timestamp: Date.now(),
 *   serverCapabilities: 'v2.0'
 * };
 *
 * // Cache configuration
 * const config: ToolCacheConfig = {
 *   defaultTtl: 3600,
 *   maxMemoryEntries: 100,
 *   keyPrefix: 'mcp:tools:'
 * };
 * ```
 *
 * @module ai/mcp/cache/types
 */
import { ToolSet } from 'ai';

declare module 'ai/mcp/cache/types' {
  /**
   * Cache entry structure for storing MCP tools with metadata.
   *
   * This type represents a complete cache entry including the tool set,
   * timestamp for TTL tracking, and optional server capabilities for
   * version tracking. Cache entries are serialized for storage in Redis
   * or kept in memory for fast access.
   *
   * ## Fields
   *
   * - **tools**: The complete set of MCP tools available from the server
   * - **timestamp**: Unix timestamp (milliseconds) when the entry was created
   * - **serverCapabilities**: Optional version/capability string from the MCP server
   *
   * ## Usage
   *
   * Cache entries are created when tools are fetched from an MCP server
   * and stored for subsequent requests. The timestamp enables TTL-based
   * expiration, and capabilities tracking allows for invalidation when
   * server versions change.
   *
   * @example
   * ```typescript
   * const entry: ToolCacheEntry = {
   *   tools: {
   *     'file-read': { ... },
   *     'file-write': { ... },
   *     'execute-command': { ... }
   *   },
   *   timestamp: Date.now(),
   *   serverCapabilities: 'mcp-v1.0'
   * };
   *
   * // Check if entry is expired
   * const isExpired = Date.now() - entry.timestamp > ttl;
   * ```
   *
   * @example
   * ```typescript
   * // Store in cache
   * await cache.set(cacheKey, entry);
   *
   * // Retrieve and validate
   * const cached = await cache.get(cacheKey);
   * if (cached && Date.now() - cached.timestamp < config.defaultTtl) {
   *   return cached.tools;
   * }
   * ```
   */
  export type ToolCacheEntry = {
    /**
     * The complete set of tools available from the MCP server.
     *
     * Contains all tool definitions including names, descriptions,
     * input schemas, and execution metadata. This is the primary
     * data being cached.
     */
    tools: ToolSet;

    /**
     * Unix timestamp in milliseconds when this entry was created.
     *
     * Used for TTL calculations and cache expiration. Entries older
     * than the configured TTL should be considered stale and refreshed.
     *
     * @example
     * ```typescript
     * const ageMs = Date.now() - entry.timestamp;
     * const isExpired = ageMs > config.defaultTtl;
     * ```
     */
    timestamp: number;

    /**
     * Optional server capabilities or version string.
     *
     * Captures the MCP server's capability declaration or version
     * information at the time of caching. Can be used to invalidate
     * cache entries when server capabilities change.
     *
     * @example
     * ```typescript
     * if (entry.serverCapabilities !== currentServerVersion) {
     *   // Server updated - invalidate cache
     *   await cache.invalidate(cacheKey);
     * }
     * ```
     */
    serverCapabilities?: string;
  };

  /**
   * Strongly-typed cache entry with specific tool set type.
   *
   * This generic type extends {@link ToolCacheEntry} with a specific tool set
   * type parameter, enabling type-safe retrieval of tools from the cache.
   * Use this when you know the exact tool set type at compile time.
   *
   * @template TOOLS - The specific ToolSet type being cached
   *
   * @example
   * ```typescript
   * // Define your specific tool set type
   * interface MyToolSet extends ToolSet {
   *   'file-read': FileTool;
   *   'file-write': FileTool;
   *   'execute': ExecuteTool;
   * }
   *
   * // Type-safe cache entry
   * const entry: TypedToolCacheEntry<MyToolSet> = {
   *   tools: myTypedTools,
   *   timestamp: Date.now()
   * };
   *
   * // TypeScript knows the exact tool types
   * const readTool = entry.tools['file-read']; // Type: FileTool
   * ```
   *
   * @example
   * ```typescript
   * // Generic function with type safety
   * function getCachedTools<T extends ToolSet>(
   *   key: string
   * ): TypedToolCacheEntry<T> | null {
   *   const cached = cache.get(key);
   *   if (!cached) return null;
   *   return cached as TypedToolCacheEntry<T>;
   * }
   *
   * const entry = getCachedTools<MyToolSet>('user-123');
   * if (entry) {
   *   // Full type information available
   *   entry.tools['file-read'].execute(...);
   * }
   * ```
   */
  export type TypedToolCacheEntry<TOOLS extends ToolSet> = ToolCacheEntry & {
    /**
     * Strongly-typed tool set matching the TOOLS type parameter.
     *
     * Overrides the base `tools` field with a specific type, enabling
     * compile-time type checking and IDE autocomplete for tool access.
     */
    tools: TOOLS;
  };

  /**
   * Envelope type for schema-aware field serialization.
   *
   * This type wraps serialized data with a marker indicating it contains
   * schema-validated content. Used internally by serialization utilities
   * to differentiate between regular strings and schema-serialized data,
   * enabling safe round-trip serialization of complex objects.
   *
   * ## Purpose
   *
   * When serializing cache entries, some fields require special handling
   * to preserve type information and structure. This envelope marks such
   * fields so deserialization can properly reconstruct them.
   *
   * ## Internal Use
   *
   * This type is primarily used by internal serialization functions and
   * is not typically used directly in application code. The cache system
   * handles envelope creation and unwrapping automatically.
   *
   * @example
   * ```typescript
   * // Internal serialization (handled automatically by cache)
   * const envelope: SchemaFieldEnvelope = {
   *   __zerialize__schemaField: true,
   *   serialized: JSON.stringify(complexObject)
   * };
   *
   * // Deserialization check
   * function isSchemaField(value: unknown): value is SchemaFieldEnvelope {
   *   return (
   *     typeof value === 'object' &&
   *     value !== null &&
   *     '__zerialize__schemaField' in value
   *   );
   * }
   * ```
   *
   * @internal
   */
  export type SchemaFieldEnvelope = {
    /**
     * Marker flag indicating this is a schema-serialized field.
     *
     * Always set to `true`. Used to distinguish envelope objects from
     * regular objects during deserialization.
     */
    __zerialize__schemaField: true;

    /**
     * The serialized content as a JSON string.
     *
     * Contains the JSON-serialized representation of the original value.
     * This string is parsed and validated during deserialization.
     */
    serialized: string;
  };

  /**
   * Configuration options for MCP tool caching behavior.
   *
   * This interface defines all configurable aspects of the tool cache system,
   * including time-to-live settings, memory limits, and key prefixing for
   * namespace isolation in shared Redis instances.
   *
   * ## Configuration Guidelines
   *
   * - **TTL**: Balance freshness vs. load. Longer TTL reduces server load but may serve stale tools
   * - **Memory Entries**: Limit based on available memory. Each entry contains full tool definitions
   * - **Key Prefix**: Use environment-specific prefixes (dev/staging/prod) to prevent collisions
   *
   * ## Default Values
   *
   * When not specified, the following defaults are used:
   * - `defaultTtl`: 86400 (24 hours)
   * - `maxMemoryEntries`: 100
   * - `keyPrefix`: 'mcp:tools:'
   *
   * @example
   * ```typescript
   * // Development configuration
   * const devConfig: ToolCacheConfig = {
   *   defaultTtl: 300,           // 5 minutes - fast refresh
   *   maxMemoryEntries: 50,      // Limited memory usage
   *   keyPrefix: 'mcp:dev:tools:'
   * };
   *
   * // Production configuration
   * const prodConfig: ToolCacheConfig = {
   *   defaultTtl: 3600,          // 1 hour - balance freshness/load
   *   maxMemoryEntries: 200,     // More memory for performance
   *   keyPrefix: 'mcp:prod:tools:'
   * };
   * ```
   *
   * @example
   * ```typescript
   * // Initialize cache with custom config
   * import { MCPToolCache } from '@/ai/mcp/cache';
   *
   * const cache = new MCPToolCache({
   *   defaultTtl: 1800,
   *   maxMemoryEntries: 150,
   *   keyPrefix: 'staging:mcp:'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Load from environment variables
   * const config: ToolCacheConfig = {
   *   defaultTtl: parseInt(process.env.MCP_CACHE_TTL || '3600'),
   *   maxMemoryEntries: parseInt(process.env.MCP_CACHE_MAX_MEMORY || '100'),
   *   keyPrefix: process.env.MCP_CACHE_PREFIX || 'mcp:tools:'
   * };
   * ```
   */
  export interface ToolCacheConfig {
    /**
     * Default time-to-live for cache entries in seconds.
     *
     * Determines how long cached tools are considered valid before
     * requiring refresh from the MCP server. Entries older than this
     * are treated as stale and re-fetched on next access.
     *
     * ## Considerations
     *
     * - **Lower values** (300-1800s): More current tools, higher server load
     * - **Higher values** (3600-86400s): Less server load, may serve outdated tools
     * - **Balance**: Consider tool volatility and server capacity
     *
     * @default 86400 (24 hours)
     *
     * @example
     * ```typescript
     * // Short TTL for frequently changing tools
     * defaultTtl: 600  // 10 minutes
     *
     * // Long TTL for stable tool definitions
     * defaultTtl: 86400  // 24 hours
     * ```
     */
    defaultTtl: number;

    /**
     * Maximum number of entries to store in the in-memory cache.
     *
     * Limits memory usage by capping the number of tool sets kept in RAM.
     * When this limit is exceeded, the least recently used entries are
     * evicted. Does not affect Redis cache capacity.
     *
     * ## Memory Estimation
     *
     * Each entry typically requires 10-50KB depending on tool complexity.
     * - 100 entries ≈ 1-5MB
     * - 500 entries ≈ 5-25MB
     * - 1000 entries ≈ 10-50MB
     *
     * @default 100
     *
     * @example
     * ```typescript
     * // Conservative memory usage
     * maxMemoryEntries: 50
     *
     * // Higher capacity for performance
     * maxMemoryEntries: 500
     * ```
     */
    maxMemoryEntries: number;

    /**
     * Prefix for Redis keys to enable namespace isolation.
     *
     * All Redis keys for MCP tool cache entries will be prefixed with this
     * string, preventing collisions in shared Redis instances across multiple
     * applications or environments.
     *
     * ## Naming Conventions
     *
     * - Use environment: `mcp:dev:`, `mcp:staging:`, `mcp:prod:`
     * - Use application: `app1:mcp:`, `app2:mcp:`
     * - Use feature: `mcp:tools:v2:`
     *
     * @default 'mcp:tools:'
     *
     * @example
     * ```typescript
     * // Environment-specific prefixes
     * keyPrefix: 'mcp:prod:tools:'
     * keyPrefix: 'mcp:staging:tools:'
     *
     * // Application-specific prefixes
     * keyPrefix: 'noeducation:mcp:tools:'
     *
     * // Version-specific prefixes
     * keyPrefix: 'mcp:v2:tools:'
     * ```
     */
    keyPrefix: string;
  }
}
