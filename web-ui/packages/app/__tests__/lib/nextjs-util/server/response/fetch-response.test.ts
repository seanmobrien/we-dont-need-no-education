/* @jest-environment node */

import { FetchResponse } from '@compliance-theater/nextjs/server/response/index';

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
  describe('Constructor', () => {});

  describe('Methods', () => {
    it('should return text()', async () => {
      const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
      expect(await response.text()).toBe('{"foo":"bar"}');
    });

    it('should return json()', async () => {
      const response = new FetchResponse(Buffer.from('{"foo":"bar"}'));
      expect(await response.json()).toEqual({ foo: 'bar' });
    });
  });
});
