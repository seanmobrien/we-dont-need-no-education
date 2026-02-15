/**
 * @fileoverview Simple FetchConfigManager with hard-coded default values
 *
 * This implementation provides a basic FetchConfigManager that returns
 * hard-coded default configuration values without any external dependencies
 * like feature flags or remote configuration sources.
 */

import type { FetchConfig, FetchConfigManager } from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<FetchConfig> = {
  fetch_concurrency: 8,
  fetch_stream_detect_buffer: 4 * 1024, // 4KB
  fetch_stream_buffer_max: 64 * 1024, // 64KB
  fetch_cache_ttl: 300, // 5 minutes
  enhanced: false,
  timeout: {
    connect: 30000, // 30 seconds
    socket: 30000, // 30 seconds
    request: 60000, // 60 seconds
    response: 60000, // 60 seconds
    send: 30000, // 30 seconds
    lookup: 5000, // 5 seconds
  },
  trace_level: 'info',
  stream_enabled: true,
  fetch_stream_max_chunks: 100,
  fetch_stream_max_total_bytes: 10 * 1024 * 1024, // 10MB
  dedup_writerequests: true,
};

/**
 * Simple FetchConfigManager implementation with hard-coded defaults
 *
 * This class provides a basic implementation of the FetchConfigManager interface
 * that returns fixed default values. It's suitable for testing or when you don't
 * need dynamic configuration.
 *
 * @example
 * ```typescript
 * const manager = new SimpleFetchConfigManager();
 * const config = manager.value; // Returns default configuration
 * ```
 */
export class SimpleFetchConfigManager implements FetchConfigManager {
  /**
   * Get the current fetch configuration (always returns defaults)
   */
  get value(): Required<FetchConfig> {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Configuration is never stale since it's static
   */
  get isStale(): boolean {
    return false;
  }

  /**
   * No errors can occur with static configuration
   */
  get lastError(): Error | null {
    return null;
  }

  /**
   * Configuration never expires
   */
  get ttlRemaining(): number {
    return Infinity;
  }

  /**
   * Configuration is always initialized
   */
  get isInitialized(): boolean {
    return true;
  }

  /**
   * Force refresh is a no-op for static configuration
   * @returns Promise resolving to the default configuration
   */
  async forceRefresh(): Promise<Required<FetchConfig>> {
    return this.value;
  }

  /**
   * Initialize is a no-op for static configuration
   * @returns Promise resolving to the default configuration
   */
  async initialize(): Promise<Required<FetchConfig>> {
    return this.value;
  }
}
