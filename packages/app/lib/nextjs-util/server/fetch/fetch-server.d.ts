import type { makeResponse } from '../response';

declare module '@/lib/nextjs-util/server/fetch/fetch-server' {
  type Handler = (...args: unknown[]) => void;

  const FETCH_MANAGER_SINGLETON_KEY = '@noeducation/fetch-manager';

  type RequestInfo = string | URL | Request;
  type RequestInit = {
    method?: string;
    headers?: Record<string, string> | Headers;
    body?: unknown;
    timeout?: number;
    [k: string]: unknown;
  };
  type Response = ReturnType<typeof makeResponse>;

  const DEFAULT_CONCURRENCY = 8;
  const DEFAULT_CACHE_SIZE = 500;
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
    constructor(config?: Partial<FetchManagerConfig>);

    /**
     * Disposes of all resources and cleans up state.
     * Should be called when the FetchManager is no longer needed.
     *
     * @deprecated obsolete - use [Symbol.dispose] instead
     */
    dispose(): void;
    /**
     * Disposes of all resources and cleans up state.
     * Should be called when the FetchManager is no longer needed.
     */
    [Symbol.dispose](): void;

    /**
     * Direct streaming fetch without caching
     */
    fetchStream(input: RequestInfo, init?: RequestInit): Promise<Response>;
    /**
     * Enhanced fetch implementation with multi-layer caching and streaming support.
     *
     * See main JSDoc on exported `fetch` function for full documentation.
     */
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  }

  /**
   * Gets the global FetchManager singleton instance
   */
  export function getFetchManager(): FetchManager;

  /**
   * Configures the global FetchManager with custom settings
   *
   * @param config Partial configuration to override defaults
   * @returns The configured FetchManager instance
   */
  export function configureFetchManager(
    config: Partial<FetchManagerConfig>,
  ): FetchManager;

  /**
   * Resets the global FetchManager singleton (useful for testing)
   */
  export function resetFetchManager(): void;

  /**
   * Enhanced server-sidefetch implementation with multi-layer caching and streaming support.
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
  export function serverFetch(
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response>;

  /**
   * Direct streaming fetch without caching
   */
  export function fetchStream(
    input: RequestInfo,
    init?: RequestInit,
  ): Promise<Response>;
}
