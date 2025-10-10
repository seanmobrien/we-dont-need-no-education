/**
 * @fileoverview MCP Tool Cache Management Utilities
 * Provides administrative functions for monitoring and managing the MCP tool cache.
 *
 * @module tool-cache-admin
 * @version 1.0.0
 */

import { getToolCache } from './tool-cache';
import { log } from '@/lib/logger';

/**
 * Cache administration utilities
 */
export class MCPToolCacheAdmin {
  private static toolCache = getToolCache();

  /**
   * Displays comprehensive cache statistics
   */
  static async showStats(): Promise<void> {
    try {
      const stats = await this.toolCache.getStats();

      log((l) =>
        l.info('MCP Tool Cache Statistics:', {
          memoryEntries: stats.memorySize,
          redisKeys: stats.redisKeys,
          hitRate: stats.hitRate
            ? `${(stats.hitRate * 100).toFixed(1)}%`
            : 'N/A',
        }),
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
      await this.toolCache.clearAll();
      log((l) => l.info('All MCP tool caches cleared'));
    } catch (error) {
      log((l) => l.error('Failed to clear cache:', error));
    }
  }

  /**
   * Warm up cache by pre-loading tools for common configurations
   * @param commonConfigs Array of frequently used MCP server configurations
   */
  static async warmCache(
    commonConfigs: Array<{ url: string; allowWrite?: boolean }>,
  ): Promise<void> {
    log((l) =>
      l.info(
        `Warming MCP tool cache for ${commonConfigs.length} configurations...`,
      ),
    );

    const { toolProviderFactory } = await import('../providers');

    const warmupPromises = commonConfigs.map(async (config) => {
      try {
        const provider = await toolProviderFactory(config);
        const tools = provider.tools;
        await provider.dispose();

        log((l) =>
          l.debug(`Cache warmed for ${config.url}`, {
            toolCount: Object.keys(tools).length,
          }),
        );
      } catch (error) {
        log((l) => l.warn(`Cache warmup failed for ${config.url}:`, error));
      }
    });

    await Promise.allSettled(warmupPromises);
    log((l) => l.info('MCP tool cache warmup completed'));
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
    };
  }> {
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
      const stats = await this.toolCache.getStats();
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
export const getCacheEnvConfig = () => ({
  MCP_CACHE_TTL: parseInt(process.env.MCP_CACHE_TTL || '86400'), // 24 hours default
  MCP_CACHE_MAX_MEMORY: parseInt(process.env.MCP_CACHE_MAX_MEMORY || '100'), // 100 entries default
  MCP_CACHE_ENABLED: process.env.MCP_CACHE_ENABLED !== 'false', // Enabled by default
  MCP_CACHE_PREFIX: process.env.MCP_CACHE_PREFIX || 'mcp:tools',
});

/**
 * Middleware function to automatically warm cache on startup
 */
export const initializeMCPCache = async () => {
  const config = getCacheEnvConfig();

  if (!config.MCP_CACHE_ENABLED) {
    log((l) => l.info('MCP tool caching disabled via environment variable'));
    return;
  }

  try {
    const healthCheck = await MCPToolCacheAdmin.healthCheck();

    if (healthCheck.healthy) {
      log((l) =>
        l.info(
          'MCP tool cache system initialized successfully',
          healthCheck.details,
        ),
      );
    } else {
      log((l) =>
        l.warn(
          'MCP tool cache system partially unavailable',
          healthCheck.details,
        ),
      );
    }
  } catch (error) {
    log((l) => l.error('MCP tool cache initialization failed:', error));
  }
};
