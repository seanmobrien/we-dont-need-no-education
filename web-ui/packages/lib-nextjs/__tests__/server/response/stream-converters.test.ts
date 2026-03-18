/* @jest-environment node */

/**
 * Tests for stream conversion utilities in response/index.ts:
 * - nodeStreamToReadableStream: error path, cancel path, removeListener fallback
 * - webStreamToReadable: node and edge paths
 * - makeJsonResponse: server fallback when NextResponse is unavailable
 * - FetchResponse.stream(): throw after bodyUsed
 */

// Mock readable-web-to-node-stream (ESM-only module) before any imports
jest.mock('readable-web-to-node-stream', () => ({
  ReadableWebToNodeStream: jest.fn().mockImplementation((webStream: ReadableStream) => {
    const { PassThrough } = require('stream');
    const passthrough = new PassThrough();
    // Drain from web stream into passthrough
    const reader = webStream.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { passthrough.end(); break; }
          passthrough.write(Buffer.from(value));
        }
      } catch {
        passthrough.destroy();
      }
    };
    pump();
    return passthrough;
  }),
}));

import { PassThrough, Readable } from 'stream';
import {
  nodeStreamToReadableStream,
  webStreamToReadable,
  makeJsonResponse,
  FetchResponse,
} from '../../../src/server/response';
import { hideConsoleOutput } from '../../shared/test-utils-server';

describe('nodeStreamToReadableStream', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => mockConsole.setup());
  afterEach(() => mockConsole.dispose());

  it('throws when nodeStream is null', () => {
    expect(() => nodeStreamToReadableStream(null as any)).toThrow(TypeError);
    expect(() => nodeStreamToReadableStream(null as any)).toThrow('nodeStream is required');
  });

  it('throws when nodeStream is undefined', () => {
    expect(() => nodeStreamToReadableStream(undefined as any)).toThrow(TypeError);
  });

  it('converts a Node Readable to a Web ReadableStream', async () => {
    const node = Readable.from(['hello', ' world']);
    const web = nodeStreamToReadableStream(node);

    const reader = web.getReader();
    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }
    expect(chunks.join('')).toBe('hello world');
  });

  it('propagates stream errors to the ReadableStream controller', async () => {
    const stream = new PassThrough();
    const web = nodeStreamToReadableStream(stream);

    const error = new Error('stream blew up');
    setTimeout(() => stream.destroy(error), 10);

    const reader = web.getReader();
    await expect(reader.read()).rejects.toThrow('stream blew up');
  });

  it('handles stream ending cleanly', async () => {
    const stream = new PassThrough();
    const web = nodeStreamToReadableStream(stream);

    stream.write('data');
    stream.end();

    const reader = web.getReader();
    const { done: firstDone } = await reader.read(); // 'data'
    const { done } = await reader.read();            // end
    expect(done).toBe(true);
  });

  it('uses removeListener fallback when off() is not available', async () => {
    const stream = new PassThrough();
    // Shadow `off` with undefined on the instance to exercise the removeListener path
    // (delete doesn't work because off is on EventEmitter prototype)
    const streamWithoutOff = stream as any;
    Object.defineProperty(streamWithoutOff, 'off', { value: undefined, configurable: true, writable: true });

    const web = nodeStreamToReadableStream(streamWithoutOff);
    stream.write('test');
    stream.end();

    const reader = web.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    expect(new TextDecoder().decode(Buffer.concat(chunks as any))).toBe('test');
  });

  it('handles cancel by destroying the stream', async () => {
    const stream = new PassThrough();
    const destroySpy = jest.spyOn(stream, 'destroy');

    const web = nodeStreamToReadableStream(stream);
    const reader = web.getReader();
    // cancel without an error to avoid unhandled error propagation
    await reader.cancel();

    expect(destroySpy).toHaveBeenCalled();
  });

  it('handles cancel when no destroy method - uses return()', async () => {
    const stream = new PassThrough() as any;
    // Override destroy on the instance to undefined (bypasses prototype)
    Object.defineProperty(stream, 'destroy', { value: undefined, configurable: true });
    stream.return = jest.fn();

    const web = nodeStreamToReadableStream(stream);
    const reader = web.getReader();
    await reader.cancel();

    expect(stream.return).toHaveBeenCalled();
  });

  it('handles cancel when no destroy or return - uses close()', async () => {
    const stream = new PassThrough() as any;
    Object.defineProperty(stream, 'destroy', { value: undefined, configurable: true });
    stream.close = jest.fn();

    const web = nodeStreamToReadableStream(stream);
    const reader = web.getReader();
    await reader.cancel();

    expect(stream.close).toHaveBeenCalled();
  });
});

