import { MCPToolCache, serializeCacheEntry } from '@/lib/ai/mcp/cache';
import z from 'zod';
import { wellKnownFlag, wellKnownFlagSync, } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
jest.mock('@compliance-theater/redis');
jest.mock('@compliance-theater/logger', () => ({
    ...jest.requireActual('@compliance-theater/logger'),
}));
import { getRedisClient } from '@compliance-theater/redis';
import { AllFeatureFlagsDefault, } from '@compliance-theater/feature-flags';
const mockRedisClient = {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
};
jest
    .mocked(getRedisClient)
    .mockResolvedValue(mockRedisClient);
describe('MCPToolCache', () => {
    let cache;
    const mockToolSet = {
        'test-tool-1': {
            description: 'Test tool 1',
            inputSchema: z.object({
                param1: z.string(),
                param2: z.number().min(0),
            }),
        },
        'test-tool-2': {
            description: 'Test tool 2',
            inputSchema: z.object({
                param1: z.string(),
                param2: z.number().min(0),
            }),
        },
    };
    const mockOptions = {
        url: 'https://test-server.com/mcp',
        headers: () => Promise.resolve({ Authorization: 'Bearer test-token' }),
        allowWrite: false,
    };
    beforeEach(() => {
        wellKnownFlag.mockImplementation(async (key, salt) => {
            if (key === 'mcp_cache_tools') {
                return {
                    key,
                    userId: salt ?? 'server',
                    value: true,
                };
            }
            return {
                key,
                userId: salt ?? 'server',
                value: AllFeatureFlagsDefault[key],
            };
        });
        wellKnownFlagSync.mockImplementation((key, salt) => {
            if (key === 'mcp_cache_tools') {
                return {
                    key,
                    userId: salt ?? 'server',
                    value: true,
                };
            }
            return {
                key,
                userId: salt ?? 'server',
                value: AllFeatureFlagsDefault[key],
            };
        });
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        cache = new MCPToolCache({ maxMemoryEntries: 5, defaultTtl: 300 });
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.setEx.mockResolvedValue('OK');
        mockRedisClient.del.mockResolvedValue(1);
        mockRedisClient.keys.mockResolvedValue([]);
    });
    afterEach(() => {
    });
    describe('cache key generation', () => {
        it('should generate different keys for different URLs', async () => {
            const options1 = { ...mockOptions, url: 'https://server1.com' };
            const options2 = { ...mockOptions, url: 'https://server2.com' };
            await cache.setCachedTools(options1, mockToolSet);
            await cache.setCachedTools(options2, mockToolSet);
            expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
            const call1 = mockRedisClient.setEx.mock.calls[0];
            const call2 = mockRedisClient.setEx.mock.calls[1];
            expect(call1[0]).not.toEqual(call2[0]);
        });
        it('should generate different keys for different headers', async () => {
            const options1 = {
                ...mockOptions,
                allowWrite: true,
                headers: () => Promise.resolve({ Authorization: 'Bearer token1' }),
            };
            const options2 = {
                ...mockOptions,
                allowWrite: false,
                headers: () => Promise.resolve({ Authorization: 'Bearer token2' }),
            };
            await cache.setCachedTools(options1, mockToolSet);
            await cache.setCachedTools(options2, mockToolSet);
            expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
            const call1 = mockRedisClient.setEx.mock.calls[0];
            const call2 = mockRedisClient.setEx.mock.calls[1];
            expect(call1[0]).not.toEqual(call2[0]);
        });
        it('should generate different keys for different allowWrite settings', async () => {
            const options1 = { ...mockOptions, allowWrite: false };
            const options2 = { ...mockOptions, allowWrite: true };
            await cache.setCachedTools(options1, mockToolSet);
            await cache.setCachedTools(options2, mockToolSet);
            expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
            const call1 = mockRedisClient.setEx.mock.calls[0];
            const call2 = mockRedisClient.setEx.mock.calls[1];
            expect(call1[0]).not.toEqual(call2[0]);
            expect(call1[0]).toContain(':ro');
            expect(call2[0]).toContain(':rw');
        });
    });
    describe('cache storage and retrieval', () => {
        it('should store and retrieve tools from memory cache', async () => {
            await cache.setCachedTools(mockOptions, mockToolSet);
            mockRedisClient.get.mockClear();
            const cachedTools = await cache.getCachedTools(mockOptions);
            expect(cachedTools).toEqual(mockToolSet);
            expect(mockRedisClient.get).not.toHaveBeenCalled();
        });
        it('should fall back to Redis cache when memory cache misses', async () => {
            const cacheEntry = {
                tools: mockToolSet,
                timestamp: Date.now(),
                serverCapabilities: 'test-cap',
            };
            mockRedisClient.get.mockResolvedValue(serializeCacheEntry(cacheEntry));
            const cachedTools = await cache.getCachedTools(mockOptions);
            expect(cachedTools).toEqual(mockToolSet);
            expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
        });
        it('should return null when cache misses', async () => {
            mockRedisClient.get.mockResolvedValue(null);
            const cachedTools = await cache.getCachedTools(mockOptions);
            expect(cachedTools).toBeNull();
            expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
        });
        it('should handle expired cache entries', async () => {
            const currentTime = Date.now();
            const expiredEntry = {
                tools: mockToolSet,
                timestamp: currentTime,
                serverCapabilities: 'test-cap',
            };
            jest.advanceTimersByTime(25 * 60 * 60 * 1000);
            mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredEntry));
            const cachedTools = await cache.getCachedTools(mockOptions);
            expect(cachedTools).toBeNull();
        });
    });
    describe('cache management', () => {
        it('should clear all caches', async () => {
            const testKeys = ['mcp:tools:key1', 'mcp:tools:key2'];
            mockRedisClient.keys.mockResolvedValue(testKeys);
            await cache.clearAll();
            expect(mockRedisClient.keys).toHaveBeenCalledWith('mcp:tools:*');
            expect(mockRedisClient.del).toHaveBeenCalledWith(testKeys);
        });
        it('should provide cache statistics', async () => {
            const testKeys = ['mcp:tools:key1', 'mcp:tools:key2'];
            mockRedisClient.keys.mockResolvedValue(testKeys);
            const stats = await cache.getStats();
            expect(stats).toEqual({
                memorySize: 0,
                redisKeys: 2,
            });
        });
        it('should invalidate specific cache entries', async () => {
            await cache.invalidateCache(mockOptions);
            expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
        });
    });
    describe('memory cache LRU behavior', () => {
        it('should evict oldest entry when cache is full', async () => {
            const smallCache = new MCPToolCache({
                maxMemoryEntries: 2,
                defaultTtl: 300,
            });
            await smallCache.setCachedTools({ ...mockOptions, url: 'https://server1.com' }, mockToolSet);
            jest.advanceTimersByTime(1000);
            await smallCache.setCachedTools({ ...mockOptions, url: 'https://server2.com' }, mockToolSet);
            jest.advanceTimersByTime(1000);
            await smallCache.setCachedTools({ ...mockOptions, url: 'https://server3.com' }, mockToolSet);
            mockRedisClient.get.mockResolvedValue(null);
            const result = await smallCache.getCachedTools({
                ...mockOptions,
                url: 'https://server1.com',
            });
            expect(result).toBeNull();
            mockRedisClient.get.mockClear();
            const result3 = await smallCache.getCachedTools({
                ...mockOptions,
                url: 'https://server3.com',
            });
            expect(result3).toEqual(mockToolSet);
            expect(mockRedisClient.get).not.toHaveBeenCalled();
        });
        it('should respect TTL in memory cache', async () => {
            await cache.setCachedTools(mockOptions, mockToolSet);
            mockRedisClient.get.mockClear();
            let result = await cache.getCachedTools(mockOptions);
            expect(result).toEqual(mockToolSet);
            expect(mockRedisClient.get).not.toHaveBeenCalled();
            jest.advanceTimersByTime(301 * 1000);
            mockRedisClient.get.mockResolvedValue(null);
            result = await cache.getCachedTools(mockOptions);
            expect(result).toBeNull();
            expect(mockRedisClient.get).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=tool-cache.test.js.map