import { NextRequest } from 'next/server';
import { asNextRequest, isNextRequest } from '../../src/lib/nextjs/guards';

describe('asNextRequest', () => {
  describe('when input is already a NextRequest', () => {
    it('returns the same object reference', () => {
      const nextReq = new NextRequest('https://example.com/api/test');
      const result = asNextRequest(nextReq as unknown as Request);
      expect(result).toBe(nextReq);
    });

    it('returns the same object with POST method', () => {
      const nextReq = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });
      const result = asNextRequest(nextReq as unknown as Request);
      expect(result).toBe(nextReq);
    });

    it('preserves existing NextRequest properties without wrapping', () => {
      const nextReq = new NextRequest('https://example.com/path?foo=bar', {
        headers: { 'x-custom-header': 'test-value' },
      });
      const result = asNextRequest(nextReq as unknown as Request);
      expect(result).toBe(nextReq);
      expect(result.nextUrl.pathname).toBe('/path');
      expect(result.nextUrl.searchParams.get('foo')).toBe('bar');
    });
  });

  describe('when input is a plain Request', () => {
    it('returns a NextRequest instance', () => {
      const req = new Request('https://example.com/api/test');
      const result = asNextRequest(req);
      expect(result).toBeInstanceOf(NextRequest);
    });

    it('does not return the same object reference', () => {
      const req = new Request('https://example.com/api/test');
      const result = asNextRequest(req);
      expect(result).not.toBe(req);
    });

    it('preserves the URL', () => {
      const url = 'https://example.com/api/some-path';
      const req = new Request(url);
      const result = asNextRequest(req);
      expect(result.url).toBe(url);
    });

    it('preserves query string parameters', () => {
      const req = new Request('https://example.com/api/test?page=2&limit=10');
      const result = asNextRequest(req);
      expect(result.nextUrl.searchParams.get('page')).toBe('2');
      expect(result.nextUrl.searchParams.get('limit')).toBe('10');
    });

    it('preserves the pathname', () => {
      const req = new Request('https://example.com/api/users/123');
      const result = asNextRequest(req);
      expect(result.nextUrl.pathname).toBe('/api/users/123');
    });

    it('preserves GET method', () => {
      const req = new Request('https://example.com/api/test', { method: 'GET' });
      const result = asNextRequest(req);
      expect(result.method).toBe('GET');
    });

    it('preserves POST method', () => {
      const req = new Request('https://example.com/api/test', {
        method: 'POST',
        body: 'hello',
      });
      const result = asNextRequest(req);
      expect(result.method).toBe('POST');
    });

    it('preserves PUT method', () => {
      const req = new Request('https://example.com/api/test', {
        method: 'PUT',
        body: '{}',
      });
      const result = asNextRequest(req);
      expect(result.method).toBe('PUT');
    });

    it('preserves DELETE method', () => {
      const req = new Request('https://example.com/api/test', { method: 'DELETE' });
      const result = asNextRequest(req);
      expect(result.method).toBe('DELETE');
    });

    it('preserves PATCH method', () => {
      const req = new Request('https://example.com/api/test', {
        method: 'PATCH',
        body: '{}',
      });
      const result = asNextRequest(req);
      expect(result.method).toBe('PATCH');
    });

    it('preserves request headers', () => {
      const req = new Request('https://example.com/api/test', {
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'my-value',
          authorization: 'Bearer token123',
        },
      });
      const result = asNextRequest(req);
      expect(result.headers.get('content-type')).toBe('application/json');
      expect(result.headers.get('x-custom-header')).toBe('my-value');
      expect(result.headers.get('authorization')).toBe('Bearer token123');
    });

    it('result has nextUrl property', () => {
      const req = new Request('https://example.com/api/test');
      const result = asNextRequest(req);
      expect(result.nextUrl).toBeDefined();
      expect(typeof result.nextUrl).toBe('object');
    });

    it('result passes isNextRequest type guard', () => {
      const req = new Request('https://example.com/api/test');
      const result = asNextRequest(req);
      expect(isNextRequest(result)).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('calling asNextRequest on the result returns the same instance', () => {
      const req = new Request('https://example.com/api/test');
      const first = asNextRequest(req);
      const second = asNextRequest(first as unknown as Request);
      expect(second).toBe(first);
    });

    it('repeated calls on NextRequest always return the same reference', () => {
      const nextReq = new NextRequest('https://example.com/api/test');
      const first = asNextRequest(nextReq as unknown as Request);
      const second = asNextRequest(first as unknown as Request);
      expect(first).toBe(nextReq);
      expect(second).toBe(nextReq);
    });
  });

  describe('URL handling', () => {
    it('handles root path', () => {
      const req = new Request('https://example.com/');
      const result = asNextRequest(req);
      expect(result.nextUrl.pathname).toBe('/');
    });

    it('handles deeply nested paths', () => {
      const req = new Request('https://example.com/api/v2/users/456/posts/789');
      const result = asNextRequest(req);
      expect(result.nextUrl.pathname).toBe('/api/v2/users/456/posts/789');
    });

    it('preserves the hostname', () => {
      const req = new Request('https://api.example.org/endpoint');
      const result = asNextRequest(req);
      expect(result.nextUrl.hostname).toBe('api.example.org');
    });

    it('preserves the protocol', () => {
      const req = new Request('https://example.com/api/test');
      const result = asNextRequest(req);
      expect(result.nextUrl.protocol).toBe('https:');
    });
  });
});
