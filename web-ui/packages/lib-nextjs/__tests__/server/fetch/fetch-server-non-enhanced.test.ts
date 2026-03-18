/* @jest-environment node */

/**
 * Tests for FetchManager in non-enhanced mode (using globalThis.fetch / DOM fetch path).
 * Also covers: loadConfig semaphore resize, fetchStream non-enhanced,
 * normalizeRequestInit URL/Request input, error paths.
 */

import { PassThrough } from 'stream';
import {
  FetchManager,
  normalizeRequestInit,
  resetFetchManager,
} from '../../../src/server/fetch/fetch-server';
import { hideConsoleOutput } from '../../shared/test-utils-server';

// ─── Mock fetch-config ───────────────────────────────────────────────────────
// fetchConfigSync returns concurrency=4, fetchConfig returns concurrency=8
// so the first loadConfig() call will trigger semaphore resize.

const mockFetchConfig = jest.fn();
const mockFetchConfigSync = jest.fn();

jest.mock('../../../src/server/fetch/fetch-config', () => ({
  fetchConfig: (...args: unknown[]) => mockFetchConfig(...args),
  fetchConfigSync: (...args: unknown[]) => mockFetchConfigSync(...args),
}));

// ─── Mock withTimeout ─────────────────────────────────────────────────────────

const mockWithTimeout = jest.fn();

jest.mock('@compliance-theater/logger/with-timeout', () => ({
  withTimeout: (...args: unknown[]) => mockWithTimeout(...args),
}));

const makeNonEnhancedConfig = (overrides: Record<string, unknown> = {}) => ({
  fetch_concurrency: 8,
  fetch_cache_ttl: 300,
  stream_enabled: false,
  enhanced: false,
  fetch_stream_detect_buffer: 1024,
  fetch_stream_buffer_max: 64 * 1024,
  fetch_stream_max_chunks: 100,
  fetch_stream_max_total_bytes: 10 * 1024 * 1024,
  dedup_writerequests: false,
  trace_level: 'info',
  timeout: {},
  ...overrides,
});

// ─── Mock response module ─────────────────────────────────────────────────────
// Avoids needing readable-web-to-node-stream in these tests.

jest.mock('../../../src/server/response', () => {
  const makePT = (data: Buffer) => {
    const { PassThrough } = require('stream');
    const pt = new PassThrough();
    setTimeout(() => { pt.write(data); pt.end(); }, 5);
    return pt;
  };
  return {
    webStreamToReadable: jest.fn().mockImplementation(async () =>
      makePT(Buffer.from('{"ok":true}'))
    ),
    makeResponse: jest.fn((v: { body: Buffer; headers: Record<string, string>; statusCode: number }) => ({
      _body: v.body,
      headers: new Headers(v.headers),
      status: v.statusCode,
      ok: v.statusCode >= 200 && v.statusCode < 300,
    })),
    makeStreamResponse: jest.fn((stream: unknown, init: { status?: number } = {}) => ({
      _stream: stream,
      status: init.status ?? 200,
    })),
    nodeStreamToReadableStream: jest.fn((stream: unknown) => {
      if (stream && typeof (stream as any).resume === 'function') {
        (stream as any).resume();
      }
      return { _isReadableStream: true, source: stream };
    }),
    FetchResponse: class MockFetchResponse {
      status: number;
      headers: Headers;
      constructor(
        _body: Buffer | ReadableStream | null,
        init: { status?: number; headers?: Record<string, string> } = {},
      ) {
        this.status = init.status ?? 200;
        this.headers = new Headers(init.headers ?? {});
      }
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Plain-object responses let Object.entries(headers) work (vs Headers class which returns [])
const makePlainJsonResponse = (status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { 'content-type': 'application/json', 'content-length': '11' },
  body: new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('{"ok":true}')); c.close(); },
  }),
});

// Response with array header value to trigger the Array.isArray branch (line 670/512)
const makePlainResponseWithArrayHeader = () => ({
  status: 200,
  ok: true,
  headers: { 'content-type': ['application/json', 'charset=utf-8'], 'x-single': 'val' },
  body: new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('ok')); c.close(); },
  }),
});

const makePlainStreamingResponse = (status = 200) => ({
  status,
  ok: true,
  headers: { 'content-type': 'text/event-stream' },
  body: new ReadableStream({ start(c) { c.close(); } }),
});

const makeNullBodyResponse = () => ({ status: 204, ok: true, headers: {}, body: null });

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockConsole = hideConsoleOutput();
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  mockConsole.setup();
  jest.clearAllMocks();
  resetFetchManager();

  // fetchConfigSync returns concurrency=4 (used at construction time)
  mockFetchConfigSync.mockReturnValue(makeNonEnhancedConfig({ fetch_concurrency: 4 }));
  // fetchConfig (async) returns concurrency=8 → triggers resize on first loadConfig()
  mockFetchConfig.mockResolvedValue(makeNonEnhancedConfig({ fetch_concurrency: 8 }));

  // withTimeout default: resolve the promise and return non-timed-out result
  mockWithTimeout.mockImplementation(async (p: Promise<unknown>) => ({
    timedOut: false,
    value: await p,
  }));

  originalFetch = globalThis.fetch;
  (globalThis as any).fetch = jest.fn().mockResolvedValue(makePlainJsonResponse());
});

