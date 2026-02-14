import { createHash } from 'crypto';
import { getRedisClient } from '@compliance-theater/redis';
import { log, LoggedError } from '@compliance-theater/logger';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import z from 'zod';
import { MemoryToolCache } from './memory-tool-cache';
import { getCacheEnabledFlag } from '../tool-flags';
const MCP_TOOL_CACHE_SINGLETON_KEY = '@noeducation/mcp-tool-cache';
const DEFAULT_CONFIG = {
    defaultTtl: 24 * 60 * 60,
    maxMemoryEntries: 100,
    keyPrefix: 'mcp:tools',
};
export class MCPToolCache {
    memoryCache;
    config;
    redisSubscriber;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.memoryCache = new MemoryToolCache(this.config.maxMemoryEntries, this.config.defaultTtl);
        this.setupRedisInvalidationSubscription().catch((error) => {
            log((l) => l.warn('Failed to initialize Redis keyspace notifications:', error));
        });
    }
    createCacheKey(options) {
        const headersStr = options.headers
            ? JSON.stringify(Object.entries(options.headers).sort())
            : '';
        const headersHash = createHash('sha256')
            .update(headersStr)
            .digest('hex')
            .substring(0, 16);
        const urlHash = createHash('sha256')
            .update(options.url)
            .digest('hex')
            .substring(0, 16);
        const accessLevel = options.allowWrite ? 'rw' : 'ro';
        return `${this.config.keyPrefix}:${urlHash}:${headersHash}:${accessLevel}`;
    }
    async getCachedTools(options) {
        const enabled = (await getCacheEnabledFlag()).value;
        if (!enabled) {
            log((l) => l.verbose(`ToolProviderFactory: Tool Caching disabled.`));
            return null;
        }
        const cacheKey = this.createCacheKey(options);
        try {
            const memoryEntry = this.memoryCache.get(cacheKey);
            if (memoryEntry && this.isEntryValid(memoryEntry)) {
                log((l) => l.debug(`MCP tools cache hit (memory): ${cacheKey}`));
                return memoryEntry.tools;
            }
            const redis = await getRedisClient();
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                try {
                    const entry = deserializedCacheEntry(cachedData);
                    if (entry && this.isEntryValid(entry)) {
                        const remainingTtl = Math.max(0, this.config.defaultTtl -
                            Math.floor((Date.now() - entry.timestamp) / 1000));
                        this.memoryCache.set(cacheKey, entry, remainingTtl);
                        log((l) => l.debug(`MCP tools cache hit (Redis): ${cacheKey}`));
                        return entry.tools;
                    }
                }
                catch (parseError) {
                    log((l) => l.warn('Failed to parse cached MCP tools', {
                        cacheKey,
                        error: parseError,
                    }));
                }
            }
            log((l) => l.debug(`MCP tools cache miss: ${cacheKey}`));
            return null;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'MCPToolCache.getCachedTools',
                message: 'Failed to retrieve cached tools',
                data: { cacheKey, options: { ...options, headers: '[REDACTED]' } },
            });
            return null;
        }
    }
    async setCachedTools(options, tools, ttl) {
        const enabled = (await getCacheEnabledFlag()).value;
        if (!enabled) {
            return;
        }
        const cacheKey = this.createCacheKey(options);
        const entry = {
            tools,
            timestamp: Date.now(),
            serverCapabilities: this.extractServerCapabilities(tools),
        };
        try {
            const cacheTtl = ttl || this.config.defaultTtl;
            this.memoryCache.set(cacheKey, entry, cacheTtl);
            const redis = await getRedisClient();
            const serialized = serializeCacheEntry(entry);
            if (!serialized) {
                log((l) => l.warn(`Failed to serialize MCP tools for storing in redis; will be available in memory cache only: ${cacheKey}`));
                return;
            }
            await redis.setEx(cacheKey, cacheTtl, serialized);
            log((l) => l.debug(`MCP tools cached: ${cacheKey}`, {
                toolCount: Object.keys(tools).length,
                ttl: cacheTtl,
            }));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'MCPToolCache.setCachedTools',
                message: 'Failed to cache tools',
                data: { cacheKey, toolCount: Object.keys(tools).length },
            });
        }
    }
    async invalidateCache(options) {
        const cacheKey = this.createCacheKey(options);
        try {
            this.memoryCache.clear();
            const redis = await getRedisClient();
            await redis.del(cacheKey);
            log((l) => l.info(`MCP tools cache invalidated: ${cacheKey}`));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'MCPToolCache.invalidateCache',
                message: 'Failed to invalidate cache',
                data: { cacheKey },
            });
        }
    }
    async clearAll() {
        try {
            this.memoryCache.clear();
            const redis = await getRedisClient();
            const keys = await redis.keys(`${this.config.keyPrefix}:*`);
            if (keys.length > 0) {
                await redis.del(keys);
            }
            log((l) => l.info('All MCP tools cache cleared', { clearedKeys: keys.length }));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'MCPToolCache.clearAll',
                message: 'Failed to clear all cache',
            });
        }
    }
    async getStats() {
        try {
            const enabled = (await getCacheEnabledFlag()).value;
            if (!enabled) {
                return {
                    memorySize: -1,
                    redisKeys: -1,
                };
            }
            const redis = await getRedisClient();
            const redisKeys = await redis.keys(`${this.config.keyPrefix}:*`);
            return {
                memorySize: this.memoryCache.size(),
                redisKeys: redisKeys.length,
            };
        }
        catch {
            return {
                memorySize: this.memoryCache.size(),
                redisKeys: 0,
            };
        }
    }
    isEntryValid(entry) {
        const age = Date.now() - entry.timestamp;
        const maxAge = this.config.defaultTtl * 1000;
        return age < maxAge;
    }
    async setupRedisInvalidationSubscription() {
        try {
            this.redisSubscriber = await getRedisClient({ subscribeMode: true });
            await this.redisSubscriber.configSet('notify-keyspace-events', 'Ex');
            await this.redisSubscriber.pSubscribe(`__keyevent@0__:expired`, (message) => {
                if (message && message.startsWith(this.config.keyPrefix)) {
                    log((l) => l.debug(`Redis key expired, invalidating memory cache: ${message}`));
                    this.memoryCache.invalidateKey(message);
                }
            });
            log((l) => l.debug('Redis keyspace notifications enabled for MCP tool cache'));
        }
        catch (error) {
            log((l) => l.warn('Failed to setup Redis keyspace notifications for cache invalidation', error));
        }
    }
    async dispose() {
        try {
            if (this.redisSubscriber) {
                await this.redisSubscriber.pUnsubscribe();
                await this.redisSubscriber.quit();
            }
            this.memoryCache.clear();
        }
        catch (error) {
            log((l) => l.warn('Error during cache disposal:', error));
        }
    }
    extractServerCapabilities(tools) {
        const toolNames = Object.keys(tools).sort();
        return createHash('md5')
            .update(JSON.stringify(toolNames))
            .digest('hex')
            .substring(0, 8);
    }
}
export const isSchema = (value) => !!value && value instanceof z.ZodType;
let zodex = undefined;
export const serializeWithSchema = (data) => {
    return JSON.stringify(data, (_key, value) => {
        if (!isSchema(value)) {
            return value;
        }
        zodex = zodex ?? require('zodex').Zodex;
        if (!zodex) {
            throw new TypeError('Zodex module is required for schema serialization');
        }
        return {
            __zerialize__schemaField: true,
            serialized: zodex.zerialize(value),
        };
    });
};
const isSerializedSchema = (value) => !!value &&
    typeof value === 'object' &&
    '__zerialize__schemaField' in value &&
    value.__zerialize__schemaField === true &&
    'serialized' in value &&
    typeof value.serialized === 'string';
