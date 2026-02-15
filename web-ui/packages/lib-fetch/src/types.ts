/**
 * @fileoverview Core type definitions for fetch functionality
 *
 * This file contains the fundamental type definitions used across fetch implementations.
 * These types mirror the standard Fetch API types while providing additional configuration options.
 */

/**
 * Configuration for fetch behavior
 */
export interface FetchConfig {
  /** Maximum number of concurrent fetch requests */
  fetch_concurrency?: number;
  /** Bytes to buffer before detecting if response is a stream */
  fetch_stream_detect_buffer?: number;
  /** Max bytes to buffer before forcing stream mode */
  fetch_stream_buffer_max?: number;
  /** Cache TTL in seconds */
  fetch_cache_ttl?: number;
  /** Enable enhanced fetch features */
  enhanced?: boolean;
  /** Timeout configuration */
  timeout?: {
    /** Connection timeout in milliseconds */
    connect?: number;
    /** Socket timeout in milliseconds */
    socket?: number;
    /** Request timeout in milliseconds */
    request?: number;
    /** Response timeout in milliseconds */
    response?: number;
    /** Send timeout in milliseconds */
    send?: number;
    /** Lookup timeout in milliseconds */
    lookup?: number;
  };
  /** Trace level for debugging */
  trace_level?: string;
  /** Enable streaming */
  stream_enabled?: boolean;
  /** Max chunks to cache in streaming responses */
  fetch_stream_max_chunks?: number;
  /** Max total bytes to cache in streaming responses */
  fetch_stream_max_total_bytes?: number;
  /** Deduplicate write requests */
  dedup_writerequests?: boolean;
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
  timeout?: number | FetchConfig['timeout'];
  /** Can only be null. Used to disassociate request from any Window. */
  window?: null;
};

/**
 * Factory function type for creating FetchConfigManager instances
 */
export type FetchConfigManagerFactory = () => FetchConfigManager;

/**
 * Interface for managing fetch configuration
 */
export interface FetchConfigManager {
  /**
   * Get the current fetch configuration
   */
  readonly value: Required<FetchConfig>;

  /**
   * Check if the configuration is stale and needs refresh
   */
  readonly isStale: boolean;

  /**
   * Get the last error that occurred during configuration refresh
   */
  readonly lastError: Error | null;

  /**
   * Get the time remaining until the configuration becomes stale (in milliseconds)
   */
  readonly ttlRemaining: number;

  /**
   * Check if the configuration has been initialized
   */
  readonly isInitialized: boolean;

  /**
   * Force an immediate refresh of the configuration
   * @returns Promise resolving to the refreshed configuration
   */
  forceRefresh(): Promise<Required<FetchConfig>>;

  /**
   * Initialize the configuration with first load
   * @returns Promise resolving to the initialized configuration
   */
  initialize(): Promise<Required<FetchConfig>>;
}
