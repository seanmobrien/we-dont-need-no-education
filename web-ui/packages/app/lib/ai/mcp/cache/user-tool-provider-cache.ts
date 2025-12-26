/**
 * @fileoverview User-scoped tool provider cache for maintaining persistent MCP connections
 *
 * This module provides a cache for maintaining ToolProviderSet instances across HTTP requests
 * while ensuring proper user isolation and cleanup. Each user gets their own tool provider
 * instance that persists for the configured TTL, reducing connection overhead and improving
 * performance.
 */

import type {
  CachedToolProvider,
  ToolProviderSet,
  UserToolProviderCache,
  UserToolProviderCacheConfig,
} from '../types';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { globalRequiredSingleton } from '@/lib/typescript';

/**
 * Cache for maintaining ToolProviderSet instances per user across HTTP requests.
 *
 * Features:
 * - Per-user isolation with session-based keys
 * - Automatic TTL-based cleanup
 * - LRU eviction when cache limits are exceeded
 * - Proper disposal of tool providers on cleanup
 * - Memory usage monitoring and limits
 *
 * @example
 * ```typescript
 * const cache = UserToolProviderCache.getInstance();
 *
 * // Get or create tool providers for a user
 * const toolProviders = await cache.getOrCreate(
 *   userId,
 *   sessionId,
 *   async () => toolProviderFactory({ ... })
 * );
 *
 * // Cleanup when done (optional - automatic cleanup also occurs)
 * cache.invalidateUser(userId);
 * ```
 */
class UserToolProviderCacheImpl implements UserToolProviderCache {
  private cache = new Map<string, CachedToolProvider>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly config: UserToolProviderCacheConfig;

  public constructor(config: Partial<UserToolProviderCacheConfig> = {}) {
    this.config = {
      maxEntriesPerUser: 3, // Max 3 different tool provider configs per user
      maxTotalEntries: 100, // Max 100 total entries across all users
      ttl: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * Generate a cache key for a user's tool provider configuration.
   */
  private generateCacheKey(
    userId: string,
    sessionId: string,
    configHash: string,
  ): string {
    return `${userId}:${sessionId}:${configHash}`;
  }

  /**
   * Generate a hash for the tool provider configuration to detect changes.
   */
  private generateConfigHash(config: {
    writeEnabled: boolean;
    memoryDisabled: boolean;
    headers?: Record<string, string>;
  }): string {
    // Create a stable hash of the configuration
    const configString = JSON.stringify({
      writeEnabled: config.writeEnabled,
      memoryDisabled: config.memoryDisabled,
      // Only include non-auth headers in hash to avoid session token changes
      headers: config.headers
        ? Object.fromEntries(
          Object.entries(config.headers).filter(
            ([key]) =>
              !key.toLowerCase().includes('auth') &&
              !key.toLowerCase().includes('cookie') &&
              key !== 'x-chat-history-id',
          ),
        )
        : {},
    });

    // Simple hash function (in production, consider using a crypto hash)
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get or create a tool provider set for a user.
   */
  public async getOrCreate(
    userId: string,
    sessionId: string,
    config: {
      writeEnabled: boolean;
      memoryDisabled: boolean;
      headers?: Record<string, string>;
    },
    factory: () => Promise<ToolProviderSet>,
  ): Promise<ToolProviderSet> {
    const configHash = this.generateConfigHash(config);
    const cacheKey = this.generateCacheKey(userId, sessionId, configHash);

    // Check if we have a valid cached entry
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      // Update last accessed time
      cached.lastAccessed = Date.now();
      log((l) => l.debug('Tool provider cache hit', { userId, cacheKey }));
      return cached.toolProviders;
    }

    // Clean up expired entry if it exists
    if (cached && this.isExpired(cached)) {
      this.removeEntry(cacheKey, cached);
    }

    // Create new tool provider set
    log((l) => l.debug('Creating new tool provider set', { userId, cacheKey }));

    try {
      const toolProviders = await factory();
      if (toolProviders.isHealthy) {
        // Check cache size limits before adding
        this.enforceEvictionLimits(userId);
        toolProviders.addDisposeListener(() => {
          this.cache.delete(cacheKey);
        });
        // Cache the new tool provider
        this.cache.set(cacheKey, {
          toolProviders,
          lastAccessed: Date.now(),
          userId,
          sessionId,
        });

        log((l) =>
          l.debug('Tool provider cached successfully', {
            userId,
            cacheKey,
            cacheSize: this.cache.size,
          }),
        );
      }
      return toolProviders;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'UserToolProviderCache.getOrCreate',
        message: 'Failed to create tool provider set',
        data: { userId, cacheKey },
      });
      throw error;
    }
  }

  delete(cacheKey: string): void {
    this.removeEntry(cacheKey, this.cache.get(cacheKey)!);
  }

  /**
   * Check if a cached entry is expired.
   */
  private isExpired(entry: CachedToolProvider): boolean {
    return Date.now() - entry.lastAccessed > this.config.ttl;
  }

  /**
   * Remove and properly dispose of a cache entry.
   */
  private removeEntry(cacheKey: string, entry: CachedToolProvider): void {
    try {
      entry.toolProviders[Symbol.dispose]();
      log((l) =>
        l.debug('Tool provider disposed', {
          userId: entry.userId,
          cacheKey,
        }),
      );
    } catch (error) {
      log((l) =>
        l.warn('Error disposing tool provider', {
          userId: entry.userId,
          cacheKey,
          error,
        }),
      );
      this.cache.delete(cacheKey);
    }
  }

