import { log, safeSerialize } from '@/lib/logger';
import { isAbortError, LoggedError } from '@/lib/react-util';
import { isRunningOnServer } from '@/lib/site-util/env';
import type { Readable as ReadableType } from 'node:stream';

const toUint8 = (
  chunk: Uint8Array<ArrayBuffer> | string,
): Uint8Array<ArrayBuffer> =>
  typeof chunk === 'string'
    ? new TextEncoder().encode(chunk)
    : (new Uint8Array(chunk) as Uint8Array<ArrayBuffer>);

/**
 * Minimal WHATWG-like Response implementation for server-side use.
 * Extends the built-in Response so downstream code can treat it like a
 * standard response while we keep control over buffered/stream bodies.
 */
export class FetchResponse extends Response {
  private _buffer: Buffer;
  streamBody: ReadableStream<Uint8Array<ArrayBuffer>> | null = null;
  private _status: number;
  private _bodyUsed = false;

  constructor(
    body: Buffer | ReadableStream<Uint8Array<ArrayBuffer>> | null,
    init: { status?: number; headers?: Record<string, string> } = {},
  ) {
    // Initialize base Response with no body; we override accessors to use our
    // controlled buffer/stream.
    const headers = new Headers(init.headers);
    const requestedStatus = init.status ?? 200;
    // Response ctor enforces 200-599; keep caller's status separately so we can
    // represent non-standard codes like 199 without throwing.
    const safeStatus =
      requestedStatus >= 200 && requestedStatus <= 599 ? requestedStatus : 200;
    super(null, { status: safeStatus, headers });
    this._status = requestedStatus;

    if (body instanceof ReadableStream) {
      this.streamBody = body;
      this._buffer = Buffer.alloc(0);
    } else {
      this._buffer = body || Buffer.alloc(0);
    }
  }

  override get status(): number {
    return this._status;
  }

  override get bodyUsed(): boolean {
    return this._bodyUsed;
  }

  override get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null {
    if (this.streamBody) {
      return this.streamBody;
    }
    if (this._buffer && this._buffer.length > 0) {
      return new ReadableStream({
        start: (controller) => {
          controller.enqueue(new Uint8Array(this._buffer));
          controller.close();
        },
      });
    }
    return null;
  }

  override get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  private async consumeStream(maxSize = 10 * 1024 * 1024): Promise<Uint8Array> {
    if (this._bodyUsed) {
      throw new TypeError('Body is unusable');
    }
    this._bodyUsed = true;
    if (!this.streamBody) {
      return new Uint8Array(0);
    }
    const reader = this.streamBody.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalLength += value.length;
          if (totalLength > maxSize) {
            throw new Error(`Body exceeded ${maxSize} limit`);
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  async text(): Promise<string> {
    if (this.streamBody) {
      const result = await this.consumeStream();
      return new TextDecoder().decode(result);
    }
    return this._buffer.toString('utf8');
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (this.streamBody) {
      const result = await this.consumeStream();
      return result.buffer as ArrayBuffer;
    }
    const buf = this._buffer;
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  }

  async blob(): Promise<Blob> {
    const buffer = await this.arrayBuffer();
    return new Blob([buffer], {
      type: this.headers.get('Content-Type') || undefined,
    });
  }

  override clone(): Response {
    if (this.streamBody) {
      if (this._bodyUsed) {
        throw new TypeError('Cannot clone: body is already used');
      }
      const [stream1, stream2] = this.streamBody.tee();
      this.streamBody = stream1;
      return new FetchResponse(stream2, {
        status: this.status,
        headers: Object.fromEntries(this.headers.entries()),
      });
    }
    return new FetchResponse(Buffer.from(this._buffer), {
      status: this.status,
      headers: Object.fromEntries(this.headers.entries()),
    });
  }

  // Provide a Web API ReadableStream for callers that prefer streaming the buffered body
  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    if (this.streamBody) {
      if (this._bodyUsed) {
        throw new TypeError('Body is unusable');
      }
      this._bodyUsed = true;
      return this.streamBody;
    }
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(new Uint8Array(this._buffer));
        controller.close();
      },
    });
  }
}

export default FetchResponse;

/**
 * Convert a Node.js Readable stream to a Web API ReadableStream.
 * Useful for adapting Node.js streams to edge-compatible APIs.
 *
 * @param nodeStream - Node.js Readable stream to convert
 * @returns Web API ReadableStream
 *
 * @example
 * ```typescript
 * import { Readable } from 'stream';
 * const nodeStream = Readable.from(['chunk1', 'chunk2']);
 * const webStream = nodeStreamToReadableStream(nodeStream);
 * const response = makeStreamResponse(webStream);
 * ```
 */
