import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
jest.mock('@compliance-theater/feature-flags/server', () => ({
    getFeatureFlag: jest.fn(),
    getAllFeatureFlags: jest.fn(),
}));
import { mockFlagsmithInstanceFactory } from '@/__tests__/setup/jest.setup';
import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import { getUserToolProviderCache } from '@/lib/ai/mcp/cache';
import EventEmitter from '@protobufjs/eventemitter';
const makeToolSet = (input) => {
    const emitter = new EventEmitter();
    const dispose = jest.fn(() => {
        emitter.emit('dispose');
    });
    return {
        [Symbol.dispose]: dispose,
        dispose,
        addDisposeListener: jest.fn((listener) => {
            emitter.on('dispose', listener);
        }),
        removeDisposeListener: jest.fn((listener) => {
            emitter.off('dispose', listener);
        }),
        tools: {},
        providers: [],
        isHealthy: true,
        ...input,
    };
};
const mockToolProviderSet = makeToolSet({});
const mockFactory = jest.fn().mockResolvedValue(mockToolProviderSet);
describe('getUserToolProviderCache', () => {
    let cache;
    beforeEach(async () => {
        jest.useFakeTimers();
        createFlagsmithInstance.mockReturnValue(mockFlagsmithInstanceFactory({
            flags: {
                'mcp-tool-provider-cache': true,
                mcp_tool_provider_cache: true,
            },
        }));
        getFeatureFlag.mockResolvedValue(true);
        cache = await getUserToolProviderCache({
            maxEntriesPerUser: 2,
            maxTotalEntries: 4,
            ttl: 30000,
            cleanupInterval: 10000,
        });
        cache.clear();
    });
    afterEach(() => {
        if (cache) {
            cache.shutdown();
        }
        jest.useRealTimers();
    });
    describe('getOrCreate', () => {
        it('should create and cache a new tool provider for first time use', async () => {
            const userId = 'user1';
            const sessionId = 'session1';
            const config = { writeEnabled: true, memoryDisabled: false };
            const result = await cache.getOrCreate(userId, sessionId, config, mockFactory);
            expect(result).toBe(mockToolProviderSet);
            expect(mockFactory).toHaveBeenCalledTimes(1);
        });
        it('should return cached tool provider for same user, session, and config', async () => {
            const userId = 'user1';
            const sessionId = 'session1';
            const config = { writeEnabled: true, memoryDisabled: false };
            const result1 = await cache.getOrCreate(userId, sessionId, config, mockFactory);
            const result2 = await cache.getOrCreate(userId, sessionId, config, mockFactory);
            expect(result1).toBe(result2);
            expect(mockFactory).toHaveBeenCalledTimes(1);
        });
        it('should create different instances for different configurations', async () => {
            const userId = 'user1';
            const sessionId = 'session1';
            const config1 = { writeEnabled: true, memoryDisabled: false };
            const config2 = { writeEnabled: false, memoryDisabled: true };
            const mockToolProviderSet2 = makeToolSet({});
            mockFactory
                .mockResolvedValueOnce(mockToolProviderSet)
                .mockResolvedValueOnce(mockToolProviderSet2);
            const result1 = await cache.getOrCreate(userId, sessionId, config1, mockFactory);
            const result2 = await cache.getOrCreate(userId, sessionId, config2, mockFactory);
            expect(result1).not.toBe(result2);
            expect(mockFactory).toHaveBeenCalledTimes(2);
        });
        it('should create different instances for different users', async () => {
            const sessionId = 'session1';
            const config = { writeEnabled: true, memoryDisabled: false };
            const mockToolProviderSet2 = makeToolSet({});
            mockFactory
                .mockResolvedValueOnce(mockToolProviderSet)
                .mockResolvedValueOnce(mockToolProviderSet2);
            const result1 = await cache.getOrCreate('user1', sessionId, config, mockFactory);
            const result2 = await cache.getOrCreate('user2', sessionId, config, mockFactory);
            expect(result1).not.toBe(result2);
            expect(mockFactory).toHaveBeenCalledTimes(2);
        });
        it('should enforce maxEntriesPerUser limit with LRU eviction', async () => {
            const userId = 'user1';
            const config = { writeEnabled: true, memoryDisabled: false };
            const mockToolProviderSet1 = makeToolSet({});
            const mockToolProviderSet2 = makeToolSet({});
            const mockToolProviderSet3 = makeToolSet({});
            mockFactory
                .mockResolvedValueOnce(mockToolProviderSet1)
                .mockResolvedValueOnce(mockToolProviderSet2)
                .mockResolvedValueOnce(mockToolProviderSet3);
            await cache.getOrCreate(userId, 'session1', config, mockFactory);
            await cache.getOrCreate(userId, 'session2', config, mockFactory);
            await cache.getOrCreate(userId, 'session3', config, mockFactory);
            expect(mockFactory).toHaveBeenCalledTimes(3);
            expect(mockToolProviderSet1[Symbol.dispose]).toHaveBeenCalledTimes(1);
            mockFactory.mockResolvedValueOnce({
                dispose: jest.fn(),
                tools: jest.fn(),
            });
            await cache.getOrCreate(userId, 'session1', config, mockFactory);
            expect(mockFactory).toHaveBeenCalledTimes(4);
        });
    });
    describe('invalidateUser', () => {
        it('should dispose and remove all entries for a specific user', async () => {
            const config = { writeEnabled: true, memoryDisabled: false };
            const mockToolProviderSet1 = makeToolSet({
                tools: {},
                providers: [],
            });
            const mockToolProviderSet2 = makeToolSet({
                tools: {},
                providers: [],
            });
            const mockToolProviderSet3 = makeToolSet({
                tools: {},
                providers: [],
            });
            mockFactory
                .mockResolvedValueOnce(mockToolProviderSet1)
                .mockResolvedValueOnce(mockToolProviderSet2)
                .mockResolvedValueOnce(mockToolProviderSet3);
            await cache.getOrCreate('user1', 'session1', config, mockFactory);
            await cache.getOrCreate('user1', 'session2', config, mockFactory);
            await cache.getOrCreate('user2', 'session1', config, mockFactory);
            cache.invalidateUser('user1');
            expect(mockToolProviderSet1[Symbol.dispose]).toHaveBeenCalledTimes(1);
            expect(mockToolProviderSet2[Symbol.dispose]).toHaveBeenCalledTimes(1);
            expect(mockToolProviderSet3[Symbol.dispose]).not.toHaveBeenCalled();
            mockFactory.mockResolvedValueOnce({
                dispose: jest.fn(),
                tools: jest.fn(),
            });
            await cache.getOrCreate('user1', 'session1', config, mockFactory);
            expect(mockFactory).toHaveBeenCalledTimes(4);
        });
    });
    describe('TTL and cleanup', () => {
        it.skip('should clean up expired entries automatically', async () => {
        });
    });
    describe('dispose', () => {
        it('should dispose all cached tool providers and clear intervals', async () => {
            const config = { writeEnabled: true, memoryDisabled: false };
            const mockToolProviderSet1 = makeToolSet({});
            const mockToolProviderSet2 = makeToolSet({});
            mockFactory
                .mockResolvedValueOnce(mockToolProviderSet1)
                .mockResolvedValueOnce(mockToolProviderSet2);
            await cache.getOrCreate('user1', 'session1', config, mockFactory);
            await cache.getOrCreate('user2', 'session1', config, mockFactory);
            cache.shutdown();
            expect(mockToolProviderSet1[Symbol.dispose]).toHaveBeenCalledTimes(1);
            expect(mockToolProviderSet2[Symbol.dispose]).toHaveBeenCalledTimes(1);
            const newCache = await getUserToolProviderCache({
                maxEntriesPerUser: 2,
                maxTotalEntries: 4,
                ttl: 30000,
                cleanupInterval: 10000,
            });
            mockFactory.mockResolvedValueOnce({
                dispose: jest.fn(),
                tools: jest.fn(),
            });
            await newCache.getOrCreate('user1', 'session1', config, mockFactory);
            expect(mockFactory).toHaveBeenCalledTimes(3);
            newCache.shutdown();
        });
    });
    describe('memory usage tracking', () => {
        it('should track memory usage correctly', async () => {
            const config = { writeEnabled: true, memoryDisabled: false };
            await cache.getOrCreate('user1', 'session1', config, mockFactory);
            const stats = cache.getStats();
            expect(stats.totalEntries).toBe(1);
            expect(stats.userCounts['user1']).toBe(1);
        });
    });
});
//# sourceMappingURL=user-tool-provider-cache.test.js.map