  /**
   * Enforce cache size limits with LRU eviction.
   */
  private enforceEvictionLimits(currentUserId: string): void {
    // Check per-user limit
    const userEntries = Array.from(this.cache.entries()).filter(
      ([, entry]) => entry.userId === currentUserId,
    );

    if (userEntries.length >= this.config.maxEntriesPerUser) {
      // Remove oldest entry for this user
      const oldestUserEntry = userEntries.sort(
        ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
      )[0];

      if (oldestUserEntry) {
        try {
          oldestUserEntry[1].toolProviders[Symbol.dispose]();
        } catch (error) {
          log((l) =>
            l.warn('Error disposing tool provider', {
              userId: oldestUserEntry[1].userId,
              cacheKey: oldestUserEntry[0],
              error,
            }),
          );
          this.removeEntry(oldestUserEntry[0], oldestUserEntry[1]);
        }
      }
    }

    // Check total cache limit
    if (this.cache.size >= this.config.maxTotalEntries) {
      // Remove oldest entry globally
      const oldestEntry = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
      )[0];

      if (oldestEntry) {
        this.removeEntry(oldestEntry[0], oldestEntry[1]);
      }
    }
  }

  /**
   * Invalidate all cached tool providers for a specific user.
   */
  public invalidateUser(userId: string): void {
    const userEntries = Array.from(this.cache.entries()).filter(
      ([, entry]) => entry.userId === userId,
    );

    for (const [cacheKey, entry] of userEntries) {
      this.removeEntry(cacheKey, entry);
    }

    log((l) =>
      l.debug('Invalidated user tool providers', {
        userId,
        removedCount: userEntries.length,
      }),
    );
  }

  /**
   * Invalidate all cached tool providers for a specific user session.
   */
  public invalidateSession(userId: string, sessionId: string): void {
    const sessionEntries = Array.from(this.cache.entries()).filter(
      ([, entry]) => entry.userId === userId && entry.sessionId === sessionId,
    );

    for (const [cacheKey, entry] of sessionEntries) {
      this.removeEntry(cacheKey, entry);
    }

    log((l) =>
      l.debug('Invalidated session tool providers', {
        userId,
        sessionId,
        removedCount: sessionEntries.length,
      }),
    );
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(): void {
    const expiredEntries: [string, CachedToolProvider][] = [];

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredEntries.push([cacheKey, entry]);
      }
    }

    for (const [, entry] of expiredEntries) {
      try {
        entry.toolProviders[Symbol.dispose]();
      } catch (error) {
        log((l) =>
          l.warn('Error disposing tool provider during cleanup', { error }),
        );
      }
    }

    if (expiredEntries.length > 0) {
      log((l) =>
        l.debug('Cleaned up expired tool providers', {
          removedCount: expiredEntries.length,
          remainingCount: this.cache.size,
        }),
      );
    }
  }

  /**
   * Clear all cached tool providers and dispose them.
   */
  public clear(): void {
    for (const entry of [...this.cache.values()]) {
      try {
        entry.toolProviders[Symbol.dispose]();
      } catch (error) {
        log((l) =>
          l.warn('Error disposing tool provider during clear', { error }),
        );
      }
    }

    this.cache.clear();
    log((l) => l.debug('Cleared all cached tool providers'));
  }

  /**
   * Start the periodic cleanup timer.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Get cache statistics.
   */
  public getStats() {
    const userCounts = new Map<string, number>();
    for (const entry of this.cache.values()) {
      userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
    }

    return {
      totalEntries: this.cache.size,
      userCounts: Object.fromEntries(userCounts),
      config: this.config,
    };
  }

  /**
   * Shutdown the cache and clean up all entries.
   */
  public shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Dispose all cached tool providers
    for (const [cacheKey, entry] of this.cache.entries()) {
      this.removeEntry(cacheKey, entry);
    }

    log((l) => l.info('User tool provider cache shutdown complete'));
  }
}
/**
 * Get the singleton instance of the cache.
 */
const getInstanceInternal = async (
  config?: Partial<UserToolProviderCacheConfig>,
): Promise<UserToolProviderCache> => {
  const cachingEnabled = await getFeatureFlag('mcp_cache_tools');
  if (!cachingEnabled) {
    const fnNoOp = () => Promise.resolve();
    return {
      getOrCreate: (
        _userId: string,
        _sessionId: string,
        _config: {
          writeEnabled: boolean;
          memoryDisabled: boolean;
          headers?: Record<string, string>;
        },
        factory: () => Promise<ToolProviderSet>,
      ) => factory(),
      shutdown: fnNoOp,
      clear: fnNoOp,
      invalidateUser: fnNoOp,
      invalidateSession: fnNoOp,
      getStats: () => ({
        totalEntries: 0,
        userCounts: {},
        config: {} as UserToolProviderCacheConfig,
      }),
    };
  }
  return globalRequiredSingleton(
    '@seanm/wedontneednoeducation/lib/ai/mcp/user-tool-provider-cache',
    () => new UserToolProviderCacheImpl(config),
  );
};

export const getUserToolProviderCache = getInstanceInternal;
