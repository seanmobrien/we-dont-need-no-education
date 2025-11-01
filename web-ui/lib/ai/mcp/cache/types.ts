import { ToolSet } from 'ai';

/**
 * Cache entry structure for MCP tools
 */
export type ToolCacheEntry = {
  tools: ToolSet;
  timestamp: number;
  serverCapabilities?: string;
};

export type TypedToolCacheEntry<TOOLS extends ToolSet> = ToolCacheEntry & {
  tools: TOOLS;
};

export type SchemaFieldEnvelope = {
  __zerialize__schemaField: true;
  serialized: string;
};

/**
 * Configuration for tool caching behavior
 */
export interface ToolCacheConfig {
  /** Default TTL in seconds (24 hours) */
  defaultTtl: number;
  /** Maximum in-memory cache size */
  maxMemoryEntries: number;
  /** Key prefix for Redis keys */
  keyPrefix: string;
}
