import { log, safeSerialize } from '@/lib/logger';
import { isRunningOnServer } from '@/lib/site-util/env';

/**
 * Minimal WHATWG-like Response implementation for server-side use.
 * Provides text(), json(), arrayBuffer(), headers and status.
 */
export class FetchResponse {
  body: Buffer;
  status: number;
  headers: Headers;

  constructor(
    body: Buffer,
    init: { status?: number; headers?: Record<string, string> } = {},
  ) {
    this.body = body || Buffer.alloc(0);
    this.status = init.status ?? 200;
    this.headers = new Headers();
    for (const [k, v] of Object.entries(init.headers ?? {})) {
      this.headers.append(k, v);
    }
  }

  ok() {
    return this.status >= 200 && this.status < 300;
  }

  async text(): Promise<string> {
    return this.body.toString('utf8');
  }

  async json(): Promise<unknown> {
    return JSON.parse(this.body.toString('utf8'));
  }

  arrayBuffer(): ArrayBuffer {
    const buf = this.body;
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  }

  // Provide a Web API ReadableStream for callers that prefer streaming the buffered body
  stream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(new Uint8Array(this.body));
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
): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        const data =
          typeof chunk === 'string'
            ? new TextEncoder().encode(chunk)
            : new Uint8Array(chunk);
        controller.enqueue(data);
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },
  });
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
  return resp as unknown as Response;
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

  return resp as unknown as Response;
};

/**
 * Create a Response-like wrapper around a Web API ReadableStream.
 * The returned object exposes .stream() to get the ReadableStream, and minimal metadata.
 */
export const makeStreamResponse = (
  stream: ReadableStream<Uint8Array>,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response => {
  const headers = new Headers();
  for (const [k, v] of Object.entries(init.headers ?? {})) headers.append(k, v);
  const resp: {
    status: number;
    headers: Headers;
    stream: () => ReadableStream<Uint8Array>;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } = {
    status: init.status ?? 200,
    headers,
    stream: () => stream,
    async text() {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return new TextDecoder().decode(result);
    },
    async json() {
      return JSON.parse(await this.text());
    },
    async arrayBuffer() {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result.buffer;
    },
  };
  return resp as unknown as Response;
};
