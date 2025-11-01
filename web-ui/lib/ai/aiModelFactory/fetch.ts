import got, { Response as GotResponse, OptionsOfBufferResponseBody } from 'got';
import type { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import {
  SemaphoreManager,
  Semaphore,
} from '@/lib/nextjs-util/semaphore-manager';
type Handler = (...args: unknown[]) => void;
import { getRedisClient } from '@/lib/redis-client';
import { makeResponse } from '@/lib/nextjs-util/server/response';
import {
  fetchConfigSync,
  type FetchConfig,
} from '@/lib/site-util/feature-flags/fetch-config';
import { LoggedError } from '@/lib/react-util';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
import { log } from '@/lib/logger';
import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';
import { CacheStrategies } from './cache-strategies';
import { StreamingStrategy } from './streaming-strategy';
import { BufferingStrategy } from './buffering-strategy';
import type { CachedValue } from './fetch-types';

const FETCH_MANAGER_SINGLETON_KEY = '@noeducation/fetch-manager';

type RequestInfo = string | URL | Request;
type RequestInit = {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: unknown;
  timeout?: number;
  [k: string]: unknown;
};

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_CACHE_SIZE = 500;
const DEFAULT_STREAM_DETECT_BUFFER = 4 * 1024;
const DEFAULT_STREAM_BUFFER_MAX = 64 * 1024;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Configuration options for FetchManager
 */
export interface FetchManagerConfig {
  /** Initial concurrency limit for fetch requests */
  concurrency: number;
  /** Maximum number of entries in the memory cache */
  cacheSize: number;
  /** Bytes to buffer before detecting if response is a stream */
  streamDetectBuffer: number;
  /** Max bytes to buffer before forcing stream mode */
  streamBufferMax: number;
  /** Maximum response size in bytes (default: 10MB) */
  maxResponseSize: number;
  /** Request timeout in milliseconds (default: 30s) */
  requestTimeout: number;
}

const DEFAULT_CONFIG: FetchManagerConfig = {
  concurrency: DEFAULT_CONCURRENCY,
  cacheSize: DEFAULT_CACHE_SIZE,
  streamDetectBuffer: DEFAULT_STREAM_DETECT_BUFFER,
  streamBufferMax: DEFAULT_STREAM_BUFFER_MAX,
  maxResponseSize: DEFAULT_MAX_RESPONSE_SIZE,
  requestTimeout: DEFAULT_REQUEST_TIMEOUT,
};

/**
 * Manages all state and behavior for the enhanced fetch implementation.
 *
 * Encapsulates:
 * - Multi-layer caching (memory + Redis)
 * - Request deduplication via inflight tracking
 * - Concurrency control via semaphore
 * - Lazy configuration refresh (AutoRefreshFeatureFlag pattern)
 * - Streaming detection and handling
 *
 * Benefits over module-level side effects:
 * - Lazy initialization (no code runs on import)
 * - Lazy config refresh (no polling, refreshes on-demand)
 * - Proper lifecycle management (dispose/cleanup)
 * - Testable (can reset state between tests)
 * - Configurable (can inject custom config)
 * - Follows SingletonProvider pattern
 */
export class FetchManager {
  private cache: LRUCache<string, Promise<CachedValue>>;
  private inflight = new Map<string, Promise<CachedValue>>();
  private semManager: SemaphoreManager;
  private lastObservedConcurrency: number;
  private streamDetectBuffer: number;
  private streamBufferMax: number;
  private config: FetchManagerConfig;

  // Strategy instances
  private cacheStrategies: CacheStrategies;
  private streamingStrategy: StreamingStrategy;
  private bufferingStrategy: BufferingStrategy;

  // Lazy refresh state (AutoRefreshFeatureFlag pattern)
  private _configRefreshAt: number = 0;
  private _pendingConfigRefresh: Promise<void> | null = null;

  constructor(config: Partial<FetchManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cache
    this.cache = new LRUCache({
      max: this.config.cacheSize,
      updateAgeOnGet: true, // LRU behavior
    });

    // Initialize semaphore
    let initialConcurrency = this.config.concurrency;
    try {
      const cfg = fetchConfigSync();
      initialConcurrency = cfg.fetch_concurrency ?? this.config.concurrency;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        source: 'fetch-manager:init',
        log: true,
      });
    }

    this.lastObservedConcurrency = initialConcurrency;
    const sem = new Semaphore(initialConcurrency);
    this.semManager = new SemaphoreManager(sem);

    // Initialize stream configuration
    this.streamDetectBuffer = this.config.streamDetectBuffer;
    this.streamBufferMax = this.config.streamBufferMax;

    // Initialize strategy instances with dependency injection
    this.cacheStrategies = new CacheStrategies({
      cache: this.cache,
      inflightMap: this.inflight,
      getRedisClient,
      fetchConfig: fetchConfigSync,
    });

    this.streamingStrategy = new StreamingStrategy({
      config: {
        streamEnabled: true,
        streamDetectBuffer: this.streamDetectBuffer,
        streamBufferMax: this.streamBufferMax,
        streamMaxChunks: 100, // Will be overridden by fetchConfig
        streamMaxTotalBytes: 10 * 1024 * 1024, // Will be overridden by fetchConfig
      },
      cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(
        this.cacheStrategies,
      ),
      fetchConfig: fetchConfigSync,
      releaseSemaphore: () => this.semManager.sem.release(),
    });

    this.bufferingStrategy = new BufferingStrategy({
      config: {
        streamDetectBuffer: this.streamDetectBuffer,
        streamBufferMax: this.streamBufferMax,
        maxResponseSize: this.config.maxResponseSize,
      },
      cachingConfig: {
        cacheTtl: 300, // Will be overridden by fetchConfig
        redisEnabled: true,
      },
      cache: this.cache,
      cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(
        this.cacheStrategies,
      ),
      getRedisClient,
      fetchConfig: fetchConfigSync,
      releaseSemaphore: () => this.semManager.sem.release(),
    });
  }

  /**
   * Clears completed promises from the inflight map to prevent memory leaks.
   */
  private cleanupInflight(key: string): void {
    this.inflight.delete(key);
  }

  /**
   * Tracks an inflight request and automatically cleans up after completion.
   */
  private trackInflight(
    key: string,
    promise: Promise<CachedValue>,
  ): Promise<CachedValue> {
    this.inflight.set(key, promise);
    promise
      .then(() => this.cleanupInflight(key))
      .catch(() => this.cleanupInflight(key));
    return promise;
  }

  /**
   * Lazy refresh of configuration (AutoRefreshFeatureFlag pattern).
   * Called on each fetch() to check if config needs refreshing.
   * Triggers async refresh if stale, returns immediately.
   */
  private refreshConfigIfStale(): void {
    const TTL_MS = 5 * 60 * 1000; // 5 minutes (matches fetchConfig TTL)
    const now = Date.now();

    // If config is stale and no refresh is in progress, trigger async refresh
    if (now > this._configRefreshAt && !this._pendingConfigRefresh) {
      this._pendingConfigRefresh = this.loadConfig()
        .then(() => {
          this._configRefreshAt = now + TTL_MS;
        })
        .catch((err) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'fetch:config-refresh',
            log: true,
          });
        })
        .finally(() => {
          this._pendingConfigRefresh = null;
        });
    }
  }

  /**
   * Loads configuration from fetchConfigSync and updates internal state.
   * Only updates if values have changed to minimize overhead.
   */
  private async loadConfig(): Promise<void> {
    const cfg = fetchConfigSync();

    // Update concurrency if changed
    const newConcurrency = cfg.fetch_concurrency ?? DEFAULT_CONCURRENCY;
    if (newConcurrency !== this.lastObservedConcurrency) {
      try {
        this.semManager.resize(newConcurrency);
        this.lastObservedConcurrency = newConcurrency;
        log((l) => l.info(`[fetch] resized semaphore to ${newConcurrency}`));
      } catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'fetch:resize',
          log: true,
        });
      }
    }

    // Update stream configuration if changed
    const newDetectBuffer = cfg.fetch_stream_detect_buffer;
    const newBufferMax = cfg.fetch_stream_buffer_max;

    if (newDetectBuffer !== this.streamDetectBuffer) {
      this.streamDetectBuffer = newDetectBuffer;
    }

    if (newBufferMax !== this.streamBufferMax) {
      this.streamBufferMax = newBufferMax;
    }
  }

  /**
   * Disposes of all resources and cleans up state.
   * Should be called when the FetchManager is no longer needed.
   */
  dispose(): void {
    this.cache.clear();
    this.inflight.clear();
    log((l) => l.info('[fetch] FetchManager disposed'));
  }

  private normalizeUrl(input: RequestInfo): string {
    if (typeof input === 'string' || input instanceof URL) return String(input);
    const reqLike = input as unknown as { url?: string };
    if (reqLike && reqLike.url) return reqLike.url;
    throw new Error('Unsupported RequestInfo type');
  }

  private async doGotFetch(url: string, init?: RequestInit) {
    const method = (init?.method || 'GET').toUpperCase();
    const headers =
      init?.headers && !(init.headers instanceof Headers)
        ? (init.headers as Record<string, string>)
        : undefined;
    const gotOptions: Record<string, unknown> = {
      method,
      headers,
      timeout: init?.timeout,
      isStream: false,
      retry: { limit: 1 },
      throwHttpErrors: false,
      responseType: 'buffer',
    };
    if (init?.body != null) gotOptions.body = init.body;

    await this.semManager.sem.acquire();
    try {
      const res: GotResponse<Buffer> = await got(
        url,
        gotOptions as unknown as OptionsOfBufferResponseBody,
      );
      const headersObj: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers || {})) {
        if (Array.isArray(v)) headersObj[k] = v.join(',');
        else if (v === undefined) continue;
        else headersObj[k] = String(v);
      }
      return {
        body: res.rawBody,
        headers: headersObj,
        statusCode: res.statusCode,
      };
    } finally {
      this.semManager.sem.release();
    }
  }

  /**
   * Direct streaming fetch without caching
   */
  async fetchStream(input: RequestInfo, init?: RequestInit) {
    const url = this.normalizeUrl(input);
    const method = (init?.method || 'GET').toUpperCase();
    const options: Record<string, unknown> = {
      method,
      headers: init?.headers,
      timeout: init?.timeout,
      isStream: true,
      retry: { limit: 1 },
    };
    await this.semManager.sem.acquire();
    try {
      const stream = got.stream(url, options);
      const releaseOnce = () => {
        try {
          this.semManager.sem.release();
        } catch {}
      };
      stream.on('end', releaseOnce);
      stream.on('error', releaseOnce);
      return stream;
    } catch (err) {
      this.semManager.sem.release();
      throw err;
    }
  }

  /**
   * Enhanced fetch implementation with multi-layer caching and streaming support.
   *
   * See main JSDoc on exported `fetch` function for full documentation.
   */
  async fetch(input: RequestInfo, init?: RequestInit) {
    // Lazy refresh: check if config is stale and trigger async refresh
    this.refreshConfigIfStale();

    try {
      const cfg = fetchConfigSync();
      if (!cfg.enhanced) {
        const domFetch = (globalThis as unknown as { fetch?: unknown })
          .fetch as unknown;
        if (typeof domFetch === 'function') {
          return (domFetch as (...args: unknown[]) => Promise<Response>)(
            input as unknown,
            init as unknown,
          );
        }
      }
    } catch {
      /* continue with enhanced */
    }

    const url = this.normalizeUrl(input);
    const method = (init?.method || 'GET').toUpperCase();

    if (method === 'GET') {
      const cacheKey = `${method}:${url}`;
      const instrumented = await createInstrumentedSpan({
        spanName: 'fetch.get',
        attributes: { 'http.method': 'GET', 'http.url': url },
      });
      return await instrumented.executeWithContext(async (span) => {
        // Try memory cache (L1)
        const memoryCached = await this.cacheStrategies.tryMemoryCache(
          cacheKey,
          span,
        );
        if (memoryCached) return memoryCached;

        // Try Redis cache (L2) - buffered and stream replay
        const redisCached = await this.cacheStrategies.tryRedisCache(
          cacheKey,
          span,
        );
        if (redisCached) return redisCached;

        // Try inflight deduplication
        const inflightCached = await this.cacheStrategies.tryInflightDedupe(
          cacheKey,
          span,
        );
        if (inflightCached) return inflightCached;

        await this.semManager.sem.acquire();
        let gotStream: Readable;
        try {
          const headersForGot =
            init?.headers && !(init.headers instanceof Headers)
              ? (init.headers as Record<string, string>)
              : undefined;

          // Apply timeout from config or init parameter
          const timeout = init?.timeout ?? this.config.requestTimeout;

          gotStream = got.stream(url, {
            method: 'GET',
            headers: headersForGot,
            retry: { limit: 1 },
            timeout: {
              request: timeout,
            },
          });

          const resHead: {
            statusCode?: number;
            headers?: Record<string, string | string[]>;
          } = await new Promise((resolve, reject) => {
            const ee = gotStream as unknown as EventEmitter;
            const onResponse = (res: IncomingMessage) => {
              ee.removeListener('response', onResponse as Handler);
              ee.removeListener('error', onError as Handler);
              resolve({
                statusCode: res.statusCode,
                headers: res.headers as Record<string, string | string[]>,
              });
            };
            const onError = (err: Error) => {
              ee.removeListener('response', onResponse as Handler);
              ee.removeListener('error', onError as Handler);
              reject(err);
            };
            ee.on('response', onResponse as Handler);
            ee.on('error', onError as Handler);
          });

          const headersLower: Record<string, string> = {};
          for (const [k, v] of Object.entries(resHead.headers || {}))
            headersLower[k.toLowerCase()] = Array.isArray(v)
              ? v.join(',')
              : String(v ?? '');

          const isStreaming =
            this.streamingStrategy.detectStreamingResponse(headersLower);

          span.setAttribute('http.is_streaming', isStreaming);

          if (isStreaming) {
            // Use streaming strategy for pure streaming response
            return this.streamingStrategy.handlePureStreaming(
              cacheKey,
              gotStream,
              headersLower,
              resHead.statusCode ?? 200,
              span,
            );
          }

          // Use buffering strategy for non-streaming responses
          const bufferedResult = await this.bufferingStrategy.handleBufferedResponse(
            cacheKey,
            gotStream,
            headersLower,
            resHead.statusCode ?? 200,
            url,
            span,
          );
          return bufferedResult.response;
        } catch (err) {
          try {
            this.semManager.sem.release();
          } catch (semErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
              source: 'fetch:semaphore:release-error',
              log: true,
            });
          }
          span.setAttribute('http.error', true);
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'fetch:network-error',
            log: true,
          });
          throw err;
        }
      });
    }

    // non-GET: do a normal got fetch limited by semaphore
    const instrumented = await createInstrumentedSpan({
      spanName: 'fetch.non_get',
      attributes: { 'http.method': method, 'http.url': url },
    });
    return await instrumented.executeWithContext(async (span) => {
      const v = await this.doGotFetch(url, init);
      span.setAttribute('http.status_code', v.statusCode);
      return makeResponse(v);
    });
  }
}