export const deserializeWithSchema = (json) => {
    return JSON.parse(json, (_key, value) => {
        if (!isSerializedSchema(value)) {
            return value;
        }
        try {
            zodex = zodex ?? require('zodex').Zodex;
            if (!zodex) {
                throw new TypeError('Zodex module is required for schema serialization');
            }
            return zodex.dezerialize(value.serialized);
        }
        catch (error) {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                critical: false,
                source: 'MCPToolCache.deserializedCacheEntry',
            });
            log((l) => l.warn('Failed to parse cached MCP tools', {
                error: le.toString(),
                json,
            }));
            return value;
        }
    });
};
export const serializeCacheEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
        return undefined;
    }
    return JSON.stringify(entry, (key, value) => {
        if (key !== 'tools' || !value || typeof value !== 'object') {
            return value;
        }
        const serializedTools = {};
        for (const [toolName, tool] of Object.entries(value)) {
            serializedTools[toolName] = serializeWithSchema(tool);
        }
        return serializedTools;
    });
};
export const deserializedCacheEntry = (json) => {
    if (!json ||
        typeof json !== 'string' ||
        json === 'null' ||
        json === 'undefined') {
        return undefined;
    }
    try {
        return JSON.parse(json, (key, value) => {
            if (key !== 'tools' || !value || typeof value !== 'object') {
                return value;
            }
            return Object.entries(value).reduce((acc, [toolName, toolJson]) => {
                if (!toolJson) {
                    return acc;
                }
                const tool = deserializeWithSchema(typeof toolJson === 'string' ? toolJson : JSON.stringify(toolJson));
                if (!tool) {
                    log((l) => l.warn('Unexpected null tool after deserialization', {
                        toolName,
                    }));
                }
                else {
                    acc[toolName] = tool;
                }
                return acc;
            }, {});
        });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            critical: false,
            source: 'MCPToolCache.deserializedCacheEntry',
        });
        log((l) => l.warn('Failed to parse cached MCP tools', {
            error: le.toString(),
            json,
        }));
        return undefined;
    }
};
export const getToolCache = async () => {
    const existing = SingletonProvider.Instance.get(MCP_TOOL_CACHE_SINGLETON_KEY);
    if (existing) {
        return existing;
    }
    const instance = new MCPToolCache();
    SingletonProvider.Instance.set(MCP_TOOL_CACHE_SINGLETON_KEY, instance);
    return instance;
};
export const configureToolCache = async (config) => {
    const instance = new MCPToolCache(config);
    SingletonProvider.Instance.set(MCP_TOOL_CACHE_SINGLETON_KEY, instance);
    return instance;
};
//# sourceMappingURL=tool-cache.js.map