/**
 * @jest-environment node
 */

/**
 * Unit tests for CacheStrategies class
 * Tests memory cache, Redis cache (buffered + streaming), and inflight deduplication
 */

import { LRUCache } from 'lru-cache';
import { PassThrough } from 'stream';
import { CacheStrategies } from '@/lib/nextjs-util/server/fetch/cache-strategies';
import type {
  CachedValue,
  CacheStrategyDeps,
} from '@/lib/nextjs-util/server/fetch/fetch-types';
import { type RedisClientType, createClient } from 'redis';
import { hideConsoleOutput } from '@/__tests__/test-utils';

/*

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  lLen: jest.fn(),
  lRange: jest.fn(),
  del: jest.fn(),
  set: jest.fn(),
  rPush: jest.fn(),
  expire: jest.fn(),
};
jest.mock('@/lib/redis-client', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
}));
*/

// Mock fetch config
const mockFetchConfig = jest.fn(() => ({
  fetch_cache_ttl: 300,
  fetch_concurrency: 5,
  fetch_stream_max_chunks: 100,
  fetch_stream_max_total_bytes: 10 * 1024 * 1024,
  fetch_stream_detect_buffer: 4 * 1024,
  fetch_stream_buffer_max: 64 * 1024,
  stream_enabled: true,
  enhanced: false,
  dedup_writerequests: true,
  trace_level: 'info' as const,
}));

jest.mock('@/lib/nextjs-util/server/fetch/fetch-config', () => ({
  fetchConfigSync: jest.fn(() => mockFetchConfig()),
}));

