/**
 * @fileoverview Buffering response strategy with dynamic streaming switch
 *
 * This module handles buffered HTTP responses with intelligent streaming fallback:
 * 1. Start buffering response chunks
 * 2. Monitor buffer size against configured limits
 * 3. If response fits in buffer: Return complete buffered response with caching
 * 4. If response exceeds limits: Switch to streaming mode mid-response
 *
 * Key Features:
 * - Early buffer detection (e.g., 1KB sample before deciding)
 * - Size limit enforcement to prevent memory exhaustion
 * - Dynamic stream switching for large responses
 * - Memory and Redis caching for complete buffered responses
 */

import { LoggedError, log } from '@compliance-theater/logger';
import {
  makeResponse,
  makeStreamResponse,
  nodeStreamToReadableStream,
} from './../response';
import type { BufferingStrategyDeps, CachedValue } from './fetch-types';
import type { EventEmitter } from 'events';
import type { Readable } from 'stream';

/** Type for EventEmitter event handlers */
type Handler = (...args: unknown[]) => void;

/**
 * Result from buffering strategy
 * - 'buffered': Response fit in buffer, returned as complete response
 * - 'streaming': Response switched to streaming mode
 */
export interface BufferedResult {
  response: Response;
  mode: 'buffered' | 'streaming';
}

/**
 * Buffered response handling with dynamic streaming switch
 *
 * Implements intelligent buffering with these stages:
 * 1. Initial buffer phase (e.g., first 1KB)
 * 2. Decision point: Continue buffering or switch to streaming
 * 3a. If fits: Complete buffering, cache, return buffered response
 * 3b. If exceeds: Switch to streaming, pipe remaining data
 *
 * This strategy prevents memory exhaustion from large responses while
 * still benefiting from caching for small/medium responses.
 */
export class BufferingStrategy {
  constructor(private deps: BufferingStrategyDeps) {}

  /**
   * Handles a buffered response with dynamic streaming switch
   *
   * Flow:
   * 1. Buffer chunks up to streamDetectBuffer size (e.g., 1KB sample)
   * 2. Enforce maxResponseSize limit
   * 3. If complete response buffered: Cache and return
   * 4. If exceeds streamBufferMax: Switch to streaming mode
   * 5. Wait for remaining data and return appropriately
   *
   * @param cacheKey - Cache key for this request
   * @param stream - GOT stream (Readable)
   * @param headers - Response headers (lowercase)
   * @param statusCode - HTTP status code
   * @param url - Request URL (for logging)
   * @param span - OpenTelemetry span for instrumentation
   * @returns Buffered or streaming Response
   */
  async handleBufferedResponse(
    cacheKey: string,
    stream: Readable,
    headers: Record<string, string>,
    statusCode: number,
    url: string,
    span: { setAttribute(key: string, value: unknown): void },
    shouldReleaseSemaphore = true
  ): Promise<BufferedResult> {
    const chunks: Buffer[] = [];
    let bufferedBytes = 0;
    let ended = false;
    let errored: Error | undefined = undefined;
    let sizeExceeded = false;

    const onData = (chunk: Buffer) => {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));

