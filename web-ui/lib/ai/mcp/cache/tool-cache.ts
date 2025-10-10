/**
 * @fileoverview MCP Tool Cache System
 * Provides efficient caching of MCP server tool definitions with Redis primary storage
 * and in-memory fallback for high-performance tool discovery.
 *
 * @module tool-cache
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import { ToolSet } from 'ai';
import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { ToolProviderFactoryOptions } from '../types';
import z from 'zod';

/**
 * Cache entry structure for MCP tools
 */
type ToolCacheEntry = {
  tools: ToolSet;
  timestamp: number;
  serverCapabilities?: string;
};

type TypedToolCacheEntry<TOOLS extends ToolSet> = ToolCacheEntry & {
  tools: TOOLS;
};

type SchemaFieldEnvelope = {
  __zerialize__schemaField: true;
  serialized: string;
};

/**
 * Configuration for tool caching behavior
 */
interface ToolCacheConfig {
  /** Default TTL in seconds (24 hours) */
  defaultTtl: number;
  /** Maximum in-memory cache size */
  maxMemoryEntries: number;
  /** Key prefix for Redis keys */
  keyPrefix: string;
}

const DEFAULT_CONFIG: ToolCacheConfig = {
  defaultTtl: 24 * 60 * 60, // 24 hours
  maxMemoryEntries: 100,
  keyPrefix: 'mcp:tools',
};

/**
 * In-memory LRU cache for fastest access with TTL awareness
 */
