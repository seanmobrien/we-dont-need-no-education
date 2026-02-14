import { FlagsmithRedisCache } from '@compliance-theater/feature-flags/flagsmith-cache';
import { getRedisClient } from '@compliance-theater/redis';
import { Flags } from 'flagsmith-nodejs';
import { hideConsoleOutput } from '@/__tests__/test-utils';
const defaultFlagsOptions = { flags: {}, traits: {} };
describe('FlagsmithRedisCache', () => {
    let mockRedisClient;
    beforeEach(async () => {
        mockRedisClient = await getRedisClient();
    });
    it('should construct with default options', async () => {
        const cache = new FlagsmithRedisCache();
        await cache.set('test-key', new Flags(defaultFlagsOptions));
        expect(mockRedisClient.set).toHaveBeenCalledWith('flagsmith:test-key', expect.any(String), expect.objectContaining({ EX: 3600 }));
    });
    it('should use provided options', async () => {
        const cache = new FlagsmithRedisCache({
            redis: {
                ttl: 1234,
                keyPrefix: 'custom',
            },
            lru: {
                max: 5,
                ttl: 60,
            }
        });
        await cache.set('test-key', new Flags(defaultFlagsOptions));
        expect(mockRedisClient.set).toHaveBeenCalledWith('custom:test-key', expect.any(String), expect.objectContaining({ EX: 1234 }));
    });
    it('should return value from LRU if present (L1 hit)', async () => {
        const cache = new FlagsmithRedisCache();
        const flags = new Flags({ feature: { id: 1, enabled: true, value: 'test' } });
        await cache.set('test-key', flags);
        mockRedisClient.get.mockClear();
        const result = await cache.get('test-key');
        expect(result).toEqual(flags);
        expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
    it('should consider an empty key as a fail-free no-op', async () => {
        const cache = new FlagsmithRedisCache();
        await cache.set(null, new Flags(defaultFlagsOptions));
    });
    it('should fetch from Redis if not in LRU (L1 miss, L2 hit) and populate LRU', async () => {
        const cache = new FlagsmithRedisCache({ redis: { keyPrefix: 'test' } });
        const flagsData = { feature: { id: 1, enabled: true, value: 'test' } };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(flagsData));
        const result = await cache.get('miss-key');
        expect(mockRedisClient.get).toHaveBeenCalledWith('test:miss-key');
        expect(result).toBeInstanceOf(Flags);
        mockRedisClient.get.mockClear();
        const result2 = await cache.get('miss-key');
        expect(mockRedisClient.get).not.toHaveBeenCalled();
        expect(result2).toBeInstanceOf(Flags);
    });
    it('should return undefined if not in LRU or Redis (L1 miss, L2 miss)', async () => {
        const cache = new FlagsmithRedisCache();
        mockRedisClient.get.mockResolvedValue(null);
        const result = await cache.get('missing');
        expect(result).toBeUndefined();
    });
    describe('should handle Redis errors gracefully', () => {
        it('get', async () => {
            hideConsoleOutput().setup();
            const cache = new FlagsmithRedisCache();
            mockRedisClient.get.mockRejectedValue(new Error('Redis is down'));
            const result = await cache.get('key');
            expect(result).toBeUndefined();
        });
        it('set', async () => {
            hideConsoleOutput().setup();
            const cache = new FlagsmithRedisCache();
            mockRedisClient.set.mockRejectedValue(new Error('Redis is down'));
            const result = await cache.set('key', new Flags({ feature: { id: 1, enabled: true, value: 'test' } }));
            expect(result).toBeUndefined();
        });
        it('has', async () => {
            hideConsoleOutput().setup();
            const cache = new FlagsmithRedisCache();
            mockRedisClient.exists.mockRejectedValue(new Error('Redis is down'));
            const result = await cache.has('key');
            expect(result).toBe(false);
        });
    });
    it('should handle has() correctly', async () => {
        const cache = new FlagsmithRedisCache();
        mockRedisClient.exists.mockResolvedValue(0);
        expect(await cache.has('key')).toBe(false);
        mockRedisClient.exists.mockResolvedValue(1);
        expect(await cache.has('key')).toBe(true);
        await cache.set('key', new Flags(defaultFlagsOptions));
        mockRedisClient.exists.mockClear();
        expect(await cache.has('key')).toBe(true);
        expect(mockRedisClient.exists).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=flagsmith-cache.test.js.map