      // Enforce max response size limit
      if (bufferedBytes + b.length > this.deps.config.maxResponseSize) {
        if (!sizeExceeded) {
          sizeExceeded = true;
          log((l) =>
            l.warn(
              `[buffering-strategy] Response size exceeded limit (${this.deps.config.maxResponseSize} bytes), switching to streaming: ${url}`
            )
          );
        }
        // Stop buffering, will switch to streaming
        return;
      }

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
      const ee = stream as unknown as EventEmitter;
      ee.removeListener('data', onData as Handler);
      ee.removeListener('end', onEnd as Handler);
      ee.removeListener('error', onError as Handler);
    };

    // Attach listeners
    const ee2 = stream as unknown as EventEmitter;
    ee2.on('data', onData as Handler);
    ee2.on('end', onEnd as Handler);
    ee2.on('error', onError as Handler);

    // Wait for initial buffer sample or completion
    await new Promise<void>((resolve) => {
      const check = () => {
        if (ended || errored) return resolve();
        if (bufferedBytes >= this.deps.config.streamDetectBuffer)
          return resolve();
        if (sizeExceeded) return resolve(); // Size limit exceeded, switch to streaming
      };
      check();
      const i = setInterval(() => {
        if (
          ended ||
          errored ||
          sizeExceeded ||
          bufferedBytes >= this.deps.config.streamDetectBuffer
        ) {
          clearInterval(i);
          resolve();
        }
      }, 10);
    });

    if (errored) throw errored;

    // Case 1: Response completed and fits in buffer
    if (ended && !sizeExceeded) {
      const body = Buffer.concat(chunks);
      const value: CachedValue = {
        body,
        headers,
        statusCode,
      };

      // Warm memory cache
      this.deps.cache.set(cacheKey, Promise.resolve(value));

      // Background cache to Redis
      this.cacheBufferedToRedis(cacheKey, value);

      // Release semaphore
      if (shouldReleaseSemaphore) this.releaseSemaphore('buffered');

      span.setAttribute('http.status_code', statusCode);
      return {
        response: makeResponse(value),
        mode: 'buffered',
      };
    }

    // Case 2: Switch to streaming (exceeded streamBufferMax or size limit)
    if (bufferedBytes > this.deps.config.streamBufferMax || sizeExceeded) {
      span.setAttribute('http.size_limit_exceeded', sizeExceeded);
      span.setAttribute('http.buffered_bytes', bufferedBytes);

      // Create passthrough stream with already-buffered chunks
      const { PassThrough } = await import('stream');
      const pass = new PassThrough();
      for (const c of chunks) pass.write(c);
      stream.pipe(pass);

      const config = this.deps.fetchConfig();
      if (config.stream_enabled) {
        // Background cache to Redis, including already-buffered chunks
        this.deps.cacheStreamToRedis(
          cacheKey,
          stream as unknown as AsyncIterable<Buffer>,
          headers,
          statusCode,
          chunks
        );
      }

      // Release semaphore when stream completes
      if (shouldReleaseSemaphore) {
        const releaseOnce = () => {
          this.releaseSemaphore('large-buffer');
        };

        const ee3 = pass as unknown as EventEmitter;
        ee3.on('end', releaseOnce);
        ee3.on('error', releaseOnce);
      }

      span.setAttribute('http.status_code', statusCode);
      return {
        response: makeStreamResponse(nodeStreamToReadableStream(pass), {
          status: statusCode,
          headers,
        }),
        mode: 'streaming',
      };
    }

    // Case 3: Still buffering, wait for completion
    await new Promise<void>((resolve, reject) => {
      if (ended) return resolve();
      if (errored) return reject(errored);

      const onEnd2 = () => {
        cleanupEvents2();
        resolve();
      };
      const onErr2 = (e: Error) => {
        cleanupEvents2();
        reject(e);
      };
      const cleanupEvents2 = () => {
        const ee3 = stream as unknown as EventEmitter;
        ee3.removeListener('end', onEnd2 as Handler);
        ee3.removeListener('error', onErr2 as Handler);
      };

      const ee3 = stream as unknown as EventEmitter;
      ee3.once('end', onEnd2 as Handler);
      ee3.once('error', onErr2 as Handler);
    });

    if (errored) throw errored;

    // Final buffered response
    const body = Buffer.concat(chunks);
    const value: CachedValue = {
      body,
      headers,
      statusCode,
    };

    // Warm memory cache
    this.deps.cache.set(cacheKey, Promise.resolve(value));

    // Background cache to Redis
    this.cacheBufferedToRedis(cacheKey, value);

    // Release semaphore
    if (shouldReleaseSemaphore) this.releaseSemaphore('final');

    span.setAttribute('http.status_code', statusCode);
    return {
      response: makeResponse(value),
      mode: 'buffered',
    };
  }

  /**
   * Helper to safely release semaphore with error handling
   *
   * @param context - Context string for error logging
   */
  private releaseSemaphore(context: string): void {
    try {
      this.deps.releaseSemaphore();
    } catch (semErr) {
      LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
        source: `buffering-strategy:semaphore:release-${context}`,
        log: true,
      });
    }
  }

  /**
   * Helper to cache buffered value to Redis in background
   *
   * @param cacheKey - Cache key
   * @param value - Cached response value
   */
  private async cacheBufferedToRedis(
    cacheKey: string,
    value: CachedValue
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
    } catch (redisCacheErr) {
      LoggedError.isTurtlesAllTheWayDownBaby(redisCacheErr, {
        source: 'buffering-strategy:redis:buffer-cache',
        log: true,
      });
    }
  }
}