describe('webStreamToReadable', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => mockConsole.setup());
  afterEach(() => mockConsole.dispose());

  it('converts a Web ReadableStream to a Node Readable (edge path)', async () => {
    // In test env, NEXT_RUNTIME is not 'nodejs', so edge path runs
    const originalRuntime = process.env['NEXT_RUNTIME'];
    delete process.env['NEXT_RUNTIME'];

    try {
      const webStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('hello'));
          controller.close();
        },
      });

      const readable = await webStreamToReadable(webStream);
      expect(readable).toBeDefined();
    } finally {
      if (originalRuntime !== undefined) {
        process.env['NEXT_RUNTIME'] = originalRuntime;
      }
    }
  });

  it('converts a Web ReadableStream to a Node Readable (node path)', async () => {
    const originalRuntime = process.env['NEXT_RUNTIME'];
    process.env['NEXT_RUNTIME'] = 'nodejs';

    try {
      const webStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('node-hello'));
          controller.close();
        },
      });

      const readable = await webStreamToReadable(webStream);
      expect(readable).toBeDefined();

      // Consume the readable to verify data
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        readable.on('data', (chunk: Buffer) => chunks.push(chunk));
        readable.on('end', () => resolve());
        readable.on('error', reject);
      });
      expect(Buffer.concat(chunks).toString()).toBe('node-hello');
    } finally {
      if (originalRuntime !== undefined) {
        process.env['NEXT_RUNTIME'] = originalRuntime;
      } else {
        delete process.env['NEXT_RUNTIME'];
      }
    }
  });

  it('falls back to manual Readable when Readable.fromWeb is unavailable', async () => {
    const { Readable } = require('stream');
    const originalFromWeb = Readable.fromWeb;
    delete Readable.fromWeb;
    const originalRuntime = process.env['NEXT_RUNTIME'];
    process.env['NEXT_RUNTIME'] = 'nodejs';

    try {
      const webStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('manual-fallback'));
          controller.close();
        },
      });

      const readable = await webStreamToReadable(webStream);
      expect(readable).toBeDefined();

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        readable.on('data', (chunk: Buffer) => chunks.push(chunk));
        readable.on('end', resolve);
        readable.on('error', reject);
      });
      expect(Buffer.concat(chunks).toString()).toBe('manual-fallback');
    } finally {
      Readable.fromWeb = originalFromWeb;
      if (originalRuntime !== undefined) {
        process.env['NEXT_RUNTIME'] = originalRuntime;
      } else {
        delete process.env['NEXT_RUNTIME'];
      }
    }
  });
});

describe('makeJsonResponse fallback path', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => mockConsole.setup());
  afterEach(() => mockConsole.dispose());

  it('falls back to FetchResponse when NextResponse.json throws', async () => {
    jest.doMock('@compliance-theater/env', () => {
      const actual = jest.requireActual('@compliance-theater/env');
      return { ...actual, isRunningOnServer: jest.fn().mockReturnValue(true) };
    });
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: jest.fn().mockImplementation(() => { throw new Error('not available'); }),
      },
    }));

    // Re-import after mocking
    const { makeJsonResponse: mocked } = await import('../../../src/server/response/index');
    const response = mocked({ foo: 'bar' }, { status: 201 });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ foo: 'bar' });

    jest.dontMock('@compliance-theater/env');
    jest.dontMock('next/server');
  });
});

describe('FetchResponse edge cases', () => {
  it('stream() throws when bodyUsed=true on streaming body', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data'));
        c.close();
      },
    });
    const response = new FetchResponse(stream);

    // Consume the stream to mark bodyUsed=true
    response.stream(); // first call marks bodyUsed

    expect(() => response.stream()).toThrow(TypeError);
    expect(() => response.stream()).toThrow('Body is unusable');
  });
});