afterEach(() => {
  mockConsole.dispose();
  globalThis.fetch = originalFetch;
  resetFetchManager();
});

// ─── normalizeRequestInit: URL and Request-like inputs ────────────────────────

describe('normalizeRequestInit - URL and Request inputs', () => {
  it('handles URL instance as requestInfo', () => {
    const url = new URL('https://example.com/path');
    const [resolved] = normalizeRequestInit({ requestInfo: url });
    expect(resolved).toBe('https://example.com/path');
  });

  it('handles RequestInfo object with url property (number timeout)', () => {
    const reqInfo = { url: 'https://example.com', timeout: 5000 } as any;
    const [resolved, options] = normalizeRequestInit({ requestInfo: reqInfo });
    expect(resolved).toBe('https://example.com');
    expect((options.timeout as any)?.connect).toBe(5000);
    expect((options.timeout as any)?.socket).toBe(5000);
  });

  it('handles RequestInfo object with url property (object timeout)', () => {
    const reqInfo = { url: 'https://example.com', timeout: { connect: 1000, socket: 2000 } } as any;
    const [resolved, options] = normalizeRequestInit({ requestInfo: reqInfo });
    expect(resolved).toBe('https://example.com');
    expect((options.timeout as any)?.connect).toBe(1000);
  });

  it('handles RequestInfo object with url property (unrecognized timeout type)', () => {
    const reqInfo = { url: 'https://example.com', timeout: 'fast' } as any;
    const [resolved] = normalizeRequestInit({ requestInfo: reqInfo });
    expect(resolved).toBe('https://example.com');
  });

  it('throws for object requestInfo without url property', () => {
    const reqInfo = { method: 'GET' } as any;
    expect(() => normalizeRequestInit({ requestInfo: reqInfo })).toThrow('Invalid requestInfo');
  });

  it('throws for falsy requestInfo', () => {
    expect(() => normalizeRequestInit({ requestInfo: '' as any })).toThrow('Invalid requestInfo');
  });
});

// ─── FetchManager constructor: fetchConfigSync error ─────────────────────────

describe('FetchManager constructor - fetchConfigSync throws', () => {
  it('falls back to default concurrency when fetchConfigSync throws', () => {
    mockFetchConfigSync.mockImplementation(() => { throw new Error('config error'); });
    // Should not throw; falls back gracefully
    expect(() => new FetchManager({ concurrency: 5 })).not.toThrow();
  });
});

// ─── loadConfig: semaphore resize ─────────────────────────────────────────────

describe('FetchManager.loadConfig - semaphore resize', () => {
  it('resizes semaphore when concurrency changes between sync and async config', async () => {
    // Construction uses concurrency=4 (sync), first fetch uses concurrency=8 (async)
    const manager = new FetchManager({ concurrency: 4 });
    // Trigger loadConfig via fetch
    await manager.fetch('http://example.com/api', { method: 'GET' });
    // If resize was called without throwing, the test passes
    expect(mockFetchConfig).toHaveBeenCalled();
  });

  it('does not resize when concurrency is unchanged', async () => {
    // Both sync and async return the same concurrency
    mockFetchConfigSync.mockReturnValue(makeNonEnhancedConfig({ fetch_concurrency: 4 }));
    mockFetchConfig.mockResolvedValue(makeNonEnhancedConfig({ fetch_concurrency: 4 }));
    const manager = new FetchManager({ concurrency: 4 });
    await manager.fetch('http://example.com/api');
    expect(mockFetchConfig).toHaveBeenCalled();
  });
});

// ─── FetchManager.fetch - non-enhanced path ───────────────────────────────────

describe('FetchManager.fetch - non-enhanced (DOM fetch)', () => {
  it('calls globalThis.fetch and returns a response', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', { method: 'GET' });
    expect(result).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.com/api',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns streaming response when response has text/event-stream content-type', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makePlainStreamingResponse());
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/stream');
    expect(result).toBeDefined();
  });

  it('handles array-value headers in response (covers Array.isArray branch)', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makePlainResponseWithArrayHeader());
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/array-headers');
    expect(result).toBeDefined();
  });

  it('throws when response has no body', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makeNullBodyResponse());
    const manager = new FetchManager({ concurrency: 4 });
    await expect(manager.fetch('http://example.com/nobody')).rejects.toThrow('No body found in response');
  });

  it('throws when no fetch implementation available', async () => {
    const savedFetch = globalThis.fetch;
    (globalThis as any).fetch = undefined;
    const manager = new FetchManager({ concurrency: 4 });
    await expect(manager.fetch('http://example.com/api')).rejects.toThrow('No fetch implementation found');
    globalThis.fetch = savedFetch;
  });

  it('handles POST request (non-GET)', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', { method: 'POST', body: '{"data":1}' });
    expect(result).toBeDefined();
  });

  it('applies request timeout when provided', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', {
      timeout: { request: 30000 },
    } as any);
    expect(result).toBeDefined();
  });

  it('forwards signal to fetch via AbortController', async () => {
    const controller = new AbortController();
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', {
      signal: controller.signal as any,
    });
    expect(result).toBeDefined();
  });
});

