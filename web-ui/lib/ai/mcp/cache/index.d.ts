/**
 * @fileoverview Cache-related MCP utilities and implementations
 * @module cache
 */

import type { ToolSet } from 'ai';
import type {
  ToolProviderFactoryOptions,
  UserToolProviderCache,
} from '../types';

/**
 * Comprehensive MCP Tool Cache with Redis primary and memory fallback
 */
export declare class MCPToolCache {
  constructor(
    config?: Partial<{
      defaultTtl: number;
      maxMemoryEntries: number;
      keyPrefix: string;
    }>,
  );
  getCachedTools<TOOLS extends ToolSet = ToolSet>(
    options: ToolProviderFactoryOptions,
  ): Promise<TOOLS | null>;
  setCachedTools(
    options: ToolProviderFactoryOptions,
    tools: ToolSet,
    ttl?: number,
  ): Promise<void>;
  invalidateCache(options: ToolProviderFactoryOptions): Promise<void>;
  clearAll(): Promise<void>;
  getStats(): Promise<{
    memorySize: number;
    redisKeys: number;
    hitRate?: number;
  }>;
  dispose(): Promise<void>;
}

export declare function getToolCache(): MCPToolCache;
export declare function configureToolCache(
  config: Partial<{
    defaultTtl: number;
    maxMemoryEntries: number;
    keyPrefix: string;
  }>,
): MCPToolCache;

export declare function serializeWithSchema<T extends object>(data: T): string;
export declare function deserializeWithSchema<T extends object>(
  json: string,
): T;
export declare function serializeCacheEntry<TOOLS extends ToolSet>(entry: {
  tools: TOOLS;
  timestamp: number;
  serverCapabilities?: string;
}): string | undefined;
export declare function deserializedCacheEntry<TOOLS extends ToolSet = ToolSet>(
  json: string,
): (TOOLS & { timestamp?: number }) | undefined;

/**
 * Cache administration utilities
 */
export declare class MCPToolCacheAdmin {
  private static toolCache: MCPToolCache;
  static showStats(): Promise<void>;
  static clearCache(): Promise<void>;
  static warmCache(
    commonConfigs: Array<{ url: string; allowWrite?: boolean }>,
  ): Promise<void>;
  static healthCheck(): Promise<{
    healthy: boolean;
    details: {
      memoryCache: boolean;
      redisCache: boolean;
      stats?: { memorySize: number; redisKeys: number; hitRate?: number };
    };
  }>;
}

export declare const getCacheEnvConfig: () => {
  MCP_CACHE_TTL: number;
  MCP_CACHE_MAX_MEMORY: number;
  MCP_CACHE_ENABLED: boolean;
  MCP_CACHE_PREFIX: string;
};

export declare const initializeMCPCache: () => Promise<void>;
export declare function getUserToolProviderCache(
  config?: Partial<{
    maxEntriesPerUser: number;
    maxTotalEntries: number;
    ttl: number;
    cleanupInterval: number;
  }>,
): Promise<UserToolProviderCache>;
