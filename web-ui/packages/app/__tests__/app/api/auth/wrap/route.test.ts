/* @jest-environment node */

jest.mock('@compliance-theater/auth/lib/utilities', () => ({
  __esModule: true,
  extractTokenDetails: jest.fn(),
  SessionTokenKey: jest.fn(() => 'authjs.session-token'),
}));

jest.mock('@compliance-theater/auth-compat/runtime', () => ({
  __esModule: true,
  encodeJwt: jest.fn(),
  getToken: jest.fn(),
}));

jest.mock('@compliance-theater/env', () => ({
  __esModule: true,
  env: (key: string) => {
    if (key === 'AUTH_SECRET') return 'test-auth-secret';
    if (key === 'NEXT_PUBLIC_HOSTNAME') return 'http://localhost:3000';
    return process.env[key];
  },
}));

import { encodeJwt, getToken } from '@compliance-theater/auth-compat/runtime';
import { extractTokenDetails } from '@compliance-theater/auth/lib/utilities';
import { getAccessToken } from '@compliance-theater/auth/lib/access-token';
import { NextRequest } from 'next/server';

import { POST } from '../../../../../app/api/auth/wrap/route';

describe('POST /api/auth/wrap', () => {
  beforeEach(() => {
    (extractTokenDetails as jest.Mock).mockClear();
    (encodeJwt as jest.Mock).mockClear();
    (getToken as jest.Mock).mockClear();
    process.env.AUTH_SECRET = 'test-auth-secret';
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it('sets the wrapped session cookie and returns the wrapped token in JSON', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 600;
    (extractTokenDetails as jest.Mock).mockResolvedValue({
      source: 'verified-bearer',
      verifiedBearerToken: 'verified-keycloak-token',
      bearerToken: 'verified-keycloak-token',
      token: {
        sub: 'keycloak-subject',
        email: 'user@example.com',
        account_id: 12,
        resource_access: {
          account: ['manage-account'],
        },
        exp: futureExp,
      },
    });
    (encodeJwt as jest.Mock).mockResolvedValue('wrapped-authjs-token');

    const request = new NextRequest('http://localhost/api/auth/wrap', {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-keycloak-token',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(encodeJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'test-auth-secret',
        salt: 'authjs.session-token',
        token: expect.objectContaining({
          sub: 'keycloak-subject',
          subject: 'keycloak-subject',
          email: 'user@example.com',
          account_id: 12,
          user_id: 12,
          ct_token_wrapper: 'keycloak-access-token',
          access_token: 'verified-keycloak-token',
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: true,
        token: 'wrapped-authjs-token',
        cookieName: 'authjs.session-token',
        session: expect.objectContaining({
          cookieName: 'authjs.session-token',
          cookieNames: expect.arrayContaining([
            'authjs.session-token',
            '__Secure-authjs.session-token',
          ]),
          expiresAt: expect.any(String),
        }),
      }),
    );
    expect(response.headers.get('set-cookie')).toContain(
      'authjs.session-token=wrapped-authjs-token',
    );
  });

  it('supports bearer-token resolution from the wrapped session cookie without Authorization header', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 600;
    (extractTokenDetails as jest.Mock).mockResolvedValue({
      source: 'verified-bearer',
      verifiedBearerToken: 'verified-keycloak-token',
      bearerToken: 'verified-keycloak-token',
      token: {
        sub: 'keycloak-subject',
        email: 'user@example.com',
        account_id: 12,
        exp: futureExp,
      },
    });
    (encodeJwt as jest.Mock).mockResolvedValue('wrapped-authjs-token');
    (getToken as jest.Mock)
      .mockResolvedValueOnce({
        sub: 'keycloak-subject',
        access_token: 'verified-keycloak-token',
        exp: futureExp,
      })
      .mockResolvedValueOnce(null);

    const wrapRequest = new NextRequest('http://localhost/api/auth/wrap', {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-keycloak-token',
      },
    });
    const wrapResponse = await POST(wrapRequest);
    const cookieHeader = wrapResponse.headers.get('set-cookie');
    expect(cookieHeader).toContain('authjs.session-token=wrapped-authjs-token');

    const downstreamRequest = new NextRequest('http://localhost/api/ai/tools/sse', {
      headers: {
        cookie: cookieHeader ?? '',
      },
    });

    await expect(getAccessToken(downstreamRequest as never)).resolves.toBe(
      'verified-keycloak-token',
    );
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({
        req: downstreamRequest,
      }),
    );
  });

  it('rejects requests without a verified external bearer token', async () => {
    (extractTokenDetails as jest.Mock).mockResolvedValue({
      source: 'authjs',
      bearerToken: 'app-issued-token',
      token: { sub: 'authjs-user' },
    });

    const request = new NextRequest('http://localhost/api/auth/wrap', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'A verified external Keycloak bearer token is required.',
    });
    expect(encodeJwt).not.toHaveBeenCalled();
  });
});
