/**
 * @fileoverview User-scoped impersonation service cache for maintaining persistent service instances
 *
 * This module provides a cache for maintaining ImpersonationService instances across HTTP requests
 * while ensuring proper user isolation and cleanup. Each user+audience combination gets their own
 * service instance that persists for the configured TTL, reducing token refresh overhead and
 * improving performance.
 */

import type { ImpersonationService } from './index';
import { log } from '/lib/logger';
import { LoggedError } from '/lib/react-util/errors/logged-error';

interface CachedImpersonationService {
  service: ImpersonationService;
  lastAccessed: number;
  userId: string;
  audience: string;
}

interface ImpersonationServiceCacheConfig {
  /** Maximum number of cached services per user */
  maxEntriesPerUser: number;
  /** Maximum total entries across all users */
  maxTotalEntries: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Cache for maintaining ImpersonationService instances per user and audience across HTTP requests.
 *
 * Features:
 * - Per-user isolation with audience-based keys
 * - Automatic TTL-based cleanup
 * - LRU eviction when cache limits are exceeded
 * - Proper disposal of services on cleanup
 * - Memory usage monitoring and limits
 * - Thread-safe operations
 *
 * @example
 * ```typescript
 * const cache = ImpersonationServiceCache.getInstance();
 *
 * // Get or create impersonation service for a user+audience
 * const service = await cache.getOrCreate(
 *   userId,
 *   audience,
 *   async () => impersonationFactory.create({ ... })
 * );
 *
 * // Cleanup when done (optional - automatic cleanup also occurs)
 * cache.invalidateUser(userId);
 * cache.invalidateAudience(userId, audience);
 * ```
 */
export class ImpersonationServiceCache {
  private static instance: ImpersonationServiceCache | null = null;
  private cache = new Map<string, CachedImpersonationService>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly config: ImpersonationServiceCacheConfig;

  private constructor(config: Partial<ImpersonationServiceCacheConfig> = {}) {
    this.config = {
      maxEntriesPerUser: 5, // Max 5 different audiences per user
      maxTotalEntries: 200, // Max 200 total entries across all users
      ttl: 60 * 60 * 1000, // 60 minutes (longer than tool provider due to token refresh cost)
      cleanupInterval: 10 * 60 * 1000, // Cleanup every 10 minutes
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * Get the singleton instance of the cache.
   */
  public static getInstance(
    config?: Partial<ImpersonationServiceCacheConfig>,
  ): ImpersonationServiceCache {
    if (!ImpersonationServiceCache.instance) {
      ImpersonationServiceCache.instance = new ImpersonationServiceCache(
        config,
      );
    }
    return ImpersonationServiceCache.instance;
  }

  /**
   * Generate a cache key for a user's impersonation service by audience.
   */
  private generateCacheKey(userId: string, audience: string): string {
    // Normalize audience to handle variations
    const normalizedAudience = audience.toLowerCase().trim();
    return `${userId}:${normalizedAudience}`;
  }

  /**
   * Get or create an impersonation service for a user and audience.
   */
  public async getOrCreate(
    userId: string,
    audience: string,
    factory: () => Promise<ImpersonationService>,
  ): Promise<ImpersonationService> {
    const cacheKey = this.generateCacheKey(userId, audience);

    // Check if we have a valid cached entry
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      // Update last accessed time
      cached.lastAccessed = Date.now();
      log((l) =>
        l.debug('Impersonation service cache hit', {
          userId,
          audience,
          cacheKey,
        }),
      );
      return cached.service;
    }

    // Clean up expired entry if it exists
    if (cached && this.isExpired(cached)) {
      this.removeEntry(cacheKey, cached);
    }

    // Create new impersonation service
    log((l) =>
      l.debug('Creating new impersonation service', {
        userId,
        audience,
        cacheKey,
      }),
    );

    try {
      const service = await factory();

      // Check cache size limits before adding
      this.enforceEvictionLimits(userId);

      // Cache the new service
      this.cache.set(cacheKey, {
        service,
        lastAccessed: Date.now(),
        userId,
        audience,
      });

      log((l) =>
        l.debug('Impersonation service cached successfully', {
          userId,
          audience,
          cacheKey,
          cacheSize: this.cache.size,
        }),
      );

      return service;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ImpersonationServiceCache.getOrCreate',
        message: 'Failed to create impersonation service',
        data: { userId, audience, cacheKey },
      });
      throw error;
    }
  }

