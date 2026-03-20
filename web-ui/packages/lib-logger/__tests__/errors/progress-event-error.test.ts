/** @jest-environment jsdom */

import { ProgressEventError } from '../../src/errors/progress-event-error';

// Helper: create a duck-typed XHR object satisfying isXmlHttpRequest
const makeXhr = () => ({
  readyState: 4,
  status: 200,
  timeout: 0,
  upload: {},
  response: null,
  open: jest.fn(),
  send: jest.fn(),
});

// Helper: create a duck-typed progress event
const makeProgressEvent = (target = makeXhr()) => ({
  target,
  loaded: 100,
  total: 200,
  lengthComputable: true,
});

describe('ProgressEventError', () => {
  describe('constructor', () => {
    it('creates successfully with a valid progress event', () => {
      const event = makeProgressEvent();
      const err = new ProgressEventError(event as never);
      expect(err).toBeDefined();
    });

    it('sets name to ProgressEventError', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      expect(err.name).toBe('ProgressEventError');
    });

    it('sets message to the standard progress event error message', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      expect(err.message).toBe('An API request progress event error has occurred.');
    });

    it('sets lengthComputable from the event', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      expect(err.lengthComputable).toBe(true);
    });

    it('sets loaded from the event', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      expect(err.loaded).toBe(100);
    });

    it('sets total from the event', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      expect(err.total).toBe(200);
    });

    it('sets cause.source to the target', () => {
      const xhr = makeXhr();
      const event = makeProgressEvent(xhr);
      const err = new ProgressEventError(event as never);
      expect(err.cause.source).toBe(xhr);
    });

    it('throws TypeError for null input', () => {
      expect(() => new ProgressEventError(null as never)).toThrow(TypeError);
    });

    it('throws TypeError for plain empty object', () => {
      expect(() => new ProgressEventError({} as never)).toThrow(TypeError);
    });

    it('throws TypeError for object without XHR target', () => {
      const badEvent = { target: {}, loaded: 0, total: 100, lengthComputable: false };
      expect(() => new ProgressEventError(badEvent as never)).toThrow(TypeError);
    });
  });

  describe('source getter', () => {
    it('returns the original event', () => {
      const event = makeProgressEvent();
      const err = new ProgressEventError(event as never);
      expect(err.source).toBe(event);
    });
  });

  describe('headers getter', () => {
    it('returns undefined when target is not a real XMLHttpRequest', () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      // makeXhr() is a duck-typed object, not instanceof XMLHttpRequest
      expect(err.headers).toBeUndefined();
    });

    it('returns parsed headers when target is a real XMLHttpRequest with _ajaxData', () => {
      const xhr = new XMLHttpRequest();
      // Attach _ajaxData with xh header array
      (xhr as unknown as Record<string, unknown>)['_ajaxData'] = {
        xh: [
          { n: 'Content-Type', v: 'application/json' },
          { n: 'Authorization', v: 'Bearer token' },
        ],
      };
      const event = {
        target: xhr,
        loaded: 50,
        total: 100,
        lengthComputable: true,
      };
      const err = new ProgressEventError(event as never);
      const headers = err.headers;
      expect(headers).toBeDefined();
      expect(headers?.['Content-Type']).toBe('application/json');
      expect(headers?.['Authorization']).toBe('Bearer token');
    });

    it('caches headers on second call (returns same reference)', () => {
      const xhr = new XMLHttpRequest();
      (xhr as unknown as Record<string, unknown>)['_ajaxData'] = {
        xh: [{ n: 'X-Header', v: 'value' }],
      };
      const event = { target: xhr, loaded: 0, total: 0, lengthComputable: false };
      const err = new ProgressEventError(event as never);
      const first = err.headers;
      const second = err.headers;
      expect(first).toBe(second);
    });

    it('returns undefined when XHR has no _ajaxData', () => {
      const xhr = new XMLHttpRequest();
      const event = { target: xhr, loaded: 0, total: 0, lengthComputable: false };
      const err = new ProgressEventError(event as never);
      expect(err.headers).toBeUndefined();
    });
  });

  describe('enrichContext', () => {
    it('adds timestamp when not already present', async () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      const result = await err.enrichContext({});
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('preserves existing timestamp', async () => {
      const ts = new Date('2024-01-01');
      const err = new ProgressEventError(makeProgressEvent() as never);
      const result = await err.enrichContext({ timestamp: ts });
      expect(result.timestamp).toBe(ts);
    });

    it('adds url from responseURL when target has it', async () => {
      const xhr = makeXhr();
      const xhrWithUrl = Object.assign(xhr, { responseURL: 'https://api.example.com/data' });
      const event = makeProgressEvent(xhrWithUrl);
      const err = new ProgressEventError(event as never);
      const result = await err.enrichContext({});
      expect(result.url).toBe('https://api.example.com/data');
    });

    it('does not override existing url', async () => {
      const xhr = makeXhr();
      const xhrWithUrl = Object.assign(xhr, { responseURL: 'https://new-url.com' });
      const event = makeProgressEvent(xhrWithUrl);
      const err = new ProgressEventError(event as never);
      const result = await err.enrichContext({ url: 'https://existing-url.com' });
      expect(result.url).toBe('https://existing-url.com');
    });

    it('adds xhrHeaders when headers are present', async () => {
      const xhr = new XMLHttpRequest();
      (xhr as unknown as Record<string, unknown>)['_ajaxData'] = {
        xh: [{ n: 'X-Custom', v: 'header-value' }],
      };
      const event = { target: xhr, loaded: 0, total: 0, lengthComputable: false };
      const err = new ProgressEventError(event as never);
      const result = await err.enrichContext({});
      expect(result.additionalData?.['xhrHeaders']).toBeDefined();
      expect((result.additionalData?.['xhrHeaders'] as Record<string, string>)?.['X-Custom']).toBe('header-value');
    });

    it('handles missing responseURL gracefully', async () => {
      const err = new ProgressEventError(makeProgressEvent() as never);
      // duck-typed XHR has no responseURL
      const result = await err.enrichContext({});
      expect(result.url).toBeUndefined();
    });
  });
});
