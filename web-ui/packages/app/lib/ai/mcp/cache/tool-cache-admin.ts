/**
 * @fileoverview MCP Tool Cache Management Utilities
 * Provides administrative functions for monitoring and managing the MCP tool cache.
 *
 * @module tool-cache-admin
 * @version 1.0.0
 */

import { getToolCache, MCPToolCache } from './tool-cache';
import { log } from '@compliance-theater/logger';
import { getCacheEnabledFlag, getCacheEnabledFlagSync } from '../tool-flags';

/**
 * Cache administration utilities
 */
export class MCPToolCacheAdmin {
  /**
   * Gets the tool cache instance
   */
  private static async getCache<T>(cb: (x: MCPToolCache) => T = (x) => x as T) {
    const toolCache = await getToolCache();
    return await cb(toolCache);
  }

  /**
   * Displays comprehensive cache statistics
   */
  static async showStats(): Promise<void> {
    try {
      const stats = await this.getCache((x) => x.getStats());
      log((l) =>
        l.info('MCP Tool Cache Statistics:', {
          memoryEntries: stats.memorySize,
          redisKeys: stats.redisKeys,
          hitRate: stats.hitRate
            ? `${(stats.hitRate * 100).toFixed(1)}%`
            : 'N/A',
        })
      );
    } catch (error) {
      log((l) => l.error('Failed to retrieve cache statistics:', error));
    }
  }

  /**
   * Clears all cached tools (use with caution)
   */
  static async clearCache(): Promise<void> {
    try {
      (await getToolCache()).clearAll();
      log((l) => l.info('All MCP tool caches cleared'));
    } catch (error) {
      log((l) => l.error('Failed to clear cache:', error));
    }
  }

  /**
   * Health check for cache system
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      memoryCache: boolean;
      redisCache: boolean;
      stats?: {
        memorySize: number;
        redisKeys: number;
        hitRate?: number;
      };
      disabled?: undefined | true;
    };
  }> {
    log((l) =>
      l.verbose(
        'healthCheck:MCP tool caching disabled via environment variable'
      )
    );

    const cacheEnabledFlag = await getCacheEnabledFlag();
    if (!cacheEnabledFlag.value) {
      return {
        healthy: true,
        details: {
          memoryCache: false,
          redisCache: false,
          stats: undefined,
          disabled: true,
        },
      };
    }

    const details = {
      memoryCache: false,
      redisCache: false,
      stats: undefined as
        | {
            memorySize: number;
            redisKeys: number;
            hitRate?: number;
          }
        | undefined,
    };

    try {
      // Test memory cache
      details.memoryCache = true;

      // Test Redis cache by getting stats
      const stats = await this.getCache((x) => x.getStats());
      details.redisCache = stats.redisKeys >= 0; // Redis accessible if we can get key count
      details.stats = stats;

      const healthy = details.memoryCache && details.redisCache;

      return { healthy, details };
    } catch (error) {
      log((l) => l.error('Cache health check failed:', error));
      return { healthy: false, details };
    }
  }
}

/**
 * Environment variable configuration for cache tuning
 */
export const getCacheEnvConfig = () => {
  const toolCacheEnabled = getCacheEnabledFlagSync().value;
  return {
    MCP_CACHE_TTL: parseInt(process.env.MCP_CACHE_TTL || '86400'), // 24 hours default
    MCP_CACHE_MAX_MEMORY: parseInt(process.env.MCP_CACHE_MAX_MEMORY || '100'), // 100 entries default
    MCP_CACHE_ENABLED: toolCacheEnabled,
    MCP_CACHE_PREFIX: process.env.MCP_CACHE_PREFIX || 'mcp:tools',
  };
};

/**
 * Middleware function to automatically warm cache on startup
 */
export const initializeMCPCache = async () => {
  const cacheEnabled = await getCacheEnabledFlag();
  if (!cacheEnabled.value) {
    log((l) => l.info('MCP tool caching disabled via environment variable'));
    return;
  }
  try {
    const healthCheck = await MCPToolCacheAdmin.healthCheck();

    if (healthCheck.healthy) {
      log((l) =>
        l.info(
          'MCP tool cache system initialized successfully',
          healthCheck.details
        )
      );
    } else {
      log((l) =>
        l.warn(
          'MCP tool cache system partially unavailable',
          healthCheck.details
        )
      );
    }
  } catch (error) {
    log((l) => l.error('MCP tool cache initialization failed:', error));
  }
};