  /**
   * Check if a cached entry is expired.
   */
  private isExpired(entry: CachedImpersonationService): boolean {
    return Date.now() - entry.lastAccessed > this.config.ttl;
  }

  /**
   * Remove and properly dispose of a cache entry.
   */
  private removeEntry(
    cacheKey: string,
    entry: CachedImpersonationService,
  ): void {
    try {
      // Call clearCache if the service supports it
      if (
        'clearCache' in entry.service &&
        typeof entry.service.clearCache === 'function'
      ) {
        (entry.service.clearCache as () => Promise<void> | void)();
      }

      log((l) =>
        l.debug('Impersonation service disposed', {
          userId: entry.userId,
          audience: entry.audience,
          cacheKey,
        }),
      );
    } catch (error) {
      log((l) =>
        l.warn('Error disposing impersonation service', {
          userId: entry.userId,
          audience: entry.audience,
          cacheKey,
          error,
        }),
      );
    }
    this.cache.delete(cacheKey);
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
        this.removeEntry(oldestUserEntry[0], oldestUserEntry[1]);
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
   * Invalidate all cached impersonation services for a specific user.
   */
  public invalidateUser(userId: string): void {
    const userEntries = Array.from(this.cache.entries()).filter(
      ([, entry]) => entry.userId === userId,
    );

    for (const [cacheKey, entry] of userEntries) {
      this.removeEntry(cacheKey, entry);
    }

    log((l) =>
      l.debug('Invalidated user impersonation services', {
        userId,
        removedCount: userEntries.length,
      }),
    );
  }

  /**
   * Invalidate cached impersonation service for a specific user and audience.
   */
  public invalidateAudience(userId: string, audience: string): void {
    const cacheKey = this.generateCacheKey(userId, audience);
    const entry = this.cache.get(cacheKey);

    if (entry) {
      this.removeEntry(cacheKey, entry);
      log((l) =>
        l.debug('Invalidated audience impersonation service', {
          userId,
          audience,
          cacheKey,
        }),
      );
    }
  }

  /**
   * Get all audiences cached for a specific user.
   */
  public getUserAudiences(userId: string): string[] {
    return Array.from(this.cache.values())
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.audience);
  }

  /**
   * Check if a service is cached for the given user and audience.
   */
  public has(userId: string, audience: string): boolean {
    const cacheKey = this.generateCacheKey(userId, audience);
    const entry = this.cache.get(cacheKey);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(): void {
    const expiredEntries: [string, CachedImpersonationService][] = [];

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredEntries.push([cacheKey, entry]);
      }
    }

    for (const [cacheKey, entry] of expiredEntries) {
      this.removeEntry(cacheKey, entry);
    }

    if (expiredEntries.length > 0) {
      log((l) =>
        l.debug('Cleaned up expired impersonation services', {
          removedCount: expiredEntries.length,
          remainingCount: this.cache.size,
        }),
      );
    }
  }

  /**
   * Clear all cached impersonation services and dispose them.
   */
  public clear(): void {
    for (const [cacheKey, entry] of this.cache.entries()) {
      this.removeEntry(cacheKey, entry);
    }

    log((l) => l.debug('Cleared all cached impersonation services'));
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
    const audienceCounts = new Map<string, number>();

    for (const entry of this.cache.values()) {
      userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
      audienceCounts.set(
        entry.audience,
        (audienceCounts.get(entry.audience) || 0) + 1,
      );
    }

    return {
      totalEntries: this.cache.size,
      userCounts: Object.fromEntries(userCounts),
      audienceCounts: Object.fromEntries(audienceCounts),
      config: this.config,
    };
  }

  /**
   * Get detailed information about cached services for debugging.
   */
  public getDebugInfo() {
    return Array.from(this.cache.entries()).map(([cacheKey, entry]) => ({
      cacheKey,
      userId: entry.userId,
      audience: entry.audience,
      lastAccessed: new Date(entry.lastAccessed).toISOString(),
      age: Date.now() - entry.lastAccessed,
      isExpired: this.isExpired(entry),
    }));
  }

  /**
   * Refresh a cached service by removing it from cache (next access will recreate it).
   */
  public refresh(userId: string, audience: string): void {
    this.invalidateAudience(userId, audience);
    log((l) =>
      l.debug('Refreshed impersonation service', {
        userId,
        audience,
      }),
    );
  }

  /**
   * Shutdown the cache and clean up all entries.
   */
  public shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Dispose all cached services
    this.clear();

    log((l) => l.info('Impersonation service cache shutdown complete'));
  }
}
