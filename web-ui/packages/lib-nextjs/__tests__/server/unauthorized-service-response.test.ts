/* @jest-environment node */

/**
 * Unit tests for unauthorizedServiceResponse
 */

import { hideConsoleOutput } from '../shared/test-utils-server';

// SessionTokenKey depends on env('NEXT_PUBLIC_HOSTNAME') which is set in jest.env-vars.ts
// NEXT_PUBLIC_HOSTNAME = 'http://test-run.localhost' (http → no __Secure- prefix)
// So the session token key will be: 'authjs.session-token'

// Mock next/server since it's not available in test environment
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      const status = init?.status ?? 200;
      const headers = new Headers(init?.headers ?? {});
      return {
        status,
        headers,
        _data: data,
        json: () => Promise.resolve(data),
      };
    }),
  },
}));

import { unauthorizedServiceResponse } from '../../src/server/unauthorized-service-response';

const SESSION_TOKEN_KEY = 'authjs.session-token'; // http env → no __Secure- prefix

const makeRequest = (cookieValue?: string) => ({
  cookies: {
    get: jest.fn((key: string) =>
      key === SESSION_TOKEN_KEY && cookieValue ? { value: cookieValue } : undefined,
    ),
  },
  nextUrl: new URL('http://test-run.localhost/api/resource'),
});

describe('unauthorizedServiceResponse', () => {
  const mockConsole = hideConsoleOutput();

  beforeEach(() => {
    mockConsole.setup();
  });

  afterEach(() => {
    mockConsole.dispose();
  });

  describe('when no request provided', () => {
    it('returns 401 when called with no arguments', () => {
      const response = unauthorizedServiceResponse();
      expect(response.status).toBe(401);
    });

    it('sets WWW-Authenticate header', () => {
      const response = unauthorizedServiceResponse();
      const wwwAuth = response.headers.get('WWW-Authenticate');
      expect(wwwAuth).toContain('Bearer resource_metadata=');
    });

    it('returns JSON error body', async () => {
      const response = unauthorizedServiceResponse() as any;
      const body = await response.json();
      expect(body).toMatchObject({ error: 'Unauthorized' });
    });
  });

  describe('authentication status', () => {
    it('returns 401 when no session cookie present', () => {
      const req = makeRequest(undefined);
      const response = unauthorizedServiceResponse({ req: req as any });
      expect(response.status).toBe(401);
    });

    it('returns 401 when cookie value is empty string', () => {
      const req = makeRequest('');
      const response = unauthorizedServiceResponse({ req: req as any });
      expect(response.status).toBe(401);
    });

    it('returns 403 when session cookie is present (authenticated but unauthorized)', () => {
      const req = makeRequest('valid-session-token');
      const response = unauthorizedServiceResponse({ req: req as any });
      expect(response.status).toBe(403);
    });
  });

  describe('WWW-Authenticate header', () => {
    it('includes resource_metadata path from request URL', () => {
      const req = makeRequest();
      const response = unauthorizedServiceResponse({ req: req as any });
      const wwwAuth = response.headers.get('WWW-Authenticate');
      expect(wwwAuth).toContain('/.well-known/oauth-protected-resource/api/resource');
    });

    it('includes scopes when provided', () => {
      const req = makeRequest();
      const response = unauthorizedServiceResponse({
        req: req as any,
        scopes: ['read:data', 'write:data'],
      });
      const wwwAuth = response.headers.get('WWW-Authenticate');
      expect(wwwAuth).toContain('scope="read:data write:data"');
    });

    it('does not include scope when empty array', () => {
      const req = makeRequest();
      const response = unauthorizedServiceResponse({ req: req as any, scopes: [] });
      const wwwAuth = response.headers.get('WWW-Authenticate');
      expect(wwwAuth).not.toContain('scope=');
    });

    it('does not include scope when no scopes provided', () => {
      const req = makeRequest();
      const response = unauthorizedServiceResponse({ req: req as any });
      const wwwAuth = response.headers.get('WWW-Authenticate');
      expect(wwwAuth).not.toContain('scope=');
    });
  });

  describe('cookie extraction', () => {
    it('handles request with cookies as plain object (dict-style)', () => {
      const req = {
        cookies: { [SESSION_TOKEN_KEY]: 'token-value' },
        nextUrl: new URL('http://test-run.localhost/api/test'),
      };
      const response = unauthorizedServiceResponse({ req: req as any });
      // Has cookie value → authenticated → 403
      expect(response.status).toBe(403);
    });

    it('handles request with no cookies object', () => {
      const req = {
        cookies: undefined,
        nextUrl: new URL('http://test-run.localhost/'),
      };
      const response = unauthorizedServiceResponse({ req: req as any });
      expect(response.status).toBe(401);
    });

    it('handles request with cookies.get returning undefined', () => {
      const req = {
        cookies: {
          get: jest.fn(() => undefined),
        },
        nextUrl: new URL('http://test-run.localhost/'),
      };
      const response = unauthorizedServiceResponse({ req: req as any });
      expect(response.status).toBe(401);
    });
  });
});