class MemoryToolCache {
  private cache = new Map<string, ToolCacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private ttlTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private maxSize: number,
    private defaultTtl: number,
  ) {}

  get(key: string): ToolCacheEntry | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.accessOrder.set(key, ++this.accessCounter);
      return entry;
    }
    return null;
  }

  set(key: string, entry: ToolCacheEntry, ttl?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.removeEntry(oldestKey);
      }
    }

    // Clear existing timer if updating entry
    this.clearTtlTimer(key);

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    // Set TTL timer for automatic expiration
    const effectiveTtl = ttl || this.defaultTtl;
    const timer = setTimeout(() => {
      this.removeEntry(key);
    }, effectiveTtl * 1000);

    this.ttlTimers.set(key, timer);
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private removeEntry(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.clearTtlTimer(key);
  }

  private clearTtlTimer(key: string): void {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  invalidateKey(key: string): void {
    this.removeEntry(key);
  }

  clear(): void {
    // Clear all timers first
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.accessOrder.clear();
    this.ttlTimers.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Comprehensive MCP Tool Cache with Redis primary and memory fallback
 */
export class MCPToolCache {
  private memoryCache: MemoryToolCache;
  private config: ToolCacheConfig;
  private redisSubscriber?: Awaited<ReturnType<typeof getRedisClient>>;

  constructor(config: Partial<ToolCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryCache = new MemoryToolCache(
      this.config.maxMemoryEntries,
      this.config.defaultTtl,
    );
    // Setup Redis subscription asynchronously (non-blocking)
    this.setupRedisInvalidationSubscription().catch((error) => {
      log((l) =>
        l.warn('Failed to initialize Redis keyspace notifications:', error),
      );
    });
  }

  /**
   * Creates a cache key from MCP server configuration
   */
  private createCacheKey(options: ToolProviderFactoryOptions): string {
    // Sort headers for consistent hashing
    const headersStr = options.headers
      ? JSON.stringify(Object.entries(options.headers).sort())
      : '';

    const headersHash = createHash('sha256')
      .update(headersStr)
      .digest('hex')
      .substring(0, 16);

    // Create URL hash for shorter keys
    const urlHash = createHash('sha256')
      .update(options.url)
      .digest('hex')
      .substring(0, 16);

    const accessLevel = options.allowWrite ? 'rw' : 'ro';

    return `${this.config.keyPrefix}:${urlHash}:${headersHash}:${accessLevel}`;
  }

  /**
   * Retrieves cached tools with multi-level fallback
   */
  async getCachedTools<TOOLS extends ToolSet = ToolSet>(
    options: ToolProviderFactoryOptions,
  ): Promise<TOOLS | null> {
    const cacheKey = this.createCacheKey(options);

    try {
      // Level 1: Memory cache (fastest)
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        log((l) => l.debug(`MCP tools cache hit (memory): ${cacheKey}`));
        return memoryEntry.tools as TOOLS;
      }

      // Level 2: Redis cache
      const redis = await getRedisClient();
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        try {
          const entry = deserializedCacheEntry<TOOLS>(cachedData);
          if (entry && this.isEntryValid(entry)) {
            // Populate memory cache for next access with remaining TTL
            const remainingTtl = Math.max(
              0,
              this.config.defaultTtl -
                Math.floor((Date.now() - entry.timestamp) / 1000),
            );
            this.memoryCache.set(cacheKey, entry, remainingTtl);
            log((l) => l.debug(`MCP tools cache hit (Redis): ${cacheKey}`));
            return entry.tools;
          }
        } catch (parseError) {
          log((l) =>
            l.warn('Failed to parse cached MCP tools', {
              cacheKey,
              error: parseError,
            }),
          );
        }
      }

      log((l) => l.debug(`MCP tools cache miss: ${cacheKey}`));
      return null;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'MCPToolCache.getCachedTools',
        message: 'Failed to retrieve cached tools',
        data: { cacheKey, options: { ...options, headers: '[REDACTED]' } },
      });
      return null;
    }
  }

  /**
   * Stores tools in cache with automatic expiration
   */
  async setCachedTools(
    options: ToolProviderFactoryOptions,
    tools: ToolSet,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = this.createCacheKey(options);
    const entry: ToolCacheEntry = {
      tools,
      timestamp: Date.now(),
      serverCapabilities: this.extractServerCapabilities(tools),
    };

    try {
      const cacheTtl = ttl || this.config.defaultTtl;
      // Store in memory cache with same TTL
      this.memoryCache.set(cacheKey, entry, cacheTtl);
      // Store in Redis with same TTL
      const redis = await getRedisClient();
      const serialized = serializeCacheEntry(entry);
      if (!serialized) {
        log((l) =>
          l.warn(
            `Failed to serialize MCP tools for storing in redis; will be available in memory cache only: ${cacheKey}`,
          ),
        );
        return;
      }
      await redis.setEx(cacheKey, cacheTtl, serialized);
      log((l) =>
        l.debug(`MCP tools cached: ${cacheKey}`, {
          toolCount: Object.keys(tools).length,
          ttl: cacheTtl,
        }),
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'MCPToolCache.setCachedTools',
        message: 'Failed to cache tools',
        data: { cacheKey, toolCount: Object.keys(tools).length },
      });
    }
  }

  /**
   * Invalidates cache for specific MCP server configuration
   */
  async invalidateCache(options: ToolProviderFactoryOptions): Promise<void> {
    const cacheKey = this.createCacheKey(options);

    try {
      // Remove from memory
      this.memoryCache.clear();

      // Remove from Redis
      const redis = await getRedisClient();
      await redis.del(cacheKey);

      log((l) => l.info(`MCP tools cache invalidated: ${cacheKey}`));
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'MCPToolCache.invalidateCache',
        message: 'Failed to invalidate cache',
        data: { cacheKey },
      });
    }
  }

  /**
   * Clears all cached tools (useful for testing or memory management)
   */
  async clearAll(): Promise<void> {
    try {
      this.memoryCache.clear();

      const redis = await getRedisClient();
      const keys = await redis.keys(`${this.config.keyPrefix}:*`);

      if (keys.length > 0) {
        // Redis del command expects at least one key - batch delete for efficiency
        await redis.del(keys);
      }

      log((l) =>
        l.info('All MCP tools cache cleared', { clearedKeys: keys.length }),
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'MCPToolCache.clearAll',
        message: 'Failed to clear all cache',
      });
    }
  }

  /**
   * Gets cache statistics for monitoring
   */
  async getStats(): Promise<{
    memorySize: number;
    redisKeys: number;
    hitRate?: number;
  }> {
    try {
      const redis = await getRedisClient();
      const redisKeys = await redis.keys(`${this.config.keyPrefix}:*`);

      return {
        memorySize: this.memoryCache.size(),
        redisKeys: redisKeys.length,
      };
    } catch {
      return {
        memorySize: this.memoryCache.size(),
        redisKeys: 0,
      };
    }
  }

  /**
   * Checks if cache entry is still valid
   */
  private isEntryValid(entry: ToolCacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    const maxAge = this.config.defaultTtl * 1000;
    return age < maxAge;
  }

  /**
   * Sets up Redis keyspace notification subscription for cache invalidation
   */
  private async setupRedisInvalidationSubscription(): Promise<void> {
    try {
      // Create separate Redis connection for pub/sub
      this.redisSubscriber = await getRedisClient();

      // Enable keyspace notifications for expired events
      await this.redisSubscriber.configSet('notify-keyspace-events', 'Ex');

      // Subscribe to expiration events for our cache keys
      await this.redisSubscriber.pSubscribe(
        `__keyevent@0__:expired`,
        (message: string) => {
          // Extract the expired key and check if it's one of ours
          if (message && message.startsWith(this.config.keyPrefix)) {
            log((l) =>
              l.debug(
                `Redis key expired, invalidating memory cache: ${message}`,
              ),
            );
            this.memoryCache.invalidateKey(message);
          }
        },
      );

      log((l) =>
        l.debug('Redis keyspace notifications enabled for MCP tool cache'),
      );
    } catch (error) {
      // Non-critical failure - cache will still work without notifications
      log((l) =>
        l.warn(
          'Failed to setup Redis keyspace notifications for cache invalidation',
          error,
        ),
      );
    }
  }

  /**
   * Cleanup method for proper resource disposal
   */
  async dispose(): Promise<void> {
    try {
      if (this.redisSubscriber) {
        await this.redisSubscriber.pUnsubscribe();
        await this.redisSubscriber.quit();
      }
      this.memoryCache.clear();
    } catch (error) {
      log((l) => l.warn('Error during cache disposal:', error));
    }
  }

  /**
   * Extracts server capabilities fingerprint from tools
   */
  private extractServerCapabilities(tools: ToolSet): string {
    const toolNames = Object.keys(tools).sort();
    return createHash('md5')
      .update(JSON.stringify(toolNames))
      .digest('hex')
      .substring(0, 8);
  }
}

