import { log, LoggedError } from '@compliance-theater/logger';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { globalRequiredSingleton } from '@compliance-theater/typescript';
class UserToolProviderCacheImpl {
    cache = new Map();
    cleanupTimer = null;
    config;
    constructor(config = {}) {
        this.config = {
            maxEntriesPerUser: 3,
            maxTotalEntries: 100,
            ttl: 30 * 60 * 1000,
            cleanupInterval: 5 * 60 * 1000,
            ...config,
        };
        this.startCleanupTimer();
    }
    generateCacheKey(userId, sessionId, configHash) {
        return `${userId}:${sessionId}:${configHash}`;
    }
    generateConfigHash(config) {
        const configString = JSON.stringify({
            writeEnabled: config.writeEnabled,
            memoryDisabled: config.memoryDisabled,
            headers: config.headers
                ? Object.fromEntries(Object.entries(config.headers).filter(([key]) => !key.toLowerCase().includes('auth') &&
                    !key.toLowerCase().includes('cookie') &&
                    key !== 'x-chat-history-id'))
                : {},
        });
        let hash = 0;
        for (let i = 0; i < configString.length; i++) {
            const char = configString.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    async getOrCreate(userId, sessionId, config, factory) {
        const configHash = this.generateConfigHash(config);
        const cacheKey = this.generateCacheKey(userId, sessionId, configHash);
        const cached = this.cache.get(cacheKey);
        if (cached && !this.isExpired(cached)) {
            cached.lastAccessed = Date.now();
            log((l) => l.debug('Tool provider cache hit', { userId, cacheKey }));
            return cached.toolProviders;
        }
        if (cached && this.isExpired(cached)) {
            this.removeEntry(cacheKey, cached);
        }
        log((l) => l.debug('Creating new tool provider set', { userId, cacheKey }));
        try {
            const toolProviders = await factory();
            if (toolProviders.isHealthy) {
                this.enforceEvictionLimits(userId);
                toolProviders.addDisposeListener(() => {
                    this.cache.delete(cacheKey);
                });
                this.cache.set(cacheKey, {
                    toolProviders,
                    lastAccessed: Date.now(),
                    userId,
                    sessionId,
                });
                log((l) => l.debug('Tool provider cached successfully', {
                    userId,
                    cacheKey,
                    cacheSize: this.cache.size,
                }));
            }
            return toolProviders;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'UserToolProviderCache.getOrCreate',
                message: 'Failed to create tool provider set',
                data: { userId, cacheKey },
            });
            throw error;
        }
    }
    delete(cacheKey) {
        this.removeEntry(cacheKey, this.cache.get(cacheKey));
    }
    isExpired(entry) {
        return Date.now() - entry.lastAccessed > this.config.ttl;
    }
    removeEntry(cacheKey, entry) {
        try {
            entry.toolProviders[Symbol.dispose]();
            log((l) => l.debug('Tool provider disposed', {
                userId: entry.userId,
                cacheKey,
            }));
        }
        catch (error) {
            log((l) => l.warn('Error disposing tool provider', {
                userId: entry.userId,
                cacheKey,
                error,
            }));
            this.cache.delete(cacheKey);
        }
    }
    enforceEvictionLimits(currentUserId) {
        const userEntries = Array.from(this.cache.entries()).filter(([, entry]) => entry.userId === currentUserId);
        if (userEntries.length >= this.config.maxEntriesPerUser) {
            const oldestUserEntry = userEntries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0];
            if (oldestUserEntry) {
                try {
                    oldestUserEntry[1].toolProviders[Symbol.dispose]();
                }
                catch (error) {
                    log((l) => l.warn('Error disposing tool provider', {
                        userId: oldestUserEntry[1].userId,
                        cacheKey: oldestUserEntry[0],
                        error,
                    }));
                    this.removeEntry(oldestUserEntry[0], oldestUserEntry[1]);
                }
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
        log((l) => l.debug('Invalidated user tool providers', {
            userId,
            removedCount: userEntries.length,
        }));
    }
    invalidateSession(userId, sessionId) {
        const sessionEntries = Array.from(this.cache.entries()).filter(([, entry]) => entry.userId === userId && entry.sessionId === sessionId);
        for (const [cacheKey, entry] of sessionEntries) {
            this.removeEntry(cacheKey, entry);
        }
        log((l) => l.debug('Invalidated session tool providers', {
            userId,
            sessionId,
            removedCount: sessionEntries.length,
        }));
    }
    cleanup() {
        const expiredEntries = [];
        for (const [cacheKey, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                expiredEntries.push([cacheKey, entry]);
            }
        }
        for (const [, entry] of expiredEntries) {
            try {
                entry.toolProviders[Symbol.dispose]();
            }
            catch (error) {
                log((l) => l.warn('Error disposing tool provider during cleanup', { error }));
            }
        }
        if (expiredEntries.length > 0) {
            log((l) => l.debug('Cleaned up expired tool providers', {
                removedCount: expiredEntries.length,
                remainingCount: this.cache.size,
            }));
        }
    }
    clear() {
        for (const entry of [...this.cache.values()]) {
            try {
                entry.toolProviders[Symbol.dispose]();
            }
            catch (error) {
                log((l) => l.warn('Error disposing tool provider during clear', { error }));
            }
        }
        this.cache.clear();
        log((l) => l.debug('Cleared all cached tool providers'));
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }
    getStats() {
        const userCounts = new Map();
        for (const entry of this.cache.values()) {
            userCounts.set(entry.userId, (userCounts.get(entry.userId) || 0) + 1);
        }
        return {
            totalEntries: this.cache.size,
            userCounts: Object.fromEntries(userCounts),
            config: this.config,
        };
    }
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        for (const [cacheKey, entry] of this.cache.entries()) {
            this.removeEntry(cacheKey, entry);
        }
        log((l) => l.info('User tool provider cache shutdown complete'));
    }
}
const getInstanceInternal = async (config) => {
    const cachingEnabled = await getFeatureFlag('mcp_cache_tools');
    if (!cachingEnabled) {
        const fnNoOp = () => Promise.resolve();
        return {
            getOrCreate: (_userId, _sessionId, _config, factory) => factory(),
            shutdown: fnNoOp,
            clear: fnNoOp,
            invalidateUser: fnNoOp,
            invalidateSession: fnNoOp,
            getStats: () => ({
                totalEntries: 0,
                userCounts: {},
                config: {},
            }),
        };
    }
    return globalRequiredSingleton('@seanm/wedontneednoeducation/lib/ai/mcp/user-tool-provider-cache', () => new UserToolProviderCacheImpl(config));
};
export const getUserToolProviderCache = getInstanceInternal;
//# sourceMappingURL=user-tool-provider-cache.js.map