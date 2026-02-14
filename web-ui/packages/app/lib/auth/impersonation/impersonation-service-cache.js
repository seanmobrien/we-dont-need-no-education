import { log, LoggedError } from '@compliance-theater/logger';
export class ImpersonationServiceCache {
    static instance = null;
    cache = new Map();
    cleanupTimer = null;
    config;
    constructor(config = {}) {
        this.config = {
            maxEntriesPerUser: 5,
            maxTotalEntries: 200,
            ttl: 60 * 60 * 1000,
            cleanupInterval: 10 * 60 * 1000,
            ...config,
        };
        this.startCleanupTimer();
    }
    static getInstance(config) {
        if (!ImpersonationServiceCache.instance) {
            ImpersonationServiceCache.instance = new ImpersonationServiceCache(config);
        }
        return ImpersonationServiceCache.instance;
    }
    generateCacheKey(userId, audience) {
        const normalizedAudience = (audience ?? '__no-audience__')
            .toLowerCase()
            .trim();
        return `${userId}:${normalizedAudience}`;
    }
    async getOrCreate(userId, audience, factory) {
        const cacheKey = this.generateCacheKey(userId, audience);
        const cached = this.cache.get(cacheKey);
        if (cached && !this.isExpired(cached)) {
            cached.lastAccessed = Date.now();
            log((l) => l.debug('Impersonation service cache hit', {
                userId,
                audience,
                cacheKey,
            }));
            return cached.service;
        }
        if (cached && this.isExpired(cached)) {
            this.removeEntry(cacheKey, cached);
        }
        log((l) => l.debug('Creating new impersonation service', {
            userId,
            audience,
            cacheKey,
        }));
        try {
            const service = await factory();
            this.enforceEvictionLimits(userId);
            this.cache.set(cacheKey, {
                service,
                lastAccessed: Date.now(),
                userId,
                audience,
            });
            log((l) => l.debug('Impersonation service cached successfully', {
                userId,
                audience,
                cacheKey,
                cacheSize: this.cache.size,
            }));
            return service;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ImpersonationServiceCache.getOrCreate',
                message: 'Failed to create impersonation service',
                data: { userId, audience, cacheKey },
            });
            throw error;
        }
    }
    isExpired(entry) {
        return Date.now() - entry.lastAccessed > this.config.ttl;
    }
    removeEntry(cacheKey, entry) {
        try {
            if ('clearCache' in entry.service &&
                typeof entry.service.clearCache === 'function') {
                entry.service.clearCache();
            }
            log((l) => l.debug('Impersonation service disposed', {
                userId: entry.userId,
                audience: entry.audience,
                cacheKey,
            }));
        }
        catch (error) {
            log((l) => l.warn('Error disposing impersonation service', {
                userId: entry.userId,
                audience: entry.audience,
                cacheKey,
                error,
            }));
        }
        this.cache.delete(cacheKey);
    }
    enforceEvictionLimits(currentUserId) {
        const userEntries = Array.from(this.cache.entries()).filter(([, entry]) => entry.userId === currentUserId);
        if (userEntries.length >= this.config.maxEntriesPerUser) {
            const oldestUserEntry = userEntries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0];
            if (oldestUserEntry) {
                this.removeEntry(oldestUserEntry[0], oldestUserEntry[1]);
            }
        }
        if (this.cache.size >= this.config.maxTotalEntries) {
            const oldestEntry = Array.from(this.cache.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0];
            if (oldestEntry) {
                this.removeEntry(oldestEntry[0], oldestEntry[1]);
            }
        }
    }
    invalidateUser(userId) {
        const userEntries = Array.from(this.cache.entries()).filter(([, entry]) => entry.userId === userId);
        for (const [cacheKey, entry] of userEntries) {
            this.removeEntry(cacheKey, entry);
        }
        log((l) => l.debug('Invalidated user impersonation services', {
            userId,
            removedCount: userEntries.length,
        }));
    }
    invalidateAudience(userId, audience) {
        const cacheKey = this.generateCacheKey(userId, audience);
        const entry = this.cache.get(cacheKey);
        if (entry) {
            this.removeEntry(cacheKey, entry);
            log((l) => l.debug('Invalidated audience impersonation service', {
                userId,
                audience,
                cacheKey,
            }));
        }
    }
    getUserAudiences(userId) {
        return Array.from(this.cache.values())
            .filter((entry) => entry.audience && entry.userId === userId)
            .map((entry) => entry.audience);
    }
    has(userId, audience) {
        const cacheKey = this.generateCacheKey(userId, audience);
        const entry = this.cache.get(cacheKey);
        return entry !== undefined && !this.isExpired(entry);
    }
    cleanup() {
        const expiredEntries = [];
        for (const [cacheKey, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                expiredEntries.push([cacheKey, entry]);
            }
        }
        for (const [cacheKey, entry] of expiredEntries) {
            this.removeEntry(cacheKey, entry);
        }
        if (expiredEntries.length > 0) {
            log((l) => l.debug('Cleaned up expired impersonation services', {
                removedCount: expiredEntries.length,
                remainingCount: this.cache.size,
            }));
        }
    }
    clear() {
        for (const [cacheKey, entry] of this.cache.entries()) {
            this.removeEntry(cacheKey, entry);
        }
        log((l) => l.debug('Cleared all cached impersonation services'));
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    getStats() {
        const userCounts = new Map();
        const audienceCounts = new Map();
        for (const entry of this.cache.values()) {
            userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
            if (entry.audience) {
                audienceCounts.set(entry.audience, (audienceCounts.get(entry.audience) || 0) + 1);
            }
        }
        return {
            totalEntries: this.cache.size,
            userCounts: Object.fromEntries(userCounts),
            audienceCounts: Object.fromEntries(audienceCounts),
            config: this.config,
        };
    }
    getDebugInfo() {
        return Array.from(this.cache.entries()).map(([cacheKey, entry]) => ({
            cacheKey,
            userId: entry.userId,
            audience: entry.audience,
            lastAccessed: new Date(entry.lastAccessed).toISOString(),
            age: Date.now() - entry.lastAccessed,
            isExpired: this.isExpired(entry),
        }));
    }
    refresh(userId, audience) {
        this.invalidateAudience(userId, audience);
        log((l) => l.debug('Refreshed impersonation service', {
            userId,
            audience,
        }));
    }
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        log((l) => l.info('Impersonation service cache shutdown complete'));
    }
}
//# sourceMappingURL=impersonation-service-cache.js.map