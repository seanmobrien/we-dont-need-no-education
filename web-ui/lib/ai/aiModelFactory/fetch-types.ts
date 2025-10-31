/**
 * @fileoverview Shared type definitions for fetch strategy pattern implementation
 *
 * This file contains interfaces and types used across all fetch strategy modules:
 * - cache-strategies.ts
 * - streaming-strategy.ts
 * - buffering-strategy.ts
 * - fetch.ts (FetchManager)
 */

import type { LRUCache } from 'lru-cache';
import type { Readable } from 'stream';
import type { FetchConfig } from '@/lib/site-util/feature-flags/fetch-config';

/**
 * Cached response value structure
 */
export interface CachedValue {
  body: Buffer;
  headers: Record<string, string>;
  statusCode: number;
}

/**
 * Configuration for streaming behavior
 */
export interface StreamingConfig {
  /** Enable Redis stream caching */
  streamEnabled: boolean;
  /** Bytes to buffer before detecting if response is a stream */
  streamDetectBuffer: number;
  /** Max bytes to buffer before forcing stream mode */
  streamBufferMax: number;
  /** Max chunks to cache in Redis for streaming responses */
  streamMaxChunks: number;
  /** Max total bytes to cache in Redis for streaming responses */
  streamMaxTotalBytes: number;
}

/**
 * Configuration for buffering behavior
 */
export interface BufferingConfig {
  /** Maximum response size in bytes before switching to streaming */
  maxResponseSize: number;
  /** Bytes to buffer before deciding stream vs buffer */
  streamDetectBuffer: number;
  /** Max bytes to buffer before forcing stream mode */
  streamBufferMax: number;
}

/**
 * Configuration for caching behavior
 */
export interface CachingConfig {
  /** Redis cache TTL in seconds */
  cacheTtl: number;
  /** Enable Redis caching */
  redisEnabled: boolean;
}

/**
 * Dependencies required by cache strategies
 */
export interface CacheStrategyDeps {
  /** Memory cache instance */
  cache: LRUCache<string, Promise<CachedValue>>;
  /** Map tracking inflight requests for deduplication */
  inflightMap: Map<string, Promise<CachedValue>>;
  /** Function to get Redis client */
  getRedisClient: () => Promise<any>;
  /** Fetch configuration */
  fetchConfig: () => Required<FetchConfig>;
}

/**
 * Dependencies required by streaming strategy
 */
export interface StreamingStrategyDeps {
  /** Streaming configuration */
  config: StreamingConfig;
  /** Cache streaming responses to Redis */
  cacheStreamToRedis: (
    cacheKey: string,
    stream: AsyncIterable<Buffer>,
    headers: Record<string, string>,
    statusCode: number,
    alreadyBufferedChunks: Buffer[],
  ) => Promise<void>;
  /** Fetch configuration */
  fetchConfig: () => Required<FetchConfig>;
  /** Function to release semaphore on stream completion */
  releaseSemaphore: () => void;
}

/**
 * Dependencies required by buffering strategy
 */
export interface BufferingStrategyDeps {
  /** Buffering configuration */
  config: BufferingConfig;
  /** Caching configuration */
  cachingConfig: CachingConfig;
  /** Memory cache for storing buffered responses */
  cache: LRUCache<string, Promise<CachedValue>>;
  /** Cache streaming responses to Redis */
  cacheStreamToRedis: (
    cacheKey: string,
    stream: AsyncIterable<Buffer>,
    headers: Record<string, string>,
    statusCode: number,
    alreadyBufferedChunks: Buffer[],
  ) => Promise<void>;
  /** Function to get Redis client for caching */
  getRedisClient: () => Promise<any>;
  /** Fetch configuration */
  fetchConfig: () => Required<FetchConfig>;
  /** Function to release semaphore on completion */
  releaseSemaphore: () => void;
}

/**
 * Result from cache strategy lookup (undefined = cache miss)
 */
export type CacheResult = Response | undefined;

/**
 * OpenTelemetry span interface (minimal subset needed by strategies)
 */
export interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attributes: Record<string, string | number | boolean>): void;
  recordException(exception: Error): void;
  setStatus(status: { code: number; message?: string }): void;
}
