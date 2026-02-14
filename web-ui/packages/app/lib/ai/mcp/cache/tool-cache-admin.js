import { getToolCache } from './tool-cache';
import { log } from '@compliance-theater/logger';
import { getCacheEnabledFlag, getCacheEnabledFlagSync } from '../tool-flags';
export class MCPToolCacheAdmin {
    static async getCache(cb = (x) => x) {
        const toolCache = await getToolCache();
        return await cb(toolCache);
    }
    static async showStats() {
        try {
            const stats = await this.getCache((x) => x.getStats());
            log((l) => l.info('MCP Tool Cache Statistics:', {
                memoryEntries: stats.memorySize,
                redisKeys: stats.redisKeys,
                hitRate: stats.hitRate
                    ? `${(stats.hitRate * 100).toFixed(1)}%`
                    : 'N/A',
            }));
        }
        catch (error) {
            log((l) => l.error('Failed to retrieve cache statistics:', error));
        }
    }
    static async clearCache() {
        try {
            (await getToolCache()).clearAll();
            log((l) => l.info('All MCP tool caches cleared'));
        }
        catch (error) {
            log((l) => l.error('Failed to clear cache:', error));
        }
    }
    static async healthCheck() {
        log((l) => l.verbose('healthCheck:MCP tool caching disabled via environment variable'));
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
            stats: undefined,
        };
        try {
            details.memoryCache = true;
            const stats = await this.getCache((x) => x.getStats());
            details.redisCache = stats.redisKeys >= 0;
            details.stats = stats;
            const healthy = details.memoryCache && details.redisCache;
            return { healthy, details };
        }
        catch (error) {
            log((l) => l.error('Cache health check failed:', error));
            return { healthy: false, details };
        }
    }
}
export const getCacheEnvConfig = () => {
    const toolCacheEnabled = getCacheEnabledFlagSync().value;
    return {
        MCP_CACHE_TTL: parseInt(process.env.MCP_CACHE_TTL || '86400'),
        MCP_CACHE_MAX_MEMORY: parseInt(process.env.MCP_CACHE_MAX_MEMORY || '100'),
        MCP_CACHE_ENABLED: toolCacheEnabled,
        MCP_CACHE_PREFIX: process.env.MCP_CACHE_PREFIX || 'mcp:tools',
    };
};
export const initializeMCPCache = async () => {
    const cacheEnabled = await getCacheEnabledFlag();
    if (!cacheEnabled.value) {
        log((l) => l.info('MCP tool caching disabled via environment variable'));
        return;
    }
    try {
        const healthCheck = await MCPToolCacheAdmin.healthCheck();
        if (healthCheck.healthy) {
            log((l) => l.info('MCP tool cache system initialized successfully', healthCheck.details));
        }
        else {
            log((l) => l.warn('MCP tool cache system partially unavailable', healthCheck.details));
        }
    }
    catch (error) {
        log((l) => l.error('MCP tool cache initialization failed:', error));
    }
};
//# sourceMappingURL=tool-cache-admin.js.map