/**
 * Gets the global FetchManager singleton instance
 */
export const getFetchManager = (): FetchManager => {
  return SingletonProvider.Instance.getOrCreate<FetchManager>(
    FETCH_MANAGER_SINGLETON_KEY,
    () => new FetchManager(),
  );
};

/**
 * Configures the global FetchManager with custom settings
 *
 * @param config Partial configuration to override defaults
 * @returns The configured FetchManager instance
 */
export const configureFetchManager = (
  config: Partial<FetchManagerConfig>,
): FetchManager => {
  const instance = new FetchManager(config);
  SingletonProvider.Instance.set(FETCH_MANAGER_SINGLETON_KEY, instance);
  return instance;
};

/**
 * Resets the global FetchManager singleton (useful for testing)
 */
export const resetFetchManager = (): void => {
  const existing = SingletonProvider.Instance.get<FetchManager>(
    FETCH_MANAGER_SINGLETON_KEY,
  );
  if (existing) {
    existing.dispose();
  }
  SingletonProvider.Instance.delete(FETCH_MANAGER_SINGLETON_KEY);
};

/**
 * Enhanced fetch implementation with multi-layer caching and streaming support.
 *
 * This function provides an advanced HTTP client with the following features:
 * - **Multi-layer caching**: Memory → Redis → Network for optimal performance
 * - **Request deduplication**: Prevents duplicate concurrent requests to same URL
 * - **Streaming support**: Handles both buffered and streaming responses intelligently
 * - **Concurrency control**: Semaphore-based rate limiting to prevent overwhelming backend
 * - **Instrumentation**: Full OpenTelemetry tracing for observability
 * - **Dynamic configuration**: Runtime-adjustable behavior via feature flags
 *
 * ## Caching Strategy
 *
 * 1. **Memory Cache (L1)**: Fastest, limited size LRU cache for hot data
 * 2. **Redis Cache (L2)**: Persistent cache shared across instances
 *    - Buffered responses: Stored as base64-encoded JSON
 *    - Streaming responses: Stored as chunked lists for replay
 * 3. **Network (L3)**: Falls back to actual HTTP request via `got`
 *
 * ## GET Request Flow
 *
 * ```
 * Request → Memory Cache? → Yes → Return
 *            ↓ No
 *         Redis Cache? → Yes → Return + Warm Memory
 *            ↓ No
 *         Inflight Request? → Yes → Deduplicate
 *            ↓ No
 *         Acquire Semaphore
 *            ↓
 *         Fetch via got.stream()
 *            ↓
 *         Detect Response Type
 *         ├─ Streaming → Stream directly + background cache to Redis
 *         ├─ Small (<4KB) → Buffer → Cache → Return
 *         └─ Large (>64KB) → Stream with initial chunks cached
 * ```
 *
 * ## Non-GET Request Flow
 *
 * ```
 * Request → Acquire Semaphore → Fetch via got → Return
 * (No caching for non-idempotent methods)
 * ```
 *
 * @param input - URL string, URL object, or Request-like object with url property
 * @param init - Optional request configuration
 * @param init.method - HTTP method (default: 'GET')
 * @param init.headers - Request headers as object or Headers instance
 * @param init.body - Request body for POST/PUT/PATCH requests
 * @param init.timeout - Request timeout in milliseconds
 *
 * @returns Promise resolving to a Response-like object
 *
 * @throws {Error} When URL cannot be normalized
 * @throws {Error} When network request fails after retry
 * @throws {Error} When semaphore acquisition fails (shouldn't happen in normal operation)
 *
 * @example
 * ```typescript
 * // Simple GET request (uses full caching)
 * const response = await fetch('https://api.example.com/data');
 * const json = await response.json();
 * ```
 *
 * @example
 * ```typescript
 * // POST request (no caching)
 * const response = await fetch('https://api.example.com/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'John' })
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Streaming response (SSE, large files)
 * const response = await fetch('https://api.example.com/stream');
 * const stream = (response as any).stream();
 * for await (const chunk of stream) {
 *   console.log(chunk.toString());
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With custom headers and timeout
 * const response = await fetch('https://api.example.com/data', {
 *   headers: {
 *     'Authorization': 'Bearer token',
 *     'X-Custom-Header': 'value'
 *   },
 *   timeout: 5000
 * });
 * ```
 *
 * ## Configuration Options (via feature flags)
 *
 * - `enhanced`: Enable enhanced fetch (vs native fetch)
 * - `fetch_concurrency`: Max concurrent requests (default: 8)
 * - `fetch_cache_ttl`: Redis cache expiration in seconds
 * - `stream_enabled`: Enable Redis stream caching
 * - `fetch_stream_detect_buffer`: Bytes to buffer before detecting stream (default: 4KB)
 * - `fetch_stream_buffer_max`: Max bytes to buffer before forcing stream (default: 64KB)
 * - `fetch_stream_max_chunks`: Max chunks to cache in Redis
 * - `fetch_stream_max_total_bytes`: Max total bytes to cache in Redis
 *
 * ## Performance Characteristics
 *
 * - **Memory cache hit**: <1ms
 * - **Redis cache hit**: 5-20ms
 * - **Network request**: 50-500ms (depends on backend)
 * - **Stream detection**: Adds ~10ms overhead for buffering
 *
 * ## Memory Management
 *
 * - Memory cache: LRU with configurable max size (default: 500 entries)
 * - Inflight map: Automatically cleaned after request completion
 * - Semaphore: Released on completion, error, or stream end
 *
 * ## Error Handling
 *
 * - Redis failures: Logged but don't block request (falls through to network)
 * - Network failures: Thrown to caller after retry (limit: 1)
 * - Stream errors: Propagated to response stream consumer
 * - Semaphore exhaustion: Request waits in queue (FIFO)
 *
 * ## Observability
 *
 * All requests emit OpenTelemetry spans with attributes:
 * - `http.method`: Request method
 * - `http.url`: Request URL
 * - `http.status_code`: Response status
 * - `http.cache_hit`: Memory cache hit (boolean)
 * - `http.redis_hit`: Redis cache hit (boolean)
 * - `http.redis_stream_replay`: Redis stream replay (boolean)
 * - `http.inflight_dedupe`: Deduplicated with inflight request (boolean)
 * - `http.is_streaming`: Response is streaming (boolean)
 * - `http.error`: Request failed (boolean)
 * - `http.redis_unavailable`: Redis unavailable (boolean)
 *
 * @see {@link startFetchConfigPolling} - (Deprecated) Lazy refresh now automatic
 * @see {@link stopFetchConfigPolling} - (Deprecated) No polling to stop
 * @see {@link fetchStream} - Direct streaming fetch without caching
 * @see {@link getFetchManager} - Get the global FetchManager singleton
 * @see {@link configureFetchManager} - Configure FetchManager with custom settings
 * @see {@link resetFetchManager} - Reset FetchManager (useful for testing)
 */
export const fetch = async (input: RequestInfo, init?: RequestInit) => {
  return getFetchManager().fetch(input, init);
};

/**
 * Direct streaming fetch without caching
 */
export const fetchStream = async (input: RequestInfo, init?: RequestInit) => {
  return getFetchManager().fetchStream(input, init);
};

export default fetch;
