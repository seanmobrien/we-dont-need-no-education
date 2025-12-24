/**
 * @fileoverview Cache strategy implementations for enhanced fetch
 *
 * This module provides three caching strategies:
 * 1. Memory Cache (L1) - Fast LRU cache for hot data
 * 2. Redis Cache (L2) - Persistent cross-instance cache (buffered + streaming)
 * 3. Inflight Deduplication - Prevents duplicate concurrent requests
 *
 * Each strategy can be tested independently and follows dependency injection pattern.
 */

import { LoggedError } from '@/lib/react-util';
import {
  makeResponse,
  makeStreamResponse,
  nodeStreamToReadableStream,
} from '../response';
import type {
  CacheStrategyDeps,
  CacheResult,
  CachedValue,
  SpanLike,
} from './fetch-types';

/**
 * Cache strategies for multi-layer fetch caching
 *
 * Implements three caching levels with proper fallback and warming:
 * - Memory cache (fastest, limited size)
 * - Redis cache (persistent, larger capacity, supports streaming replay)
 * - Inflight deduplication (prevents redundant requests)
 */
export class CacheStrategies {
  constructor(private deps: CacheStrategyDeps) {}

  /**
   * Strategy 1: Try memory cache lookup (L1)
   *
   * Fastest cache layer. Returns immediately if hit.
   *
   * @param cacheKey - Cache key for the request
   * @param span - OpenTelemetry span for instrumentation
   * @returns Promise<Response> if cache hit, undefined if miss
   */
  async tryMemoryCache(cacheKey: string, span: SpanLike): Promise<CacheResult> {
    const cached = this.deps.cache.get(cacheKey);
    if (cached) {
      span.setAttribute('http.cache_hit', true);
      return cached.then((v) => makeResponse(v));
    }
    span.setAttribute('http.cache_hit', false);
    return undefined;
  }

