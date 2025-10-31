import got, { Response as GotResponse, OptionsOfBufferResponseBody } from 'got';
import type { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
type Handler = (...args: unknown[]) => void;
import { getRedisClient } from '@/lib/redis-client';
import { makeResponse, makeStreamResponse } from './response';
import { fetchConfigSync } from '@/lib/site-util/feature-flags/fetch-config';
import { LoggedError } from '@/lib/react-util';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';

type RequestInfo = string | URL | Request;
type RequestInit = {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: unknown;
  timeout?: number;
  [k: string]: unknown;
};

class LRUCache<K, V> {
  private maxSize: number;
  private map = new Map<K, V>();
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }
  get(key: K) {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: K, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value as K | undefined;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
  delete(key: K) {
    this.map.delete(key);
  }
}

class Semaphore {
  private slots: number;
  private waiting: Array<() => void> = [];
  constructor(concurrency: number) {
    this.slots = concurrency;
  }
  async acquire() {
    if (this.slots > 0) {
      this.slots--;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.slots--;
  }
  release() {
    this.slots++;
    const waiter = this.waiting.shift();
    if (waiter) waiter();
  }
}

class SemaphoreManager {
  private current: Semaphore;
  constructor(initial: Semaphore) {
    this.current = initial;
  }
  get sem() {
    return this.current;
  }
  resize(newConcurrency: number) {
    this.current = new Semaphore(newConcurrency);
  }
}

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_CACHE_SIZE = 500;
let STREAM_DETECT_BUFFER = 4 * 1024;
let STREAM_BUFFER_MAX = 64 * 1024;

const cache = new LRUCache<
  string,
  Promise<{ body: Buffer; headers: Record<string, string>; statusCode: number }>
>(DEFAULT_CACHE_SIZE);
const inflight = new Map<
  string,
  Promise<{ body: Buffer; headers: Record<string, string>; statusCode: number }>
>();

let initialConcurrency = DEFAULT_CONCURRENCY;
try {
  const cfg = fetchConfigSync();
  initialConcurrency = cfg.fetch_concurrency ?? DEFAULT_CONCURRENCY;
} catch {
  LoggedError.isTurtlesAllTheWayDownBaby(undefined, {
    source: 'fetch:init',
    log: true,
  });
}
const sem = new Semaphore(initialConcurrency);
const semManager = new SemaphoreManager(sem);

// Periodic config watcher to resize semaphore
let lastObservedConcurrency = initialConcurrency;
setInterval(() => {
  try {
    const cfg = fetchConfigSync();
    const v = cfg.fetch_concurrency ?? DEFAULT_CONCURRENCY;
    if (v !== lastObservedConcurrency) {
      try {
        semManager.resize(v);
        lastObservedConcurrency = v;
        console.info(`[fetch] resized semaphore to ${v}`);
      } catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'fetch:resize',
          log: true,
        });
      }
    }
  } catch {
    /* ignore */
  }
}, 1000 * 30);

async function doGotFetch(url: string, init?: RequestInit) {
  const method = (init?.method || 'GET').toUpperCase();
  const headers =
    init?.headers && !(init.headers instanceof Headers)
      ? (init.headers as Record<string, string>)
      : undefined;
  const gotOptions: Record<string, unknown> = {
    method,
    headers,
    timeout: init?.timeout,
    isStream: false,
    retry: { limit: 1 },
    throwHttpErrors: false,
    responseType: 'buffer',
  };
  if (init?.body != null) gotOptions.body = init.body;

  await semManager.sem.acquire();
  try {
    const res: GotResponse<Buffer> = await got(
      url,
      gotOptions as unknown as OptionsOfBufferResponseBody,
    );
    const headersObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers || {})) {
      if (Array.isArray(v)) headersObj[k] = v.join(',');
      else if (v === undefined) continue;
      else headersObj[k] = String(v);
    }
    return {
      body: res.rawBody,
      headers: headersObj,
      statusCode: res.statusCode,
    };
  } finally {
    semManager.sem.release();
  }
}

export async function fetchStream(input: RequestInfo, init?: RequestInit) {
  const url = normalizeUrl(input);
  const method = (init?.method || 'GET').toUpperCase();
  const options: Record<string, unknown> = {
    method,
    headers: init?.headers,
    timeout: init?.timeout,
    isStream: true,
    retry: { limit: 1 },
  };
  await semManager.sem.acquire();
  try {
    const stream = got.stream(url, options);
    const releaseOnce = () => {
      try {
        semManager.sem.release();
      } catch {}
    };
    stream.on('end', releaseOnce);
    stream.on('error', releaseOnce);
    return stream;
  } catch (err) {
    semManager.sem.release();
    throw err;
  }
}