export const nodeStreamToReadableStream = (
  nodeStream: NodeJS.ReadableStream,
): ReadableStream<Uint8Array<ArrayBuffer>> => {
  if (!nodeStream) {
    throw new TypeError('nodeStream is required');
  }
  let closed = false;
  let onData: ((chunk: Uint8Array<ArrayBuffer> | string) => void) | undefined;
  let onEnd: (() => void) | undefined;
  let onError: ((error: unknown) => void) | undefined;

  const remove = (event: string, handler?: (...args: unknown[]) => void) => {
    if (!handler) return;
    if (typeof nodeStream.off === 'function') {
      nodeStream.off(event, handler as (...args: unknown[]) => void);
    } else {
      nodeStream.removeListener(event, handler as (...args: unknown[]) => void);
    }
  };

  const cleanup = () => {
    remove('data', onData as (...args: unknown[]) => void);
    remove('end', onEnd);
    remove('error', onError);
    closed = true;
  };

  return new ReadableStream({
    start(controller) {
      onData = (chunk: Uint8Array<ArrayBuffer> | string) => {
        if (closed) return; // avoid enqueue after close/error/cancel
        controller.enqueue(toUint8(chunk));
      };

      onEnd = () => {
        if (closed) return;
        cleanup();
        controller.close();
      };

      onError = (error: unknown) => {
        if (closed) return;
        cleanup();
        controller.error(error);
      };

      nodeStream.on('data', onData);
      nodeStream.once('end', onEnd);
      nodeStream.once('error', onError);
    },
    cancel(reason?: unknown) {
      if (closed) return;
      cleanup();

      const destroy = (nodeStream as { destroy?: (error?: unknown) => void })
        .destroy;
      if (typeof destroy === 'function') {
        destroy.call(nodeStream, reason instanceof Error ? reason : undefined);
        return;
      }

      const returnFn = (nodeStream as { return?: () => void }).return;
      if (typeof returnFn === 'function') {
        returnFn.call(nodeStream);
        return;
      }

      const closeFn = (nodeStream as { close?: () => void }).close;
      if (typeof closeFn === 'function') {
        closeFn.call(nodeStream);
      }
    },
  });
};

const convertWebStreamOnNode = async (webStream: ReadableStream) => {
  let streamModule = await import('stream').then((mod) => mod.default);
  if (!streamModule?.Readable) {
    try {
      // Fallback for older Node versions
      streamModule = await import('node:stream').then((mod) => mod.default);
    } catch {
      // ignore error-in-error
    }
  }
  const { Readable } = streamModule;
  if (!Readable) {
    throw new SyntaxError(
      'Readable stream not available in the imported stream module',
    );
  }
  if (typeof Readable.fromWeb === 'function') {
    // @ts-expect-error - Readable.fromWeb is available in Node 18+
    return Readable.fromWeb(webStream);
  }
  const reader = webStream.getReader();
  let closed = false;
  const readable = new Readable({
    async read() {
      if (closed) return;
      try {
        const { done, value } = await reader.read();
        if (done) {
          closed = true;
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (e) {
        // NO-OP on abort errors, as they are expected
        if (!isAbortError(e)) {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            source: 'convertWebStreamFromNode.read',
            log: true,
            critical: false,
          });
        }
        this.destroy(e instanceof Error ? e : new Error(String(e)));
      }
    },
    emitClose: true,
    destroy(err, callback) {
      if (closed) {
        callback(err);
        return;
      }
      closed = true;
      reader.cancel(err).then(
        () => callback(err),
        (e) => callback(e),
      );
    },
  });
  const onClose = () => {
    if (closed) return;
    closed = false;
    readable?.off('close', onClose);
  };
  readable.on('close', onClose);
  return readable;
};

const convertWebStreamOnEdge = async (webStream: ReadableStream) => {
  const { ReadableWebToNodeStream } = await import(
    'readable-web-to-node-stream'
  );
  return new ReadableWebToNodeStream(webStream) as unknown as ReadableType;
};

/**
 * Convert a Web API ReadableStream (e.g. from fetch) to a Node.js Readable stream.
 *
 * @param webStream - The Web API ReadableStream to convert
 * @returns A Node.js Readable stream
 */
export const webStreamToReadable = (
  webStream: ReadableStream,
): Promise<ReadableType> => {
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
    return convertWebStreamOnNode(webStream);
  } else {
    return convertWebStreamOnEdge(webStream);
  }
};

export const makeResponse = (v: {
  body: Buffer;
  headers: Record<string, string>;
  statusCode: number;
}): Response => {
  const resp = new FetchResponse(v.body, {
    status: v.statusCode,
    headers: v.headers,
  });
  return resp;
};

/**
 * Create a JSON Response-like object similar to NextResponse.json().
 * Automatically sets Content-Type to application/json and serializes the body.
 *
 * @param data - The data to serialize as JSON
 * @param init - Optional ResponseInit with status, statusText, and headers
 * @returns A WHATWG-compliant Response object
 *
 * @example
 * ```typescript
 * // Simple JSON response
 * const response = makeJsonResponse({ message: 'Hello' });
 *
 * // With custom status and headers
 * const response = makeJsonResponse(
 *   { error: 'Not found' },
 *   { status: 404, headers: { 'X-Custom': 'value' } }
 * );
 * ```
 */
export const makeJsonResponse = (
  data: unknown,
  init?: ResponseInit,
): Response => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  const responseInit = {
    status: init?.status,
    headers,
  };

  try {
    if (isRunningOnServer()) {
      // In Node.js environment, use NextResponse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NextResponse } = require('next/server');
      return NextResponse.json(data, responseInit);
    }
  } catch (_error) {
    // fallback to fetchresponse below
    log((l) =>
      l.warn('cannot use NextResponse from the edge: ', safeSerialize(_error)),
    );
  }
  const jsonBody = JSON.stringify(data);
  const bodyBuffer = Buffer.from(jsonBody, 'utf8');
  const resp = new FetchResponse(bodyBuffer, responseInit);

  return resp;
};

/**
 * Create a Response-like wrapper around a Web API ReadableStream.
 * The returned object exposes .stream() to get the ReadableStream, and minimal metadata.
 */
export const makeStreamResponse = (
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response => {
  return new FetchResponse(stream, init);
};