  /**
   * Strategy 2: Try Redis cache lookup (L2)
   *
   * Handles two Redis cache formats:
   * 1. Buffered: Complete response stored as base64-encoded JSON
   * 2. Stream: Response chunks stored as Redis list for replay
   *
   * On buffered cache hit, warms the memory cache for faster subsequent access.
   *
   * @param cacheKey - Cache key for the request
   * @param span - OpenTelemetry span for instrumentation
   * @returns Promise<Response> if cache hit, undefined if miss or Redis unavailable
   */
  async tryRedisCache(cacheKey: string, span: SpanLike): Promise<CacheResult> {
    try {
      const redis = await this.deps.getRedisClient();

      // Try buffered cache
      const raw = await redis.get(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          bodyB64: string;
          headers: Record<string, string>;
          statusCode: number;
        };
        const body = Buffer.from(parsed.bodyB64, 'base64');
        const value: CachedValue = {
          body,
          headers: parsed.headers,
          statusCode: parsed.statusCode,
        };

        // Warm memory cache
        this.deps.cache.set(cacheKey, Promise.resolve(value));
        span.setAttribute('http.redis_hit', true);
        span.setAttribute('http.status_code', parsed.statusCode);
        return makeResponse(value);
      }

      // Try stream cache
      const streamKey = `${cacheKey}:stream`;
      const metaKey = `${cacheKey}:stream:meta`;
      const streamLen = await redis.lLen(streamKey).catch((err: unknown) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'cache-strategies:redis:lLen',
          log: true,
        });
        return 0;
      });

      if (streamLen > 0) {
        const metaRaw = await redis.get(metaKey).catch((err: unknown) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'cache-strategies:redis:get-stream-meta',
            log: true,
          });
          return null;
        });

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
          } catch (parseErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(parseErr, {
              source: 'cache-strategies:redis:parse-stream-meta',
              log: true,
            });
          }
        }

        // Replay stream from Redis
        const { PassThrough } = await import('stream');
        const pass = new PassThrough();
        (async () => {
          try {
            const items = await redis.lRange(streamKey, 0, -1);
            for (const it of items.reverse()) {
              try {
                pass.write(Buffer.from(it, 'base64'));
              } catch (writeErr) {
                LoggedError.isTurtlesAllTheWayDownBaby(writeErr, {
                  source: 'cache-strategies:redis:stream-replay-write',
                  log: true,
                });
              }
            }
          } catch (rangeErr) {
            LoggedError.isTurtlesAllTheWayDownBaby(rangeErr, {
              source: 'cache-strategies:redis:stream-replay-range',
              log: true,
            });
          } finally {
            pass.end();
          }
        })();

        span.setAttribute('http.redis_stream_replay', true);
        span.setAttribute('http.status_code', meta?.statusCode ?? 200);
        return makeStreamResponse(nodeStreamToReadableStream(pass), {
          status: meta?.statusCode ?? 200,
          headers: meta?.headers ?? {},
        });
      }

      return undefined;
    } catch (redisErr) {
      span.setAttribute('http.redis_unavailable', true);
      LoggedError.isTurtlesAllTheWayDownBaby(redisErr, {
        source: 'cache-strategies:redis:cache-check',
        log: true,
      });
      return undefined;
    }
  }

  /**
   * Strategy 3: Try inflight request deduplication
   *
   * If another request to the same URL is already in progress,
   * return that promise instead of making a duplicate request.
   *
   * This prevents the "thundering herd" problem where many concurrent
   * requests for the same resource overwhelm the backend.
   *
   * @param cacheKey - Cache key for the request
   * @param span - OpenTelemetry span for instrumentation
   * @returns Promise<Response> if inflight hit, undefined if no inflight request
   */
  async tryInflightDedupe(
    cacheKey: string,
    span: SpanLike,
  ): Promise<CacheResult> {
    const inFlight = this.deps.inflightMap.get(cacheKey);
    if (inFlight) {
      span.setAttribute('http.inflight_dedupe', true);
      return inFlight.then((v) => makeResponse(v));
    }
    return undefined;
  }

  /**
   * Caches a buffered response to Redis (background operation)
   *
   * Stores response as base64-encoded JSON with TTL from config.
   * Warms memory cache for faster subsequent access.
   * Errors are logged but don't propagate.
   *
   * @param cacheKey - Cache key for this request
   * @param value - Cached response value
   */
  async cacheBufferedToRedis(
    cacheKey: string,
    value: CachedValue,
  ): Promise<void> {
    try {
      const redis = await this.deps.getRedisClient();
      const config = this.deps.fetchConfig();
      const payload = JSON.stringify({
        bodyB64: value.body.toString('base64'),
        headers: value.headers,
        statusCode: value.statusCode,
      });
      await redis.setEx(cacheKey, config.fetch_cache_ttl, payload);
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        source: 'cache-strategies:redis:buffer-cache',
        log: true,
      });
    }
  }

  /**
   * Caches a streaming response to Redis (background operation)
   *
   * Stores chunks as base64-encoded strings in a Redis list.
   * Stores metadata (headers, statusCode) separately.
   * Respects chunk and byte limits from config.
   * Errors are logged but don't propagate.
   *
   * @param cacheKey - Base cache key for this request
   * @param stream - Readable stream to cache
   * @param headers - Response headers
   * @param statusCode - HTTP status code
   * @param alreadyConsumedChunks - Optional chunks already buffered
   */
  async cacheStreamToRedis(
    cacheKey: string,
    stream: AsyncIterable<Buffer>,
    headers: Record<string, string>,
    statusCode: number,
    alreadyConsumedChunks: Buffer[] = [],
  ): Promise<void> {
    try {
      const redis = await this.deps.getRedisClient();
      const config = this.deps.fetchConfig();
      const streamKey = `${cacheKey}:stream`;
      const metaKey = `${cacheKey}:stream:meta`;
      const maxChunks = config.fetch_stream_max_chunks;
      const maxBytes = config.fetch_stream_max_total_bytes;

      let totalBytes = 0;
      let pushed = 0;

      // Clear any existing stream data
      await redis.del(streamKey).catch((err: unknown) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'cache-strategies:redis:stream-cache-del',
          log: true,
        });
      });

      // Store metadata
      await redis
        .set(
          metaKey,
          JSON.stringify({
            headers,
            statusCode,
          }),
        )
        .catch((err: unknown) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'cache-strategies:redis:stream-cache-set-meta',
            log: true,
          });
        });

      // Push already-consumed chunks first (if any)
      for (const chunk of alreadyConsumedChunks) {
        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        totalBytes += b.length;
        if (totalBytes > maxBytes || pushed >= maxChunks) break;
        await redis.rPush(streamKey, b.toString('base64'));
        pushed++;
      }

      // Push remaining chunks from stream
      for await (const chunk of stream) {
        if (totalBytes > maxBytes || pushed >= maxChunks) break;

        const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        totalBytes += b.length;
        if (totalBytes > maxBytes) break;

        try {
          await redis.rPush(streamKey, b.toString('base64'));
          pushed++;
        } catch (pushErr) {
          LoggedError.isTurtlesAllTheWayDownBaby(pushErr, {
            source: 'cache-strategies:redis:stream-cache-push',
            log: true,
          });
          break;
        }
      }

      // Set TTL on both keys
      await redis
        .expire(streamKey, config.fetch_cache_ttl)
        .catch((err: unknown) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'cache-strategies:redis:stream-cache-expire-stream',
            log: true,
          });
        });

      await redis
        .expire(metaKey, config.fetch_cache_ttl)
        .catch((err: unknown) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'cache-strategies:redis:stream-cache-expire-meta',
            log: true,
          });
        });
    } catch (streamCacheErr) {
      LoggedError.isTurtlesAllTheWayDownBaby(streamCacheErr, {
        source: 'cache-strategies:redis:stream-cache-background',
        log: true,
      });
    }
  }
}
