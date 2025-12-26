/* @jest-environment node */

/**
 * Jest tests for MCP tool caching functionality
 * Tests the cache key generation, storage, retrieval, and invalidation logic
 */

import { MCPToolCache, serializeCacheEntry } from '@/lib/ai/mcp/cache';
import { ToolSet } from 'ai';
import type { ToolProviderFactoryOptions } from '@/lib/ai/mcp/types';
import z from 'zod';
import {
  wellKnownFlag,
  wellKnownFlagSync,
} from '@/lib/site-util/feature-flags/feature-flag-with-refresh';

// Mock Redis and logger
jest.mock('@/lib/redis-client');
jest.mock('@/lib/react-util/errors/logged-error');

import { getRedisClient, type RedisClientType } from '@/lib/redis-client';
import {
  AllFeatureFlagsDefault,
  KnownFeatureType,
} from '@/lib/site-util/feature-flags';

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
};

// Override the mocked getRedisClient to return our mock
jest
  .mocked(getRedisClient)
  .mockResolvedValue(mockRedisClient as unknown as RedisClientType);

describe('MCPToolCache', () => {
  let cache: MCPToolCache;

  const mockToolSet: ToolSet = {
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
  } as ToolSet;

  const mockOptions: ToolProviderFactoryOptions = {
    url: 'https://test-server.com/mcp',
    headers: () => Promise.resolve({ Authorization: 'Bearer test-token' }),
    allowWrite: false,
  };

  beforeEach(() => {
    (wellKnownFlag as jest.Mock).mockImplementation(
      async (key: KnownFeatureType, salt?: string) => {
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
      },
    );
    (wellKnownFlagSync as jest.Mock).mockImplementation(
      (key: KnownFeatureType, salt?: string) => {
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
      },
    );

    // Use fake timers for all tests
    jest.useFakeTimers();
    // Set a consistent starting time
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    cache = new MCPToolCache({ maxMemoryEntries: 5, defaultTtl: 300 });

    // Reset mocks
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.keys.mockResolvedValue([]);
  });

  afterEach(() => {
    // jest.clearAllMocks();
  });

  describe('cache key generation', () => {
    it('should generate different keys for different URLs', async () => {
      const options1 = { ...mockOptions, url: 'https://server1.com' };
      const options2 = { ...mockOptions, url: 'https://server2.com' };

      await cache.setCachedTools(options1, mockToolSet);
      await cache.setCachedTools(options2, mockToolSet);

      // Should have called setEx twice with different keys
      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
      const call1 = mockRedisClient.setEx.mock.calls[0];
      const call2 = mockRedisClient.setEx.mock.calls[1];
      expect(call1[0]).not.toEqual(call2[0]); // Different cache keys
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
      expect(call1[0]).not.toEqual(call2[0]); // Different cache keys
    });

    it('should generate different keys for different allowWrite settings', async () => {
      const options1 = { ...mockOptions, allowWrite: false };
      const options2 = { ...mockOptions, allowWrite: true };

      await cache.setCachedTools(options1, mockToolSet);
      await cache.setCachedTools(options2, mockToolSet);

      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
      const call1 = mockRedisClient.setEx.mock.calls[0];
      const call2 = mockRedisClient.setEx.mock.calls[1];
      expect(call1[0]).not.toEqual(call2[0]); // Different cache keys
      expect(call1[0]).toContain(':ro'); // Read-only
      expect(call2[0]).toContain(':rw'); // Read-write
    });
  });

  describe('cache storage and retrieval', () => {
    it('should store and retrieve tools from memory cache', async () => {
      // Store tools
      await cache.setCachedTools(mockOptions, mockToolSet);

      // Retrieve from memory (Redis should not be called)
      mockRedisClient.get.mockClear();
      const cachedTools = await cache.getCachedTools(mockOptions);

      expect(cachedTools).toEqual(mockToolSet);
      expect(mockRedisClient.get).not.toHaveBeenCalled(); // Memory cache hit
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
      // Create entry at current time
      const currentTime = Date.now();
      const expiredEntry = {
        tools: mockToolSet,
        timestamp: currentTime,
        serverCapabilities: 'test-cap',
      };

      // Fast forward time by 25 hours (past default TTL of 300 seconds)
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredEntry));

      const cachedTools = await cache.getCachedTools(mockOptions);

      expect(cachedTools).toBeNull(); // Should be treated as cache miss
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

      // Fill cache to capacity
      await smallCache.setCachedTools(
        { ...mockOptions, url: 'https://server1.com' },
        mockToolSet,
      );

      // Advance time slightly to ensure different access times
      jest.advanceTimersByTime(1000);
      await smallCache.setCachedTools(
        { ...mockOptions, url: 'https://server2.com' },
        mockToolSet,
      );

      // Advance time slightly again
      jest.advanceTimersByTime(1000);

      // Add third item (should evict first)
      await smallCache.setCachedTools(
        { ...mockOptions, url: 'https://server3.com' },
        mockToolSet,
      );

      // First item should be evicted from memory
      mockRedisClient.get.mockResolvedValue(null);
      const result = await smallCache.getCachedTools({
        ...mockOptions,
        url: 'https://server1.com',
      });
      expect(result).toBeNull();

      // Third item should still be in memory
      mockRedisClient.get.mockClear();
      const result3 = await smallCache.getCachedTools({
        ...mockOptions,
        url: 'https://server3.com',
      });
      expect(result3).toEqual(mockToolSet);
      expect(mockRedisClient.get).not.toHaveBeenCalled(); // Memory hit
    });

    it('should respect TTL in memory cache', async () => {
      // Store an entry
      await cache.setCachedTools(mockOptions, mockToolSet);

      // Verify it's in memory initially
      mockRedisClient.get.mockClear();
      let result = await cache.getCachedTools(mockOptions);
      expect(result).toEqual(mockToolSet);
      expect(mockRedisClient.get).not.toHaveBeenCalled(); // Memory hit

      // Fast forward past TTL (300 seconds)
      jest.advanceTimersByTime(301 * 1000);

      // Should now be expired in memory cache
      mockRedisClient.get.mockResolvedValue(null); // Redis also expired
      result = await cache.getCachedTools(mockOptions);
      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1); // Should check Redis
    });
  });
});