/**
 * Typeguard to check if a value is a Zod schema.
 * @param value The value to check
 * @return True if the value is a Zod schema, false otherwise
 * @example
 * ```typescript
 * if (isSchema(schema)) {
 *  // schema is typed as z.ZodTypeAny
 *  const shape = schema.shape; // Access object-specific properties
 * }
 */
export const isSchema = (value: unknown): value is z.ZodTypeAny =>
  !!value && value instanceof z.ZodType;

let zodex:
  | undefined
  | {
      zerialize: (schema: z.ZodTypeAny) => { type: unknown };
      dezerialize: (data: unknown) => z.ZodTypeAny;
    } = undefined;

/**
 * Serializes an object, converting any Zod schemas to their serializable forms.
 * Adds metadata to indicate which fields were schemas for proper deserialization.
 * @example
 * ```typescript
 * const json = serializeWithSchema(data);
 * const original = deserializeWithSchema<typeof data>(json);
 * if (isSchema(original.schemaField)) {
 *   // original.schemaField is restored as a Zod schema
 * }
 * ```
 */
export const serializeWithSchema = <T extends object>(data: T): string => {
  return JSON.stringify(data, (_key, value) => {
    if (!isSchema(value)) {
      return value;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    zodex = zodex ?? require('zodex').Zodex;
    if (!zodex) {
      throw new TypeError('Zodex module is required for schema serialization');
    }
    return {
      __zerialize__schemaField: true,
      serialized: zodex.zerialize(value),
    };
  });
};

const isSerializedSchema = (value: unknown): value is SchemaFieldEnvelope =>
  !!value &&
  typeof value === 'object' &&
  '__zerialize__schemaField' in value &&
  value.__zerialize__schemaField === true &&
  'serialized' in value &&
  typeof value.serialized === 'string';

/**
 * Deserializes a JSON string, restoring any Zod schemas to their original form.
 * @param json The JSON string to deserialize
 * @example
 * ```typescript
 * const json = serializeWithSchema(data);
 * const original = deserializeWithSchema<typeof data>(json);
 * if (isSchema(original.schemaField)) {
 *   // original.schemaField is restored as a Zod schema
 * }
 * ```
 * @returns The deserialized object with restored Zod schemas
 */
export const deserializeWithSchema = <T extends object>(json: string): T => {
  return JSON.parse(json, (_key, value) => {
    // If it's not a serialized schema handle normally
    if (!isSerializedSchema(value)) {
      return value;
    }
    // Otherwise parse and return the value of the serialized field
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      zodex = zodex ?? require('zodex').Zodex;
      if (!zodex) {
        throw new TypeError(
          'Zodex module is required for schema serialization',
        );
      }
      return zodex.dezerialize(value.serialized);
    } catch (error) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        critical: false,
        source: 'MCPToolCache.deserializedCacheEntry',
      });
      log((l) =>
        l.warn('Failed to parse cached MCP tools', {
          error: le.toString(),
          json,
        }),
      );
      return value;
    }
  });
};

