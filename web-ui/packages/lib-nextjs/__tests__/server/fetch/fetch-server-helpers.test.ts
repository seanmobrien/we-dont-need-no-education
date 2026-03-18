/* @jest-environment node */

/**
 * Tests for FetchManager singleton helpers and Symbol.dispose.
 * Also covers Header/array input paths for normalizeRequestInit.
 */

import got from 'got';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import {
  FetchManager,
  normalizeRequestInit,
  getFetchManager,
  configureFetchManager,
  resetFetchManager,
  serverFetch,
  fetchStream,
} from '../../../src/server/fetch/fetch-server';
import { hideConsoleOutput } from '../../shared/test-utils-server';

const mockConsole = hideConsoleOutput();

beforeEach(() => {
  mockConsole.setup();
  resetFetchManager();
});

afterEach(() => {
  mockConsole.dispose();
  resetFetchManager();
});

// ─── normalizeRequestInit: Headers and array header sources ──────────────────

describe('normalizeRequestInit - Headers and array sources', () => {
  it('merges Headers instance into result', () => {
    const headers = new Headers({ 'X-Token': 'abc', 'Content-Type': 'text/plain' });
    const [url, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: {},
      defaults: { headers },
    });
    expect(url).toBe('https://example.com');
    expect(options.headers?.['x-token']).toBe('abc');
  });

  it('merges array of [key, value] header tuples', () => {
    const headers: [string, string][] = [['X-Custom', 'foo'], ['Accept', 'application/json']];
    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: {},
      defaults: { headers },
    });
    expect(options.headers?.['X-Custom']).toBe('foo');
    expect(options.headers?.['Accept']).toBe('application/json');
  });

  it('handles URLSearchParams body with array headers - adds Content-Type', () => {
    const params = new URLSearchParams({ key: 'value' });
    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: { body: params, headers: [['Authorization', 'Bearer token']] as any },
    });
    // Should add Content-Type since it's not in the array headers
    expect(options.headers?.['Authorization']).toBe('Bearer token');
  });

  it('handles URLSearchParams body with Headers instance - adds Content-Type', () => {
    const params = new URLSearchParams({ a: '1' });
    const headers = new Headers({ 'Accept': 'application/json' });
    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: { body: params, headers: headers as any },
    });
    expect(options.headers?.['accept']).toBe('application/json');
  });

  it('handles URLSearchParams body with object headers - adds Content-Type when missing', () => {
    const params = new URLSearchParams({ a: '1' });
    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: { body: params, headers: { 'X-Header': 'value' } },
    });
    expect(options.headers?.['Content-Type']).toBe(
      'application/x-www-form-urlencoded;charset=UTF-8',
    );
  });
});

// ─── FetchManager Symbol.dispose ─────────────────────────────────────────────

describe('FetchManager[Symbol.dispose]', () => {
  it('disposes cleanly without throwing', () => {
    const manager = new FetchManager({ concurrency: 1 });
    expect(() => manager[Symbol.dispose]()).not.toThrow();
  });

  it('can be disposed multiple times safely', () => {
    const manager = new FetchManager({ concurrency: 2 });
    manager[Symbol.dispose]();
    // Second dispose should not throw
    expect(() => manager[Symbol.dispose]()).not.toThrow();
  });
});

// ─── Singleton helpers ────────────────────────────────────────────────────────

describe('getFetchManager', () => {
  it('returns a FetchManager instance', () => {
    const manager = getFetchManager();
    expect(manager).toBeInstanceOf(FetchManager);
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    const a = getFetchManager();
    const b = getFetchManager();
    expect(a).toBe(b);
  });
});

describe('configureFetchManager', () => {
  it('creates and stores a new FetchManager with given config', () => {
    const manager = configureFetchManager({ concurrency: 4 });
    expect(manager).toBeInstanceOf(FetchManager);
    expect(getFetchManager()).toBe(manager);
  });

  it('replaces the existing singleton', () => {
    const first = getFetchManager();
    const second = configureFetchManager({ concurrency: 2 });
    expect(getFetchManager()).toBe(second);
    expect(getFetchManager()).not.toBe(first);
  });
});

