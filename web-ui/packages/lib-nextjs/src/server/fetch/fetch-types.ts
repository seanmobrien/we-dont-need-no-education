/**
 * @fileoverview Shared type definitions for fetch strategy pattern implementation
 *
 * This file contains interfaces and types used across all fetch strategy modules:
 * - cache-strategies.ts
 * - streaming-strategy.ts
 * - buffering-strategy.ts
 * - fetch.ts (FetchManager)
 */

import { EnhancedFetchConfig } from './enhanced-fetch-config';
import type { LRUCache } from 'lru-cache';
import type { RedisClientType } from 'redis';

export type FetchConfig = {
  fetch_concurrency?: number;
  fetch_stream_detect_buffer?: number;
  fetch_stream_buffer_max?: number;
  fetch_cache_ttl?: number;
  enhanced?: boolean;
  timeout: EnhancedFetchConfig['timeout'];
  trace_level?: string;
  stream_enabled?: boolean;
  fetch_stream_max_chunks?: number;
  fetch_stream_max_total_bytes?: number;
  dedup_writerequests?: boolean;
};

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

  getRedisClient: () => Promise<RedisClientType>;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Mirrors RequestInfo type from the Fetch API
 */
export type RequestInfo = string | URL | Request;

/**
 * Mirrors RequestInit interface from the Fetch API
 */
export type RequestInit = {
  /** A BodyInit object or null to set request's body. */
  body?: BodyInit | null;
  /** A string indicating how the request will interact with the browser's cache to set request's cache. */
  cache?: RequestCache;
  /** A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials. */
  credentials?: RequestCredentials;
  /** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
  headers?: Record<string, string | string[]> | Headers | [string, string | string[]][];
  /** A cryptographic hash of the resource to be fetched by request. Sets request's integrity. */
  integrity?: string;
  /** A boolean to set request's keepalive. */
  keepalive?: boolean;
  /** A string to set request's method. */
  method?: string;
  /** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
  mode?: RequestMode;
  priority?: RequestPriority;
  /** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
  redirect?: RequestRedirect;
  /** A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer. */
  referrer?: string;
  /** A referrer policy to set request's referrerPolicy. */
  referrerPolicy?: ReferrerPolicy;
  /** An AbortSignal to set request's signal. */
  signal?: AbortSignal | null;
  /** Number of milliseconds before the request times out and is cancelled. */
  timeout?: number;
  /** Can only be null. Used to disassociate request from any Window. */
  window?: null;
};

/**
 * Normalized RequestInit ready for use by got with valid Headers
 * instance
 */
export type NormalizedRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string | string[]>;
};

/**
 * Scaled-down minimalist interface for server-based FetchManager instances
 */
export type ServerFetchManager = {
  fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
  [Symbol.dispose](): void;
}