export const serializeCacheEntry = <TOOLS extends ToolSet>(
  entry: TypedToolCacheEntry<TOOLS>,
): string | undefined => {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }
  return JSON.stringify(entry, (key, value) => {
    // if this is not the tools property or if its an unexpected type, let default serialization handle it
    // do its thing
    if (key !== 'tools' || !value || typeof value !== 'object') {
      return value;
    }
    // Serialize tools individually to handle inner schemas (and execute callback maybe?)
    const serializedTools: Record<string, unknown> = {};
    for (const [toolName, tool] of Object.entries(value as TOOLS)) {
      serializedTools[toolName] = serializeWithSchema(tool);
    }
    return serializedTools;
  });
};

export const deserializedCacheEntry = <TOOLS extends ToolSet = ToolSet>(
  json: string,
): TypedToolCacheEntry<TOOLS> | undefined => {
  // Handle unexpeced or explicit not values gracefully
  if (
    !json ||
    typeof json !== 'string' ||
    json === 'null' ||
    json === 'undefined'
  ) {
    return undefined;
  }
  try {
    return JSON.parse(json, (key, value) => {
      // if this is not the tools property, let default deserialization handle it
      if (key !== 'tools' || !value || typeof value !== 'object') {
        return value;
      }
      // Deserialize tools individually to handle inner schemas
      return Object.entries(value).reduce(
        (
          acc: Record<keyof TOOLS, TOOLS[keyof TOOLS]>,
          [toolName, toolJson]: [string, unknown],
        ) => {
          if (!toolJson) {
            return acc;
          }
          const tool: TOOLS[typeof toolName] = deserializeWithSchema<
            TOOLS[typeof toolName]
          >(typeof toolJson === 'string' ? toolJson : JSON.stringify(toolJson));
          if (!tool) {
            log((l) =>
              l.warn('Unexpected null tool after deserialization', {
                toolName,
              }),
            );
          } else {
            acc[toolName as keyof TOOLS] = tool;
          }
          return acc;
        },
        {} as TOOLS,
      );
    });
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      critical: false,
      source: 'MCPToolCache.deserializedCacheEntry',
    });
    log((l) =>
      l.warn('Failed to parse cached MCP tools', {
        error: le.toString(),
        json,
      }),
    );
    return undefined;
  }
};

// Global singleton instance
let globalToolCache: MCPToolCache | null = null;

/**
 * Gets the global MCP tool cache instance
 */
export const getToolCache = (): MCPToolCache => {
  if (!globalToolCache) {
    globalToolCache = new MCPToolCache();
  }
  return globalToolCache;
};

/**
 * Configures the global tool cache
 */
export const configureToolCache = (
  config: Partial<ToolCacheConfig>,
): MCPToolCache => {
  globalToolCache = new MCPToolCache(config);
  return globalToolCache;
};