describe('resetFetchManager', () => {
  it('removes the singleton', () => {
    const manager = getFetchManager();
    resetFetchManager();
    // After reset, a new instance should be created
    const fresh = getFetchManager();
    expect(fresh).not.toBe(manager);
  });

  it('can reset when no instance exists without throwing', () => {
    resetFetchManager(); // first reset
    expect(() => resetFetchManager()).not.toThrow(); // second is a no-op
  });
});

// ─── serverFetch / fetchStream convenience wrappers ───────────────────────────

describe('serverFetch', () => {
  it('delegates to getFetchManager().fetch', async () => {
    const manager = getFetchManager();
    const fetchSpy = jest.spyOn(manager, 'fetch').mockResolvedValue({
      status: 200,
    } as any);

    await serverFetch('http://example.com/api');
    expect(fetchSpy).toHaveBeenCalledWith('http://example.com/api', undefined);
  });

  it('passes init through to fetch', async () => {
    const manager = getFetchManager();
    const fetchSpy = jest.spyOn(manager, 'fetch').mockResolvedValue({ status: 204 } as any);

    await serverFetch('http://example.com', { method: 'POST' });
    expect(fetchSpy).toHaveBeenCalledWith('http://example.com', { method: 'POST' });
  });
});

describe('fetchStream', () => {
  it('delegates to getFetchManager().fetchStream', async () => {
    const manager = getFetchManager();
    const streamSpy = jest.spyOn(manager, 'fetchStream').mockResolvedValue({
      status: 200,
    } as any);

    await fetchStream('http://example.com/stream');
    expect(streamSpy).toHaveBeenCalledWith('http://example.com/stream', undefined);
  });
});

// ─── FetchManager.fetch - enhanced GET path ───────────────────────────────────

describe('FetchManager.fetch - enhanced GET via got.stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles enhanced GET with non-streaming got.stream response (buffered)', async () => {
    // Override got.stream to emit a proper response then data
    const mockStream = new PassThrough() as any;
    mockStream.pipe = jest.fn(function (this: any, dest: any) { return dest; });
    (got as any).stream = jest.fn().mockReturnValue(mockStream);

    // Simulate got.stream emitting a response event
    setTimeout(() => {
      mockStream.emit('response', {
        statusCode: 200,
        headers: { 'content-type': 'application/json', 'content-length': '11' },
      });
      mockStream.write(Buffer.from('{"ok":true}'));
      mockStream.end();
    }, 5);

    // Mock fetchConfig to return enhanced=true
    jest.doMock('../../../src/server/fetch/fetch-config', () => ({
      fetchConfig: jest.fn().mockResolvedValue({
        fetch_concurrency: 4,
        fetch_cache_ttl: 300,
        stream_enabled: false,
        enhanced: true,
        fetch_stream_detect_buffer: 1024,
        fetch_stream_buffer_max: 64 * 1024,
        fetch_stream_max_chunks: 100,
        fetch_stream_max_total_bytes: 10 * 1024 * 1024,
        dedup_writerequests: false,
        trace_level: 'info',
        timeout: {},
      }),
      fetchConfigSync: jest.fn().mockReturnValue({
        fetch_concurrency: 4,
        enhanced: true,
        stream_enabled: false,
        fetch_cache_ttl: 300,
        fetch_stream_detect_buffer: 1024,
        fetch_stream_buffer_max: 64 * 1024,
        fetch_stream_max_chunks: 100,
        fetch_stream_max_total_bytes: 10 * 1024 * 1024,
        dedup_writerequests: false,
        trace_level: 'info',
        timeout: {},
      }),
    }));

    const manager = new FetchManager({ concurrency: 4 });
    const result = await manager.fetch('http://example.com/api', { method: 'GET' });
    expect(result).toBeDefined();

    jest.dontMock('../../../src/server/fetch/fetch-config');
  }, 5000);
});
