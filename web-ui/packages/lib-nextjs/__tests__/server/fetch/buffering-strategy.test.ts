/* @jest-environment node */

/**
 * Unit tests for BufferingStrategy
 * Tests three response handling scenarios:
 *  1. Small response - fits entirely in buffer
 *  2. Large response - exceeds streamBufferMax, switches to streaming
 *  3. Mid-size response - exceeds streamDetectBuffer but still bufferable
 */

import { PassThrough, Readable } from 'stream';
import { LRUCache } from 'lru-cache';
import { BufferingStrategy } from '../../../src/server/fetch/buffering-strategy';
import type {
  BufferingStrategyDeps,
  CachedValue,
} from '../../../src/server/fetch/fetch-types';
import { hideConsoleOutput } from '../../shared/test-utils-server';

// Mock logger to suppress output
jest.mock('@compliance-theater/logger', () => ({
  log: jest.fn(),
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

// Mock response helpers
jest.mock('../../../src/server/response', () => ({
  makeResponse: jest.fn((value: CachedValue) => ({
    _isMocked: true,
    body: value.body,
    headers: value.headers,
    status: value.statusCode,
  })),
  makeStreamResponse: jest.fn((stream: unknown, init: unknown) => ({
    _isMockedStream: true,
    stream,
    init,
  })),
  nodeStreamToReadableStream: jest.fn((stream: unknown) => {
    // Resume the stream so 'end'/'error' events fire (simulates a consumer)
    if (stream && typeof (stream as any).resume === 'function') {
      (stream as any).resume();
    }
    return { _isReadableStream: true, source: stream };
  }),
}));

const makeConfig = (overrides: Partial<BufferingStrategyDeps['config']> = {}) => ({
  maxResponseSize: 10 * 1024 * 1024, // 10MB
  streamDetectBuffer: 1024,           // 1KB
  streamBufferMax: 64 * 1024,         // 64KB
  ...overrides,
});

const makeFetchConfig = () => ({
  fetch_concurrency: 8,
  fetch_cache_ttl: 300,
  stream_enabled: true,
  fetch_stream_detect_buffer: 1024,
  fetch_stream_buffer_max: 64 * 1024,
  fetch_stream_max_chunks: 100,
  fetch_stream_max_total_bytes: 10 * 1024 * 1024,
  enhanced: false,
  dedup_writerequests: true,
  trace_level: 'info',
  timeout: {},
} as any);

const makeSpan = () => ({
  setAttribute: jest.fn(),
});

const makeDeps = (overrides: Partial<BufferingStrategyDeps> = {}): BufferingStrategyDeps => {
  const cache = new LRUCache<string, Promise<CachedValue>>({ max: 100 });
  const mockRedis = {
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
  };
  return {
    config: makeConfig(),
    cachingConfig: { cacheTtl: 300, redisEnabled: true },
    cache,
    cacheStreamToRedis: jest.fn().mockResolvedValue(undefined),
    getRedisClient: jest.fn().mockResolvedValue(mockRedis),
    fetchConfig: jest.fn().mockReturnValue(makeFetchConfig()),
    releaseSemaphore: jest.fn(),
    ...overrides,
  };
};

/**
 * Creates a Readable stream that emits the given chunks then ends.
 * Delays writes by default so event handlers can be attached before data arrives.
 */
const makeReadable = (chunks: Buffer[], delayMs = 5): Readable => {
  const stream = new PassThrough();
  const emit = async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    for (const chunk of chunks) {
      stream.write(chunk);
    }
    stream.end();
  };
  emit();
  return stream;
};

describe('BufferingStrategy', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => {
    mockConsole.setup();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsole.dispose();
  });

  describe('Case 1: small response completes within streamDetectBuffer', () => {
    it('returns buffered mode for a response that fits in initial sample', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const chunk = Buffer.from('hello world');
      const stream = makeReadable([chunk]);

      const result = await strategy.handleBufferedResponse(
        'cache-key-1',
        stream,
        { 'content-type': 'application/json' },
        200,
        'http://example.com/api',
        makeSpan(),
      );

      expect(result.mode).toBe('buffered');
      expect(result.response).toBeDefined();
    });

    it('warms memory cache for buffered response', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('small payload')]);

      await strategy.handleBufferedResponse(
        'cache-key-warm',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(deps.cache.has('cache-key-warm')).toBe(true);
    });

    it('schedules Redis caching for buffered response', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('data')]);

      await strategy.handleBufferedResponse(
        'redis-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      // Allow background promise to settle
      await new Promise((r) => setTimeout(r, 50));
      expect(deps.getRedisClient).toHaveBeenCalled();
    });

    it('releases semaphore on buffered response', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('data')]);

      await strategy.handleBufferedResponse(
        'sem-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(deps.releaseSemaphore).toHaveBeenCalled();
    });

    it('does not release semaphore when shouldReleaseSemaphore=false', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('data')]);

      await strategy.handleBufferedResponse(
        'no-sem-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
        false,
      );

      expect(deps.releaseSemaphore).not.toHaveBeenCalled();
    });

    it('sets http.status_code span attribute', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('body')]);
      const span = makeSpan();

      await strategy.handleBufferedResponse('k', stream, {}, 201, 'http://x', span);

      expect(span.setAttribute).toHaveBeenCalledWith('http.status_code', 201);
    });
  });

  describe('Case 2: response exceeds streamBufferMax → switches to streaming', () => {
    /**
     * Helper: writes a big chunk to trigger Case 2 but does NOT end the stream.
     * This ensures ended=false when the polling loop resolves, so Case 1 is skipped.
     */
    const makeStreamingStream = (streamBufferMax: number, streamDetectBuffer: number): PassThrough => {
      const stream = new PassThrough();
      // Write beyond streamBufferMax but don't end the stream
      setTimeout(() => stream.write(Buffer.alloc(streamBufferMax + 50, 'x')), 5);
      return stream;
    };

    it('returns streaming mode when buffered bytes exceed streamBufferMax', async () => {
      const streamBufferMax = 100;
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 50, streamBufferMax }),
      });
      const strategy = new BufferingStrategy(deps);
      const stream = makeStreamingStream(streamBufferMax, 50);

      const result = await strategy.handleBufferedResponse(
        'stream-key',
        stream,
        { 'content-type': 'text/plain' },
        200,
        'http://example.com/large',
        makeSpan(),
      );

      expect(result.mode).toBe('streaming');
      stream.destroy(); // cleanup
    });

    it('caches stream to Redis when stream_enabled=true', async () => {
      const streamBufferMax = 100;
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 50, streamBufferMax }),
        fetchConfig: jest.fn().mockReturnValue({ ...makeFetchConfig(), stream_enabled: true }),
      });
      const strategy = new BufferingStrategy(deps);
      const stream = makeStreamingStream(streamBufferMax, 50);

      await strategy.handleBufferedResponse(
        'stream-redis-key',
        stream,
        {},
        200,
        'http://example.com/large',
        makeSpan(),
      );

      expect(deps.cacheStreamToRedis).toHaveBeenCalled();
      stream.destroy();
    });

    it('does not cache stream to Redis when stream_enabled=false', async () => {
      const streamBufferMax = 100;
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 50, streamBufferMax }),
        fetchConfig: jest.fn().mockReturnValue({ ...makeFetchConfig(), stream_enabled: false }),
      });
      const strategy = new BufferingStrategy(deps);
      const stream = makeStreamingStream(streamBufferMax, 50);

      await strategy.handleBufferedResponse(
        'no-redis-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(deps.cacheStreamToRedis).not.toHaveBeenCalled();
      stream.destroy();
    });

    it('releases semaphore when stream ends in streaming mode', async () => {
      const streamBufferMax = 50;
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 10, streamBufferMax }),
      });
      const strategy = new BufferingStrategy(deps);
      const stream = new PassThrough();
      // Write beyond max, then end after a delay
      setTimeout(() => {
        stream.write(Buffer.alloc(streamBufferMax + 10, 'c'));
        // Resume + end to fire 'end' event
        setTimeout(() => { stream.resume(); stream.end(); }, 30);
      }, 5);

      await strategy.handleBufferedResponse(
        'sem-stream-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      // Wait for stream to end and trigger semaphore release
      await new Promise((r) => setTimeout(r, 100));
      expect(deps.releaseSemaphore).toHaveBeenCalled();
    });
  });

  describe('Case 2b: response exceeds maxResponseSize → switches to streaming', () => {
    it('returns streaming mode when a chunk exceeds maxResponseSize', async () => {
      const maxResponseSize = 100;
      const deps = makeDeps({
        config: makeConfig({
          maxResponseSize,
          streamDetectBuffer: 200,  // bigger than maxResponseSize so we don't hit Case 1
          streamBufferMax: 1000,
        }),
      });
      const strategy = new BufferingStrategy(deps);

      // Single chunk that exceeds maxResponseSize
      const hugeChunk = Buffer.alloc(maxResponseSize + 1, 'z');
      const stream = makeReadable([hugeChunk]);

      const result = await strategy.handleBufferedResponse(
        'size-exceeded-key',
        stream,
        {},
        200,
        'http://example.com/huge',
        makeSpan(),
      );

      expect(result.mode).toBe('streaming');
    });
  });

  describe('Case 3: mid-size response - exceeds streamDetectBuffer but still fits', () => {
    it('returns buffered mode after waiting for stream to complete', async () => {
      // streamDetectBuffer=50, streamBufferMax=500
      // Emit 60 bytes in first chunk (exceeds detect, not max), then stream ends
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 50, streamBufferMax: 500 }),
      });
      const strategy = new BufferingStrategy(deps);

      // First chunk = 60 bytes (exceeds streamDetectBuffer=50)
      // But 60 < streamBufferMax=500, so we wait for more data
      const stream = new PassThrough();
      const chunk1 = Buffer.alloc(60, 'a');
      const chunk2 = Buffer.alloc(40, 'b');

      // Emit chunks with a tiny delay so the polling loop fires
      setTimeout(() => {
        stream.write(chunk1);
        setTimeout(() => {
          stream.write(chunk2);
          stream.end();
        }, 20);
      }, 5);

      const result = await strategy.handleBufferedResponse(
        'mid-size-key',
        stream,
        {},
        200,
        'http://example.com/medium',
        makeSpan(),
      );

      expect(result.mode).toBe('buffered');
    });

    it('warms memory cache for mid-size buffered response', async () => {
      const deps = makeDeps({
        config: makeConfig({ streamDetectBuffer: 10, streamBufferMax: 500 }),
      });
      const strategy = new BufferingStrategy(deps);

      const stream = new PassThrough();
      setTimeout(() => {
        stream.write(Buffer.alloc(20, 'x'));
        setTimeout(() => stream.end(), 10);
      }, 5);

      await strategy.handleBufferedResponse(
        'mid-warm-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(deps.cache.has('mid-warm-key')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws when stream emits error before streamDetectBuffer', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);

      const stream = new PassThrough();
      const error = new Error('Stream failed');
      setTimeout(() => stream.destroy(error), 5);

      await expect(
        strategy.handleBufferedResponse('error-key', stream, {}, 200, 'http://x', makeSpan()),
      ).rejects.toThrow('Stream failed');
    });

    it('handles Redis error gracefully (does not throw)', async () => {
      const failingRedis = { setEx: jest.fn().mockRejectedValue(new Error('Redis down')) };
      const deps = makeDeps({ getRedisClient: jest.fn().mockResolvedValue(failingRedis) });
      const strategy = new BufferingStrategy(deps);

      const stream = makeReadable([Buffer.from('data')]);

      // Should not throw even if Redis fails
      const result = await strategy.handleBufferedResponse(
        'redis-fail-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(result.mode).toBe('buffered');

      // Allow background redis attempt to settle
      await new Promise((r) => setTimeout(r, 50));
    });

    it('handles semaphore release error gracefully', async () => {
      const deps = makeDeps({
        releaseSemaphore: jest.fn().mockImplementation(() => {
          throw new Error('semaphore error');
        }),
      });
      const strategy = new BufferingStrategy(deps);
      const stream = makeReadable([Buffer.from('ok')]);

      // Should not throw
      await expect(
        strategy.handleBufferedResponse('sem-err-key', stream, {}, 200, 'http://x', makeSpan()),
      ).resolves.toBeDefined();
    });
  });

  describe('non-Buffer chunks', () => {
    it('handles string chunks by converting to Buffer', async () => {
      const deps = makeDeps();
      const strategy = new BufferingStrategy(deps);

      // PassThrough in object mode passes string chunks
      const stream = new PassThrough();
      stream.write('string chunk');
      stream.end();

      const result = await strategy.handleBufferedResponse(
        'string-key',
        stream,
        {},
        200,
        'http://example.com',
        makeSpan(),
      );

      expect(result.mode).toBe('buffered');
    });
  });
});
