import { isRunningOnServer } from '@/lib/site-util/env';
import { Readable } from 'stream';

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

  // Provide a node Readable stream for callers that prefer streaming the buffered body
  stream(): Readable {
    const s = new Readable();
    s.push(this.body);
    s.push(null);
    return s;
  }
}

export default FetchResponse;

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
      const { NextResponse } = require('next/server');
      return NextResponse.json(data, responseInit);
    }
  } catch (error) {
    // fallback to fetchresponse below
  }
  const jsonBody = JSON.stringify(data);
  const bodyBuffer = Buffer.from(jsonBody, 'utf8');
  const resp = new FetchResponse(bodyBuffer, responseInit);

  return resp as unknown as Response;
};

/**
 * Create a Response-like wrapper around a stream.Readable.
 * The returned object exposes .stream() to get the Readable, and minimal metadata.
 */
export const makeStreamResponse = (
  stream: Readable,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response => {
  const headers = new Headers();
  for (const [k, v] of Object.entries(init.headers ?? {})) headers.append(k, v);
  const resp: {
    status: number;
    headers: Headers;
    stream: () => Readable;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } = {
    status: init.status ?? 200,
    headers,
    stream: () => stream,
    async text() {
      const chunks: Buffer[] = [];
      for await (const c of stream) {
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
      }
      return Buffer.concat(chunks).toString('utf8');
    },
    async json() {
      return JSON.parse(await this.text());
    },
    async arrayBuffer() {
      const chunks: Buffer[] = [];
      for await (const c of stream) {
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
      }
      const b = Buffer.concat(chunks);
      return b.buffer.slice(
        b.byteOffset,
        b.byteOffset + b.byteLength,
      ) as ArrayBuffer;
    },
  };
  return resp as unknown as Response;
};