describe('CacheStrategies', () => {
  let mockRedisClient: jest.Mocked<RedisClientType> =
    undefined as unknown as jest.Mocked<RedisClientType>;
  let cacheStrategies: CacheStrategies;
  let cache: LRUCache<string, Promise<CachedValue>>;
  let inflightMap: Map<string, Promise<CachedValue>>;
  let mockSpan: {
    setAttribute: jest.Mock;
    setAttributes: jest.Mock;
    recordException: jest.Mock;
    setStatus: jest.Mock;
  };
  const mockConsole = hideConsoleOutput();

  beforeEach(() => {
    // Reset all mocks
    // jest.clearAllMocks();
    mockConsole.setup();

    mockRedisClient = createClient() as jest.Mocked<RedisClientType>;
    // Create fresh instances for each test
    cache = new LRUCache({ max: 100 });
    inflightMap = new Map();

    const deps: CacheStrategyDeps = {
      cache,
      inflightMap,
      getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
      fetchConfig: mockFetchConfig,
    };

    cacheStrategies = new CacheStrategies(deps);

    mockSpan = {
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      recordException: jest.fn(),
      setStatus: jest.fn(),
    };

    // Reset Redis mock implementations
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.lLen.mockResolvedValue(0);
    mockRedisClient.lRange.mockResolvedValue([]);
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.rPush.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(true);
  });

  afterEach(() => {
    mockConsole.dispose();
  });

  describe('tryMemoryCache', () => {
    it('should return cached response on cache hit', async () => {
      const cacheKey = 'test-key';
      const cachedValue: CachedValue = {
        body: Buffer.from('test body'),
        headers: { 'content-type': 'text/plain' },
        statusCode: 200,
      };

      cache.set(cacheKey, Promise.resolve(cachedValue));

      const result = await cacheStrategies.tryMemoryCache(cacheKey, mockSpan);

      expect(result).toBeDefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.cache_hit',
        true,
      );

      // Verify response body
      const body = await result!.text();
      expect(body).toBe('test body');
    });

    it('should return undefined on cache miss', async () => {
      const cacheKey = 'missing-key';

      const result = await cacheStrategies.tryMemoryCache(cacheKey, mockSpan);

      expect(result).toBeUndefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.cache_hit',
        false,
      );
    });

    it('should handle cache with rejected promises', async () => {
      const cacheKey = 'error-key';
      const rejectedPromise = Promise.reject(
        new Error('Cache error'),
      ) as Promise<CachedValue>;
      cache.set(cacheKey, rejectedPromise);

      await expect(
        cacheStrategies.tryMemoryCache(cacheKey, mockSpan),
      ).rejects.toThrow('Cache error');
    });
  });

  describe('tryRedisCache - Buffered', () => {
    it('should return buffered response from Redis on cache hit', async () => {
      const cacheKey = 'redis-buffered-key';
      const cachedData = {
        bodyB64: Buffer.from('redis body').toString('base64'),
        headers: { 'content-type': 'application/json' },
        statusCode: 200,
      };

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeDefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.redis_hit',
        true,
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.status_code',
        200,
      );

      // Verify memory cache was warmed
      const memoryCached = cache.get(cacheKey);
      expect(memoryCached).toBeDefined();

      const body = await result!.text();
      expect(body).toBe('redis body');
    });

    it('should return undefined on Redis cache miss', async () => {
      const cacheKey = 'redis-miss-key';
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.lLen.mockResolvedValueOnce(0);

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeUndefined();
    });

    it('should handle Redis connection errors gracefully', async () => {
      const cacheKey = 'redis-error-key';
      mockRedisClient.get.mockRejectedValueOnce(
        new Error('Redis connection failed'),
      );

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeUndefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.redis_unavailable',
        true,
      );
    });

    it('should handle malformed Redis data', async () => {
      const cacheKey = 'redis-malformed-key';
      mockRedisClient.get.mockResolvedValueOnce('invalid json');

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeUndefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.redis_unavailable',
        true,
      );
    });
  });

  describe('tryRedisCache - Streaming', () => {
    it('should replay streaming response from Redis', async () => {
      const cacheKey = 'redis-stream-key';
      const chunk1 = Buffer.from('chunk1').toString('base64');
      const chunk2 = Buffer.from('chunk2').toString('base64');
      const metadata = {
        headers: { 'content-type': 'text/event-stream' },
        statusCode: 200,
      };

      mockRedisClient.get.mockResolvedValueOnce(null); // No buffered cache
      mockRedisClient.lLen.mockResolvedValueOnce(2); // Stream has 2 chunks
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(metadata)); // Metadata
      mockRedisClient.lRange.mockResolvedValueOnce([chunk1, chunk2]);

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeDefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.redis_stream_replay',
        true,
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.status_code',
        200,
      );
      expect(result!.status).toBe(200);
    });

    it('should handle stream replay without metadata', async () => {
      const cacheKey = 'redis-stream-no-meta-key';
      const chunk1 = Buffer.from('data').toString('base64');

      mockRedisClient.get.mockResolvedValueOnce(null); // No buffered cache
      mockRedisClient.lLen.mockResolvedValueOnce(1);
      mockRedisClient.get.mockResolvedValueOnce(null); // No metadata
      mockRedisClient.lRange.mockResolvedValueOnce([chunk1]);

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeDefined();
      expect(result!.status).toBe(200); // Default status
    });

    it('should handle stream replay errors gracefully', async () => {
      const cacheKey = 'redis-stream-error-key';

      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.lLen.mockResolvedValueOnce(1);
      mockRedisClient.get.mockResolvedValueOnce(
        JSON.stringify({ statusCode: 200 }),
      );
      mockRedisClient.lRange.mockRejectedValueOnce(
        new Error('Range read failed'),
      );

      const result = await cacheStrategies.tryRedisCache(cacheKey, mockSpan);

      expect(result).toBeDefined(); // Stream still created, error handled internally
    });
  });

  describe('tryInflightDedupe', () => {
    it('should return inflight promise on duplicate request', async () => {
      const cacheKey = 'inflight-key';
      const cachedValue: CachedValue = {
        body: Buffer.from('inflight body'),
        headers: { 'content-type': 'text/plain' },
        statusCode: 200,
      };

      inflightMap.set(cacheKey, Promise.resolve(cachedValue));

      const result = await cacheStrategies.tryInflightDedupe(
        cacheKey,
        mockSpan,
      );

      expect(result).toBeDefined();
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.inflight_dedupe',
        true,
      );

      const body = await result!.text();
      expect(body).toBe('inflight body');
    });

    it('should return undefined when no inflight request exists', async () => {
      const cacheKey = 'no-inflight-key';

      const result = await cacheStrategies.tryInflightDedupe(
        cacheKey,
        mockSpan,
      );

      expect(result).toBeUndefined();
    });

    it('should handle inflight promise rejections', async () => {
      const cacheKey = 'inflight-error-key';
      inflightMap.set(cacheKey, Promise.reject(new Error('Inflight error')));

      await expect(
        cacheStrategies.tryInflightDedupe(cacheKey, mockSpan),
      ).rejects.toThrow('Inflight error');
    });
  });

  describe('cacheBufferedToRedis', () => {
    it('should cache buffered response to Redis successfully', async () => {
      const cacheKey = 'buffer-cache-key';
      const value: CachedValue = {
        body: Buffer.from('response body'),
        headers: { 'content-type': 'text/html' },
        statusCode: 200,
      };

      await cacheStrategies.cacheBufferedToRedis(cacheKey, value);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        cacheKey,
        300, // TTL from config
        expect.any(String),
      );

      // Verify the payload structure
      const [[, , payload]] = mockRedisClient.setEx.mock.calls;
      const parsed = JSON.parse(String(payload));
      expect(parsed.statusCode).toBe(200);
      expect(parsed.headers).toEqual({ 'content-type': 'text/html' });
      expect(Buffer.from(parsed.bodyB64, 'base64').toString()).toBe(
        'response body',
      );
    });

    it('should handle Redis caching errors gracefully', async () => {
      const cacheKey = 'buffer-cache-error-key';
      const value: CachedValue = {
        body: Buffer.from('test'),
        headers: {},
        statusCode: 200,
      };

      mockRedisClient.setEx.mockRejectedValueOnce(
        new Error('Redis write failed'),
      );

      // Should not throw - errors are logged but not propagated
      await expect(
        cacheStrategies.cacheBufferedToRedis(cacheKey, value),
      ).resolves.toBeUndefined();
    });
  });

  describe('cacheStreamToRedis', () => {
    it('should cache stream to Redis successfully', async () => {
      const cacheKey = 'stream-cache-key';
      const stream = new PassThrough();
      const headers = { 'content-type': 'application/octet-stream' };
      const statusCode = 200;

      // Simulate stream data
      const writePromise = (async () => {
        stream.write(Buffer.from('chunk1'));
        stream.write(Buffer.from('chunk2'));
        stream.end();
      })();

      await Promise.all([
        cacheStrategies.cacheStreamToRedis(
          cacheKey,
          stream as any,
          headers,
          statusCode,
          [],
        ),
        writePromise,
      ]);

      // Verify metadata was stored
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `${cacheKey}:stream:meta`,
        expect.stringContaining('application/octet-stream'),
      );

      // Verify chunks were pushed
      expect(mockRedisClient.rPush).toHaveBeenCalled();

      // Verify TTL was set
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `${cacheKey}:stream`,
        300,
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `${cacheKey}:stream:meta`,
        300,
      );
    });

    it('should include already-consumed chunks when caching stream', async () => {
      const cacheKey = 'stream-with-buffered-key';
      const stream = new PassThrough();
      const alreadyConsumed = [
        Buffer.from('buffered1'),
        Buffer.from('buffered2'),
      ];

      stream.end(); // Empty stream, only buffered chunks

      await cacheStrategies.cacheStreamToRedis(
        cacheKey,
        stream as any,
        {},
        200,
        alreadyConsumed,
      );

      // Verify buffered chunks were pushed
      expect(mockRedisClient.rPush).toHaveBeenCalledWith(
        `${cacheKey}:stream`,
        expect.any(String),
      );
      expect(mockRedisClient.rPush).toHaveBeenCalledTimes(2); // Two buffered chunks
    });

    it('should respect max chunks limit', async () => {
      const cacheKey = 'stream-max-chunks-key';
      const stream = new PassThrough();

      const writePromise = (async () => {
        for (let i = 0; i < 5; i++) {
          stream.write(Buffer.from(`chunk${i}`));
          await new Promise((resolve) => setImmediate(resolve)); // Give time for processing
        }
        stream.end();
      })();

      // Mock config with low max chunks - must be set before calling cacheStreamToRedis
      const originalConfig = mockFetchConfig();
      mockFetchConfig.mockImplementationOnce(() => ({
        ...originalConfig,
        fetch_stream_max_chunks: 2,
      }));

      await Promise.all([
        cacheStrategies.cacheStreamToRedis(
          cacheKey,
          stream as any,
          {},
          200,
          [],
        ),
        writePromise,
      ]);

      // Should only push 2 chunks (respecting limit)
      // Note: May be less if stream completes before 2 chunks are written
      expect(mockRedisClient.rPush.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('should respect max bytes limit', async () => {
      const cacheKey = 'stream-max-bytes-key';
      const stream = new PassThrough();

      const writePromise = (async () => {
        stream.write(Buffer.from('12345')); // 5 bytes
        await new Promise((resolve) => setImmediate(resolve));
        stream.write(Buffer.from('67890')); // 5 bytes - total 10
        await new Promise((resolve) => setImmediate(resolve));
        stream.write(Buffer.from('EXTRA')); // Should be skipped
        stream.end();
      })();

      // Mock config with low max bytes - must be set before calling cacheStreamToRedis
      const originalConfig = mockFetchConfig();
      mockFetchConfig.mockImplementationOnce(() => ({
        ...originalConfig,
        fetch_stream_max_total_bytes: 10, // Only 10 bytes
      }));

      await Promise.all([
        cacheStrategies.cacheStreamToRedis(
          cacheKey,
          stream as any,
          {},
          200,
          [],
        ),
        writePromise,
      ]);

      // Should push at most 2 chunks (10 bytes total)
      expect(mockRedisClient.rPush.mock.calls.length).toBeLessThanOrEqual(2);
      expect(mockRedisClient.rPush.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle stream caching errors gracefully', async () => {
      const cacheKey = 'stream-error-key';
      const stream = new PassThrough();

      mockRedisClient.del.mockRejectedValueOnce(new Error('Delete failed'));

      stream.end();

      // Should not throw - errors are logged but not propagated
      await expect(
        cacheStrategies.cacheStreamToRedis(
          cacheKey,
          stream as any,
          {},
          200,
          [],
        ),
      ).resolves.toBeUndefined();
    });

    it('should handle rPush errors during stream caching', async () => {
      const cacheKey = 'stream-push-error-key';
      const stream = new PassThrough();

      mockRedisClient.rPush.mockRejectedValueOnce(new Error('Push failed'));

      const writePromise = (async () => {
        stream.write(Buffer.from('data'));
        stream.end();
      })();

      await Promise.all([
        cacheStrategies.cacheStreamToRedis(
          cacheKey,
          stream as any,
          {},
          200,
          [],
        ),
        writePromise,
      ]);

      // Should stop pushing after error
      expect(mockRedisClient.rPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration - Cache Strategy Flow', () => {
    it('should try caches in order: memory -> redis -> inflight', async () => {
      const cacheKey = 'integration-key';

      // All caches miss
      const memoryResult = await cacheStrategies.tryMemoryCache(
        cacheKey,
        mockSpan,
      );
      expect(memoryResult).toBeUndefined();

      const redisResult = await cacheStrategies.tryRedisCache(
        cacheKey,
        mockSpan,
      );
      expect(redisResult).toBeUndefined();

      const inflightResult = await cacheStrategies.tryInflightDedupe(
        cacheKey,
        mockSpan,
      );
      expect(inflightResult).toBeUndefined();

      // Verify all three lookups were attempted
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'http.cache_hit',
        false,
      );
    });

    it('should warm memory cache from Redis buffered cache', async () => {
      const cacheKey = 'warm-cache-key';
      const cachedData = {
        bodyB64: Buffer.from('cached data').toString('base64'),
        headers: { 'x-custom': 'header' },
        statusCode: 201,
      };

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      // Redis cache hit
      const redisResult = await cacheStrategies.tryRedisCache(
        cacheKey,
        mockSpan,
      );
      expect(redisResult).toBeDefined();

      // Memory cache should now be warmed
      const memoryResult = await cacheStrategies.tryMemoryCache(
        cacheKey,
        mockSpan,
      );
      expect(memoryResult).toBeDefined();

      const body = await memoryResult!.text();
      expect(body).toBe('cached data');
    });
  });
});
