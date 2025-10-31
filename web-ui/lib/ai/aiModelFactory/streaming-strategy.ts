/**
 * @fileoverview Streaming response detection and handling
 *
 * This module provides logic for:
 * 1. Detecting streaming responses based on HTTP headers
 * 2. Handling pure streaming responses (direct passthrough)
 * 3. Background caching of streams to Redis
 *
 * Streaming responses are identified by:
 * - Transfer-Encoding: chunked
 * - Content-Type: text/event-stream or multipart/*
 * - Missing Content-Length with Transfer-Encoding present
 */

import { LoggedError } from '@/lib/react-util';
import { makeStreamResponse } from '@/lib/nextjs-util/server/response';
import type { StreamingStrategyDeps } from './fetch-types';
import type { EventEmitter } from 'events';
import type { Readable } from 'stream';

/** Type for EventEmitter event handlers */
type Handler = (...args: unknown[]) => void;

/**
 * Streaming response detection and handling strategy
 *
 * Handles two scenarios:
 * 1. Streaming detection: Analyzes headers to determine if response is a stream
 * 2. Pure streaming: Direct passthrough with background Redis caching
 */
export class StreamingStrategy {
  constructor(private deps: StreamingStrategyDeps) {}

  /**
   * Detects whether a response should be treated as streaming
   *
   * Checks for streaming indicators:
   * - Transfer-Encoding: chunked
   * - Content-Type: text/event-stream or multipart/*
   * - Missing Content-Length with Transfer-Encoding present
   *
   * @param headers - Response headers (normalized to lowercase keys)
   * @returns true if response should be treated as streaming
   */
  detectStreamingResponse(headers: Record<string, string>): boolean {
    const te = headers['transfer-encoding'];
    const ct = headers['content-type'] || '';

    if (te && te.toLowerCase().includes('chunked')) return true;
    if (ct.includes('text/event-stream') || ct.includes('multipart/'))
      return true;
    if (!('content-length' in headers) && te) return true;

    return false;
  }

  /**
   * Handles a pure streaming response (direct passthrough)
   *
   * Flow:
   * 1. If stream caching enabled: Start background Redis cache
   * 2. Attach semaphore release to stream end/error events
   * 3. Return streaming Response (no buffering)
   *
   * This is the fastest response path for streaming data (SSE, chunked, etc).
   *
   * @param cacheKey - Cache key for this request
   * @param stream - GOT stream (Readable + EventEmitter)
   * @param headers - Response headers (lowercase)
   * @param statusCode - HTTP status code
   * @param span - OpenTelemetry span for instrumentation
   * @returns Streaming Response
   */
  handlePureStreaming(
    cacheKey: string,
    stream: Readable,
    headers: Record<string, string>,
    statusCode: number,
    span: { setAttribute(key: string, value: unknown): void },
  ): Response {
    const config = this.deps.fetchConfig();

    // Background cache to Redis if enabled
    if (config.stream_enabled) {
      // Note: Readable implements AsyncIterable, so this cast is safe
      this.deps.cacheStreamToRedis(
        cacheKey,
        stream as unknown as AsyncIterable<Buffer>,
        headers,
        statusCode,
        [],
      );
    }

    // Release semaphore when stream ends or errors
    const releaseOnce = () => {
      try {
        this.deps.releaseSemaphore();
      } catch (semErr) {
        LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
          source: 'streaming-strategy:semaphore:release',
          log: true,
        });
      }
    };

    const ee = stream as unknown as EventEmitter;
    ee.on('end', releaseOnce as Handler);
    ee.on('error', releaseOnce as Handler);

    span.setAttribute('http.status_code', statusCode);
    return makeStreamResponse(stream, {
      status: statusCode,
      headers,
    });
  }
}