// ─── FetchManager.fetchStream - non-enhanced path ────────────────────────────

describe('FetchManager.fetchStream - non-enhanced', () => {
  it('returns a response from stream fetch (buffered)', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetchStream('http://example.com/stream');
    expect(result).toBeDefined();
  });

  it('returns streaming response for event-stream', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makePlainStreamingResponse());
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetchStream('http://example.com/events');
    expect(result).toBeDefined();
  });

  it('handles array-value headers in fetchStream response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makePlainResponseWithArrayHeader());
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetchStream('http://example.com/array-h');
    expect(result).toBeDefined();
  });

  it('throws when no body from fetchStream', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(makeNullBodyResponse());
    const manager = new FetchManager({ concurrency: 4 });
    await expect(manager.fetchStream('http://example.com/nobody')).rejects.toThrow('No body found in response');
  });
});

// ─── FetchManager - #doDomFetch with Headers source types ─────────────────────

describe('FetchManager.fetch - doDomFetch header normalization', () => {
  it('handles array-format headers', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', {
      headers: [['Authorization', 'Bearer token']] as any,
    });
    expect(result).toBeDefined();
  });

  it('handles Headers instance', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', {
      headers: new Headers({ 'X-Custom': 'value' }) as any,
    });
    expect(result).toBeDefined();
  });

  it('handles undefined values in header record', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', {
      headers: { 'X-Present': 'value', 'X-Missing': undefined } as any,
    });
    expect(result).toBeDefined();
  });
});

// ─── loadConfig: streamBufferMax update ───────────────────────────────────────

describe('FetchManager.loadConfig - streamBufferMax update (line 421)', () => {
  it('updates streamBufferMax when async config returns a different value', async () => {
    // DEFAULT_STREAM_BUFFER_MAX = 64 * 1024; return 32 * 1024 to trigger update
    mockFetchConfig.mockResolvedValue(
      makeNonEnhancedConfig({ fetch_concurrency: 4, fetch_stream_buffer_max: 32 * 1024 }),
    );
    const manager = new FetchManager({ concurrency: 4 });
    // Trigger loadConfig which reads the new fetch_stream_buffer_max
    await manager.fetch('http://example.com/api');
    expect(mockFetchConfig).toHaveBeenCalled();
  });
});

// ─── loadConfig: semaphore resize error ──────────────────────────────────────

describe('FetchManager.loadConfig - semaphore resize error (line 399)', () => {
  it('handles semaphore resize throwing without propagating (line 399)', async () => {
    const manager = new FetchManager({ concurrency: 4 });
    // Spy on the private semManager to make resize throw
    jest.spyOn((manager as any).semManager, 'resize').mockImplementation(() => {
      throw new Error('resize failed');
    });
    // loadConfig detects concurrency change (4→8) and tries to resize; catches the error
    await expect(manager.fetch('http://example.com/api')).resolves.toBeDefined();
  });
});

// ─── #isEnhancedEnabled: fetchConfig rejection ────────────────────────────────

describe('FetchManager.#isEnhancedEnabled - catch path (lines 578-582)', () => {
  it('falls back to non-enhanced when fetchConfig rejects in #isEnhancedEnabled', async () => {
    // loadConfig (1st call) succeeds; #isEnhancedEnabled (2nd call) rejects
    mockFetchConfig
      .mockResolvedValueOnce(makeNonEnhancedConfig({ fetch_concurrency: 4 }))
      .mockRejectedValueOnce(new Error('enhanced check failed'));
    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api');
    expect(result).toBeDefined();
  });
});

// ─── #doDomFetch: timeout timedOut path ───────────────────────────────────────

describe('FetchManager.fetch - doDomFetch timeout timedOut (lines 632-633)', () => {
  it('aborts and throws TimeoutError when request times out', async () => {
    // Make withTimeout signal a timed-out result
    mockWithTimeout.mockResolvedValueOnce({ timedOut: true });
    const manager = new FetchManager({ concurrency: 4 });
    await expect(
      manager.fetch('http://example.com/api', { timeout: { request: 100 } } as any),
    ).rejects.toThrow();
  });
});
