/**
 * @fileoverview Simplified Fetch configuration management
 * 
 * This module manages fetch configuration with default values.
 * Feature flag integration has been removed pending extraction of site-util package.
 */

import { globalRequiredSingleton } from '@compliance-theater/typescript';
import {
  DEFAULT_ENHANCED_FETCH_CONFIG,
} from './enhanced-fetch-config';
import type { FetchConfig as IFetchConfig } from './fetch-types';

const FETCH_CONFIG_SALT = 'fetch-config-v1' as const;
export const FETCH_MANAGER_SINGLETON_KEY = '@noeducation/fetch-manager';

/**
 * Default fetch configuration values
 */
const DEFAULT_FETCH_CONFIG: Required<IFetchConfig> = {
  fetch_concurrency: 5,
  fetch_stream_detect_buffer: 1024 * 16, // 16KB
  fetch_stream_buffer_max: 1024 * 1024 * 10, // 10MB
  fetch_cache_ttl: 60, // 60 seconds
  enhanced: true,
  timeout: DEFAULT_ENHANCED_FETCH_CONFIG.timeout,
  trace_level: 'basic',
  stream_enabled: true,
  fetch_stream_max_chunks: 1000,
  fetch_stream_max_total_bytes: 1024 * 1024 * 100, // 100MB
  dedup_writerequests: true,
};

/**
 * Simplified FetchConfig management
 */
export class FetchConfigManager {
  #config: Required<IFetchConfig>;
  
  constructor(initialConfig?: Partial<IFetchConfig>) {
    this.#config = {
      ...DEFAULT_FETCH_CONFIG,
      ...initialConfig,
    } as Required<IFetchConfig>;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<IFetchConfig>): void {
    this.#config = {
      ...this.#config,
      ...config,
    } as Required<IFetchConfig>;
  }

  /**
   * Get configuration
   */
  getConfig(): Required<IFetchConfig> {
    return { ...this.#config };
  }
}

/**
 * Get or create the global fetch configuration singleton
 */
export const getFetchConfigManager = (): FetchConfigManager => {
  return globalRequiredSingleton(
    FETCH_MANAGER_SINGLETON_KEY,
    () => new FetchConfigManager(),
  );
};

/**
 * Synchronous access to fetch configuration
 */
export const fetchConfigSync = (): Required<IFetchConfig> => {
  return getFetchConfigManager().getConfig();
};

/**
 * Async access to fetch configuration for compatibility
 */
export const fetchConfig = async (): Promise<Required<IFetchConfig>> => {
  return getFetchConfigManager().getConfig();
};
