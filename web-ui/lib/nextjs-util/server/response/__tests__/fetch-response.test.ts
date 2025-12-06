import { FetchResponse } from '../index';
import { Readable } from 'stream';

// Polyfill Headers/Response/ReadableStream if needed for Jest environment
if (!global.Headers) {
  (global as any).Headers = require('node-fetch').Headers;
}
if (!global.ReadableStream) {
  (global as any).ReadableStream = require('stream/web').ReadableStream;
}
if (!global.TextEncoder) {
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

describe('FetchResponse', () => {
  describe('Constructor', () => {
    it('should accept a Buffer body', async () => {
      const buffer = Buffer.from('Hello World');
      const response = new FetchResponse(buffer);
      expect(await response.text()).toBe('Hello World');
    });

    it('should accept a ReadableStream body', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Stream Data'));
          controller.close();
        },
      });
      const response = new FetchResponse(stream);
      expect(await response.text()).toBe('Stream Data');
    });

    it('should handle null body', async () => {
      const response = new FetchResponse(null);
      expect(await response.text()).toBe('');
    });
  });

  describe('Body Property', () => {
    it('should expose body as ReadableStream when initialized with Buffer', () => {
      const response = new FetchResponse(Buffer.from('test'));
      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it('should expose body as ReadableStream when initialized with Stream', () => {
      const stream = new ReadableStream({ start(c) { c.close(); } });
      const response = new FetchResponse(stream);
      expect(response.body).toBe(stream);
    });

    it('should have pipeThrough method on body', () => {
      const response = new FetchResponse(Buffer.from('test'));
      expect(typeof response.body?.pipeThrough).toBe('function');
    });
  });

  describe('Methods', () => {
    it('should return text()', async () => {
      const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
      expect(await response.text()).toBe('{"foo":"bar"}');
    });

    it('should return json()', async () => {
      const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
      expect(await response.json()).toEqual({ foo: 'bar' });
    });

    it('should return arrayBuffer()', async () => {
      const response = new FetchResponse(Buffer.from('test'));
      const ab = await response.arrayBuffer();
      expect(ab.byteLength).toBe(4);
      expect(new TextDecoder().decode(ab)).toBe('test');
    });

    it('should clone() buffered response', async () => {
      const response = new FetchResponse(Buffer.from('test'));
      const clone = response.clone();
      expect(await response.text()).toBe('test');
      expect(await clone.text()).toBe('test');
    });

    it('should clone() streamed response', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Stream Data'));
          controller.close();
        },
      });
      const response = new FetchResponse(stream);
      const clone = response.clone();
      expect(await response.text()).toBe('Stream Data');
      expect(await clone.text()).toBe('Stream Data');
    });
  });
});
