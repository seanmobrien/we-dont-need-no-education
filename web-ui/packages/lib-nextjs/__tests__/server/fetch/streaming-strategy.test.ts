/* @jest-environment node */

/**
 * Unit tests for StreamingStrategy
 */

import { PassThrough } from 'stream';
import { StreamingStrategy } from '../../../src/server/fetch/streaming-strategy';
import type { StreamingStrategyDeps } from '../../../src/server/fetch/fetch-types';
import { hideConsoleOutput } from '../../shared/test-utils-server';

jest.mock('@compliance-theater/logger', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('../../../src/server/response', () => ({
  makeStreamResponse: jest.fn((stream: unknown, init: unknown) => ({
    _isMockedStream: true,
    stream,
    init,
  })),
  nodeStreamToReadableStream: jest.fn((stream: unknown) => ({
    _isReadableStream: true,
    source: stream,
  })),
}));

const makeConfig = (): StreamingStrategyDeps['config'] => ({
  streamEnabled: true,
  streamDetectBuffer: 1024,
  streamBufferMax: 64 * 1024,
  streamMaxChunks: 100,
  streamMaxTotalBytes: 10 * 1024 * 1024,
});

const makeSpan = () => ({ setAttribute: jest.fn() });

const makeDeps = (overrides: Partial<StreamingStrategyDeps> = {}): StreamingStrategyDeps => ({
  config: makeConfig(),
  cacheStreamToRedis: jest.fn().mockResolvedValue(undefined),
  fetchConfig: jest.fn().mockReturnValue({
    stream_enabled: true,
    fetch_cache_ttl: 300,
    fetch_concurrency: 8,
    fetch_stream_max_chunks: 100,
    fetch_stream_max_total_bytes: 10 * 1024 * 1024,
    timeout: {},
  } as any),
  releaseSemaphore: jest.fn(),
  ...overrides,
});

describe('StreamingStrategy', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => {
    mockConsole.setup();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsole.dispose();
  });

  describe('detectStreamingResponse()', () => {
    it('returns true for chunked transfer-encoding', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(strategy.detectStreamingResponse({ 'transfer-encoding': 'chunked' })).toBe(true);
    });

    it('returns true for chunked (case-insensitive)', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(strategy.detectStreamingResponse({ 'transfer-encoding': 'CHUNKED' })).toBe(true);
    });

    it('returns true for text/event-stream content-type', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(
        strategy.detectStreamingResponse({ 'content-type': 'text/event-stream' }),
      ).toBe(true);
    });

    it('returns true for multipart content-type', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(
        strategy.detectStreamingResponse({ 'content-type': 'multipart/form-data; boundary=xxx' }),
      ).toBe(true);
    });

    it('returns true when transfer-encoding set but no content-length', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(
        strategy.detectStreamingResponse({ 'transfer-encoding': 'identity' }),
      ).toBe(true);
    });

    it('returns false for normal JSON response', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(
        strategy.detectStreamingResponse({
          'content-type': 'application/json',
          'content-length': '128',
        }),
      ).toBe(false);
    });

    it('returns false for empty headers', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(strategy.detectStreamingResponse({})).toBe(false);
    });

    it('returns false when content-length present alongside transfer-encoding (non-chunked)', () => {
      const strategy = new StreamingStrategy(makeDeps());
      expect(
        strategy.detectStreamingResponse({
          'transfer-encoding': 'identity',
          'content-length': '100',
        }),
      ).toBe(false);
    });
  });

  describe('handlePureStreaming()', () => {
    it('returns a streaming response', () => {
      const deps = makeDeps();
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();
      const span = makeSpan();

      const response = strategy.handlePureStreaming(
        'stream-key',
        stream,
        { 'content-type': 'text/event-stream' },
        200,
        span,
      );

      expect(response).toBeDefined();
      expect((response as any)._isMockedStream).toBe(true);
    });

    it('calls cacheStreamToRedis when stream_enabled=true', () => {
      const deps = makeDeps({
        fetchConfig: jest.fn().mockReturnValue({ stream_enabled: true }),
      });
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan());

      expect(deps.cacheStreamToRedis).toHaveBeenCalledWith(
        'key',
        stream,
        {},
        200,
        [],
      );
    });

    it('does not call cacheStreamToRedis when stream_enabled=false', () => {
      const deps = makeDeps({
        fetchConfig: jest.fn().mockReturnValue({ stream_enabled: false }),
      });
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan());

      expect(deps.cacheStreamToRedis).not.toHaveBeenCalled();
    });

    it('sets http.status_code span attribute', () => {
      const deps = makeDeps();
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();
      const span = makeSpan();

      strategy.handlePureStreaming('key', stream, {}, 202, span);

      expect(span.setAttribute).toHaveBeenCalledWith('http.status_code', 202);
    });

    it('releases semaphore when stream ends', async () => {
      const deps = makeDeps();
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan());
      stream.resume(); // put in flowing mode so 'end' fires without a consumer
      stream.end();

      await new Promise((r) => setTimeout(r, 30));
      expect(deps.releaseSemaphore).toHaveBeenCalled();
    });

    it('releases semaphore when stream errors', async () => {
      const deps = makeDeps();
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan());
      stream.resume();
      stream.destroy(new Error('boom'));

      await new Promise((r) => setTimeout(r, 30));
      expect(deps.releaseSemaphore).toHaveBeenCalled();
    });

    it('does not release semaphore when shouldReleaseSemaphore=false', async () => {
      const deps = makeDeps();
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan(), false);
      stream.resume();
      stream.end();

      await new Promise((r) => setTimeout(r, 30));
      expect(deps.releaseSemaphore).not.toHaveBeenCalled();
    });

    it('handles semaphore release errors gracefully', async () => {
      const mockLoggedError = jest.fn();
      const loggerMock = require('@compliance-theater/logger');
      loggerMock.LoggedError.isTurtlesAllTheWayDownBaby = mockLoggedError;

      const deps = makeDeps({
        releaseSemaphore: jest.fn().mockImplementation(() => {
          throw new Error('semaphore broken');
        }),
      });
      const strategy = new StreamingStrategy(deps);
      const stream = new PassThrough();

      strategy.handlePureStreaming('key', stream, {}, 200, makeSpan());
      stream.resume();
      stream.end();

      await new Promise((r) => setTimeout(r, 30));
      expect(mockLoggedError).toHaveBeenCalled();
    });
  });
});
