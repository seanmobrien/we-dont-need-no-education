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

export function makeResponse(v: {
  body: Buffer;
  headers: Record<string, string>;
  statusCode: number;
}): Response {
  const resp = new FetchResponse(v.body, {
    status: v.statusCode,
    headers: v.headers,
  });
  return resp as unknown as Response;
}

export default FetchResponse;

/**
 * Create a Response-like wrapper around a stream.Readable.
 * The returned object exposes .stream() to get the Readable, and minimal metadata.
 */
export function makeStreamResponse(
  stream: Readable,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
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
}