function normalizeUrl(input: RequestInfo) {
  if (typeof input === 'string' || input instanceof URL) return String(input);
  const reqLike = input as unknown as { url?: string };
  if (reqLike && reqLike.url) return reqLike.url;
  throw new Error('Unsupported RequestInfo type');
}

export const fetch = async (input: RequestInfo, init?: RequestInit) => {
  try {
    const cfg = fetchConfigSync();
    if (!cfg.enhanced) {
      const domFetch = (globalThis as unknown as { fetch?: unknown })
        .fetch as unknown;
      if (typeof domFetch === 'function') {
        return (domFetch as (...args: unknown[]) => Promise<Response>)(
          input as unknown,
          init as unknown,
        );
      }
    }
  } catch {
    /* continue with enhanced */
  }

  const url = normalizeUrl(input);
  const method = (init?.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const cacheKey = `${method}:${url}`;
    const instrumented = await createInstrumentedSpan({
      spanName: 'fetch.get',
      attributes: { 'http.method': 'GET', 'http.url': url },
    });
    return await instrumented.executeWithContext(async (span) => {
      // in-memory quick hit
      const cached = cache.get(cacheKey);
      if (cached) {
        span.setAttribute('http.cache_hit', true);
        return cached.then((v) => makeResponse(v));
      }
      span.setAttribute('http.cache_hit', false);

      // Redis buffered or stream replay
      try {
        const redis = await getRedisClient();
        const raw = await redis.get(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            bodyB64: string;
            headers: Record<string, string>;
            statusCode: number;
          };
          const body = Buffer.from(parsed.bodyB64, 'base64');
          const value = {
            body,
            headers: parsed.headers,
            statusCode: parsed.statusCode,
          };
          cache.set(cacheKey, Promise.resolve(value));
          span.setAttribute('http.redis_hit', true);
          span.setAttribute('http.status_code', parsed.statusCode);
          return makeResponse(value);
        }

        const streamKey = `${cacheKey}:stream`;
        const metaKey = `${cacheKey}:stream:meta`;
        const streamLen = await redis.lLen(streamKey).catch(() => 0);
        if (streamLen > 0) {
          const metaRaw = await redis.get(metaKey).catch(() => null);
          let meta:
            | { headers?: Record<string, string>; statusCode?: number }
            | undefined = undefined;
          if (metaRaw) {
            try {
              const parsed = JSON.parse(metaRaw);
              if (parsed && typeof parsed === 'object') {
                const p = parsed as Record<string, unknown>;
                const headers = p.headers;
                const statusCode = p.statusCode;
                meta = {
                  headers:
                    typeof headers === 'object' && headers
                      ? (headers as Record<string, string>)
                      : undefined,
                  statusCode:
                    typeof statusCode === 'number'
                      ? (statusCode as number)
                      : undefined,
                };
              }
            } catch {}
          }
          const { PassThrough } = await import('stream');
          const pass = new PassThrough();
          (async () => {
            try {
              const items = await redis.lRange(streamKey, 0, -1);
              for (const it of items.reverse()) {
                try {
                  pass.write(Buffer.from(it, 'base64'));
                } catch {}
              }
            } catch {
            } finally {
              pass.end();
            }
          })();
          span.setAttribute('http.redis_stream_replay', true);
          span.setAttribute('http.status_code', meta?.statusCode ?? 200);
          return makeStreamResponse(pass, {
            status: meta?.statusCode ?? 200,
            headers: meta?.headers ?? {},
          });
        }
      } catch {
        span.setAttribute('http.redis_unavailable', true);
      }

      // dedupe inflight
      const inFlight = inflight.get(cacheKey);
      if (inFlight) {
        span.setAttribute('http.inflight_dedupe', true);
        return inFlight.then((v) => makeResponse(v));
      }

      try {
        const cfg = fetchConfigSync();
        STREAM_DETECT_BUFFER = cfg.fetch_stream_detect_buffer;
        STREAM_BUFFER_MAX = cfg.fetch_stream_buffer_max;
      } catch {}

      await semManager.sem.acquire();
      let gotStream: Readable;
      try {
        const headersForGot =
          init?.headers && !(init.headers instanceof Headers)
            ? (init.headers as Record<string, string>)
            : undefined;
        gotStream = got.stream(url, {
          method: 'GET',
          headers: headersForGot,
          retry: { limit: 1 },
        });

        const resHead: {
          statusCode?: number;
          headers?: Record<string, string | string[]>;
        } = await new Promise((resolve, reject) => {
          const ee = gotStream as unknown as EventEmitter;
          const onResponse = (res: IncomingMessage) => {
            ee.removeListener('response', onResponse as Handler);
            ee.removeListener('error', onError as Handler);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers as Record<string, string | string[]>,
            });
          };
          const onError = (err: Error) => {
            ee.removeListener('response', onResponse as Handler);
            ee.removeListener('error', onError as Handler);
            reject(err);
          };
          ee.on('response', onResponse as Handler);
          ee.on('error', onError as Handler);
        });

        const headersLower: Record<string, string> = {};
        for (const [k, v] of Object.entries(resHead.headers || {}))
          headersLower[k.toLowerCase()] = Array.isArray(v)
            ? v.join(',')
            : String(v ?? '');

        const isStreaming = (() => {
          const te = headersLower['transfer-encoding'];
          const ct = headersLower['content-type'] || '';
          if (te && te.toLowerCase().includes('chunked')) return true;
          if (ct.includes('text/event-stream') || ct.includes('multipart/'))
            return true;
          if (!('content-length' in headersLower) && te) return true;
          return false;
        })();

        span.setAttribute('http.is_streaming', isStreaming);

        if (isStreaming) {
          const cfg = fetchConfigSync();
          if (cfg.stream_enabled) {
            (async () => {
              try {
                const redis = await getRedisClient();
                const streamKey = `${cacheKey}:stream`;
                const metaKey = `${cacheKey}:stream:meta`;
                const maxChunks = cfg.fetch_stream_max_chunks;
                const maxBytes = cfg.fetch_stream_max_total_bytes;
                let totalBytes = 0;
                let pushed = 0;
                await redis.del(streamKey).catch(() => {});
                await redis
                  .set(
                    metaKey,
                    JSON.stringify({
                      headers: headersLower,
                      statusCode: resHead.statusCode,
                    }),
                  )
                  .catch(() => {});
                for await (const ch of gotStream as unknown as AsyncIterable<Buffer>) {
                  try {
                    const b = Buffer.isBuffer(ch)
                      ? ch
                      : Buffer.from(String(ch));
                    totalBytes += b.length;
                    if (totalBytes > maxBytes || pushed >= maxChunks) break;
                    await redis.rPush(streamKey, b.toString('base64'));
                    pushed++;
                  } catch {
                    break;
                  }
                }
                await redis
                  .expire(streamKey, cfg.fetch_cache_ttl)
                  .catch(() => {});
                await redis
                  .expire(metaKey, cfg.fetch_cache_ttl)
                  .catch(() => {});
              } catch {}
            })();
          }
          const releaseOnce = () => {
            try {
              semManager.sem.release();
            } catch {}
          };
          const ee = gotStream as unknown as EventEmitter;
          ee.on('end', releaseOnce as Handler);
          ee.on('error', releaseOnce as Handler);
          span.setAttribute('http.status_code', resHead.statusCode ?? 200);
          return makeStreamResponse(gotStream, {
            status: resHead.statusCode,
            headers: headersLower,
          });
        }

        const chunks: Buffer[] = [];
        let bufferedBytes = 0;
        let ended = false;
        let errored: Error | undefined = undefined;

        const onData = (chunk: Buffer) => {
          const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
          chunks.push(b);
          bufferedBytes += b.length;
        };
        const onEnd = () => {
          ended = true;
          cleanupEvents();
        };
        const onError = (err: Error) => {
          errored = err;
          cleanupEvents();
        };
        const cleanupEvents = () => {
          const ee = gotStream as unknown as EventEmitter;
          ee.removeListener('data', onData as Handler);
          ee.removeListener('end', onEnd as Handler);
          ee.removeListener('error', onError as Handler);
        };

        const ee2 = gotStream as unknown as EventEmitter;
        ee2.on('data', onData as Handler);
        ee2.on('end', onEnd as Handler);
        ee2.on('error', onError as Handler);

        await new Promise<void>((resolve) => {
          const check = () => {
            if (ended || errored) return resolve();
            if (bufferedBytes >= STREAM_DETECT_BUFFER) return resolve();
          };
          check();
          const i = setInterval(() => {
            if (ended || errored || bufferedBytes >= STREAM_DETECT_BUFFER) {
              clearInterval(i);
              resolve();
            }
          }, 10);
        });

        if (errored) throw errored;

        if (ended) {
          const body = Buffer.concat(chunks);
          const v = {
            body,
            headers: headersLower,
            statusCode: resHead.statusCode ?? 200,
          };
          cache.set(cacheKey, Promise.resolve(v));
          (async () => {
            try {
              const redis = await getRedisClient();
              const payload = JSON.stringify({
                bodyB64: v.body.toString('base64'),
                headers: v.headers,
                statusCode: v.statusCode,
              });
              const cfg = fetchConfigSync();
              await redis.setEx(cacheKey, cfg.fetch_cache_ttl, payload);
            } catch {}
          })();
          try {
            semManager.sem.release();
          } catch {}
          span.setAttribute('http.status_code', v.statusCode);
          return makeResponse(v);
        }

        if (bufferedBytes > STREAM_BUFFER_MAX) {
          const { PassThrough } = await import('stream');
          const pass = new PassThrough();
          for (const c of chunks) pass.write(c);
          gotStream.pipe(pass);
          const cfg = fetchConfigSync();
          if (cfg.stream_enabled) {
            (async () => {
              try {
                const redis = await getRedisClient();
                const streamKey = `${cacheKey}:stream`;
                const metaKey = `${cacheKey}:stream:meta`;
                const maxChunks = cfg.fetch_stream_max_chunks;
                const maxBytes = cfg.fetch_stream_max_total_bytes;
                let totalBytes = 0;
                let pushed = 0;
                await redis.del(streamKey).catch(() => {});
                await redis
                  .set(
                    metaKey,
                    JSON.stringify({
                      headers: headersLower,
                      statusCode: resHead.statusCode,
                    }),
                  )
                  .catch(() => {});
                for (const c of chunks) {
                  const b = Buffer.isBuffer(c) ? c : Buffer.from(String(c));
                  totalBytes += b.length;
                  if (totalBytes > maxBytes || pushed >= maxChunks) break;
                  await redis.rPush(streamKey, b.toString('base64'));
                  pushed++;
                }
                for await (const ch of gotStream as unknown as AsyncIterable<Buffer>) {
                  if (totalBytes > maxBytes || pushed >= maxChunks) break;
                  const b = Buffer.isBuffer(ch) ? ch : Buffer.from(String(ch));
                  totalBytes += b.length;
                  if (totalBytes > maxBytes) break;
                  await redis.rPush(streamKey, b.toString('base64'));
                  pushed++;
                }
                await redis
                  .expire(streamKey, cfg.fetch_cache_ttl)
                  .catch(() => {});
                await redis
                  .expire(metaKey, cfg.fetch_cache_ttl)
                  .catch(() => {});
              } catch {}
            })();
          }
          const releaseOnce = () => {
            try {
              semManager.sem.release();
            } catch {}
          };
          const ee3 = pass as unknown as EventEmitter;
          ee3.on('end', releaseOnce);
          ee3.on('error', releaseOnce);
          span.setAttribute('http.status_code', resHead.statusCode ?? 200);
          return makeStreamResponse(pass, {
            status: resHead.statusCode,
            headers: headersLower,
          });
        }

        await new Promise<void>((resolve, reject) => {
          if (ended) return resolve();
          if (errored) return reject(errored);
          const onEnd2 = () => {
            cleanupEvents();
            resolve();
          };
          const onErr2 = (e: Error) => {
            cleanupEvents();
            reject(e);
          };
          const ee3 = gotStream as unknown as EventEmitter;
          ee3.once('end', onEnd2 as Handler);
          ee3.once('error', onErr2 as Handler);
        });

        if (errored) throw errored;
        const body = Buffer.concat(chunks);
        const v = {
          body,
          headers: headersLower,
          statusCode: resHead.statusCode ?? 200,
        };
        cache.set(cacheKey, Promise.resolve(v));
        (async () => {
          try {
            const redis = await getRedisClient();
            const payload = JSON.stringify({
              bodyB64: v.body.toString('base64'),
              headers: v.headers,
              statusCode: v.statusCode,
            });
            const cfg2 = fetchConfigSync();
            await redis.setEx(cacheKey, cfg2.fetch_cache_ttl, payload);
          } catch {}
        })();
        try {
          semManager.sem.release();
        } catch {}
        span.setAttribute('http.status_code', v.statusCode);
        return makeResponse(v);
      } catch (err) {
        try {
          semManager.sem.release();
        } catch {}
        span.setAttribute('http.error', true);
        throw err;
      }
    });
  }

  // non-GET: do a normal got fetch limited by semaphore
  const instrumented = await createInstrumentedSpan({
    spanName: 'fetch.non_get',
    attributes: { 'http.method': method, 'http.url': url },
  });
  return await instrumented.executeWithContext(async (span) => {
    const v = await doGotFetch(url, init);
    span.setAttribute('http.status_code', v.statusCode);
    return makeResponse(v);
  });
};

export default fetch;
