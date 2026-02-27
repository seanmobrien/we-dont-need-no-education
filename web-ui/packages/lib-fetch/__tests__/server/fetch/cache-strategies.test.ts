/* @jest-environment node */

import { PassThrough } from 'stream';
import type { RedisClientType } from '@compliance-theater/redis';
import { CacheStrategies } from '../../../src/server/fetch/cache-strategies';
import type { CachedValue } from '../../../src/server/fetch/fetch-types';

describe('CacheStrategies', () => {
    let cacheStrategies: CacheStrategies;
    let cache: Map<string, Promise<CachedValue>>;
    let inflightMap: Map<string, Promise<CachedValue>>;
    let mockRedisClient: jest.Mocked<RedisClientType>;

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
        timeout: {
            lookup: undefined,
            connect: undefined,
            secureConnect: undefined,
            socket: undefined,
            response: undefined,
            send: undefined,
            request: undefined,
        },
    }));

    beforeEach(() => {
        cache = new Map<string, Promise<CachedValue>>();
        inflightMap = new Map<string, Promise<CachedValue>>();

        mockRedisClient = {
            get: jest.fn().mockResolvedValue(null),
            setEx: jest.fn().mockResolvedValue('OK'),
            lLen: jest.fn().mockResolvedValue(0),
            lRange: jest.fn().mockResolvedValue([]),
            del: jest.fn().mockResolvedValue(1),
            set: jest.fn().mockResolvedValue('OK'),
            rPush: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
        } as unknown as jest.Mocked<RedisClientType>;

        cacheStrategies = new CacheStrategies({
            cache,
            inflightMap,
            getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
            fetchConfig: mockFetchConfig,
        });
    });

    describe('tryMemoryCache', () => {
        it('returns cached response on cache hit', async () => {
            const cacheKey = 'memory-key';
            const cachedValue: CachedValue = {
                body: Buffer.from('test body'),
                headers: { 'content-type': 'text/plain' },
                statusCode: 200,
            };

            cache.set(cacheKey, Promise.resolve(cachedValue));

            const result = await cacheStrategies.tryMemoryCache(cacheKey);

            expect(result).toBeDefined();
            expect(await result!.text()).toBe('test body');
            expect(result!.status).toBe(200);
            expect(result!.headers.get('content-type')).toBe('text/plain');
        });

        it('returns undefined on cache miss', async () => {
            const result = await cacheStrategies.tryMemoryCache('missing-key');
            expect(result).toBeUndefined();
        });

        it('propagates cache promise rejection', async () => {
            const cacheKey = 'memory-error-key';
            cache.set(cacheKey, Promise.reject(new Error('Cache error')));

            await expect(cacheStrategies.tryMemoryCache(cacheKey)).rejects.toThrow(
                'Cache error',
            );
        });
    });

    describe('tryInflightDedupe', () => {
        it('returns inflight response on duplicate request', async () => {
            const cacheKey = 'inflight-key';
            const cachedValue: CachedValue = {
                body: Buffer.from('inflight body'),
                headers: { 'content-type': 'text/plain' },
                statusCode: 200,
            };

            inflightMap.set(cacheKey, Promise.resolve(cachedValue));

            const result = await cacheStrategies.tryInflightDedupe(cacheKey);

            expect(result).toBeDefined();
            expect(await result!.text()).toBe('inflight body');
            expect(result!.status).toBe(200);
        });

        it('returns undefined when no inflight request exists', async () => {
            const result = await cacheStrategies.tryInflightDedupe('no-inflight-key');
            expect(result).toBeUndefined();
        });

        it('propagates inflight promise rejection', async () => {
            const cacheKey = 'inflight-error-key';
            inflightMap.set(cacheKey, Promise.reject(new Error('Inflight error')));

            await expect(cacheStrategies.tryInflightDedupe(cacheKey)).rejects.toThrow(
                'Inflight error',
            );
        });
    });

    describe('tryRedisCache', () => {
        it('returns buffered response on Redis hit and warms memory cache', async () => {
            const cacheKey = 'redis-buffered-key';
            const cachedData = {
                bodyB64: Buffer.from('redis body').toString('base64'),
                headers: { 'content-type': 'application/json' },
                statusCode: 200,
            };
            mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

            const result = await cacheStrategies.tryRedisCache(cacheKey);

            expect(result).toBeDefined();
            expect(await result!.text()).toBe('redis body');
            expect(cache.get(cacheKey)).toBeDefined();
        });

        it('returns undefined on Redis miss', async () => {
            mockRedisClient.get.mockResolvedValueOnce(null);
            mockRedisClient.lLen.mockResolvedValueOnce(0);
            const result = await cacheStrategies.tryRedisCache('redis-miss-key');
            expect(result).toBeUndefined();
        });

        it('replays stream response from Redis chunk list', async () => {
            const cacheKey = 'redis-stream-key';
            const chunk1 = Buffer.from('chunk1').toString('base64');
            const chunk2 = Buffer.from('chunk2').toString('base64');

            mockRedisClient.get
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(
                    JSON.stringify({
                        statusCode: 201,
                        headers: { 'content-type': 'text/event-stream' },
                    }),
                );
            mockRedisClient.lLen.mockResolvedValueOnce(2);
            mockRedisClient.lRange.mockResolvedValueOnce([chunk1, chunk2]);

            const result = await cacheStrategies.tryRedisCache(cacheKey);

            expect(result).toBeDefined();
            expect(result!.status).toBe(201);
            expect(await result!.text()).toBe('chunk2chunk1');
        });

        it('returns undefined when redis client errors', async () => {
            mockRedisClient.get.mockRejectedValueOnce(new Error('Redis unavailable'));
            const result = await cacheStrategies.tryRedisCache('redis-error');
            expect(result).toBeUndefined();
        });
    });

    describe('cacheBufferedToRedis', () => {
        it('writes buffered response payload with ttl', async () => {
            const cacheKey = 'buffer-cache-key';
            const value: CachedValue = {
                body: Buffer.from('response body'),
                headers: { 'content-type': 'text/plain' },
                statusCode: 200,
            };

            await cacheStrategies.cacheBufferedToRedis(cacheKey, value);

            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                cacheKey,
                300,
                expect.any(String),
            );
        });
    });

    describe('cacheStreamToRedis', () => {
        it('stores stream metadata, chunks, and ttl keys', async () => {
            const cacheKey = 'stream-cache-key';
            const stream = new PassThrough();

            const writer = (async () => {
                stream.write(Buffer.from('chunk1'));
                stream.write(Buffer.from('chunk2'));
                stream.end();
            })();

            await Promise.all([
                cacheStrategies.cacheStreamToRedis(
                    cacheKey,
                    stream as unknown as AsyncIterable<Buffer>,
                    { 'content-type': 'application/octet-stream' },
                    200,
                    [],
                ),
                writer,
            ]);

            expect(mockRedisClient.set).toHaveBeenCalledWith(
                `${cacheKey}:stream:meta`,
                expect.any(String),
            );
            expect(mockRedisClient.rPush).toHaveBeenCalled();
            expect(mockRedisClient.expire).toHaveBeenCalledWith(
                `${cacheKey}:stream`,
                300,
            );
            expect(mockRedisClient.expire).toHaveBeenCalledWith(
                `${cacheKey}:stream:meta`,
                300,
            );
        });
    });
});
