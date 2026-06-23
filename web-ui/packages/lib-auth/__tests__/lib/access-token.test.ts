/**
 * @jest-environment node
 */

jest.mock('../../src/auth.node', () => ({
  __esModule: true,
  auth: jest.fn(),
}));

jest.mock('@compliance-theater/database/orm', () => ({
  __esModule: true,
  drizDbWithInit: jest.fn(),
}));

jest.mock('../../src/lib/utilities/extract-token', () => ({
  __esModule: true,
  extractToken: jest.fn(),
}));

import { drizDbWithInit } from '@compliance-theater/database/orm';

import { auth } from '../../src/auth.node';
import { extractToken } from '../../src/lib/utilities/extract-token';
import {
  getAccessToken,
  normalizedAccessToken,
  WRAPPED_ACCESS_TOKEN_CLAIM,
  WRAPPED_ACCESS_TOKEN_CLAIM_VALUE,
} from '../../src/lib/access-token';

describe('access-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (extractToken as jest.Mock).mockResolvedValue(null);
  });

  it('returns a raw Authorization bearer token before session-backed lookup', async () => {
    const request = new Request('http://localhost/api/ai/tools/sse', {
      headers: {
        authorization: 'Bearer cli-device-token',
      },
    });

    await expect(getAccessToken(request as never)).resolves.toBe('cli-device-token');

    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('unwraps an Auth.js Authorization bearer before returning the access token', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'wrapped-provider-subject',
      account_id: 88,
      [WRAPPED_ACCESS_TOKEN_CLAIM]: WRAPPED_ACCESS_TOKEN_CLAIM_VALUE,
      access_token: 'wrapped-keycloak-access-token',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const request = new Request('http://localhost/api/ai/tools/sse', {
      headers: {
        authorization: 'Bearer wrapped-authjs-token',
      },
    });

    await expect(getAccessToken(request as never)).resolves.toBe(
      'wrapped-keycloak-access-token',
    );

    expect(extractToken).toHaveBeenCalledWith(request);
    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('keeps an unmarked Authorization bearer raw even when the decoded payload has access_token', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'plain-provider-subject',
      account_id: 88,
      access_token: 'decoded-but-unmarked-access-token',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const request = new Request('http://localhost/api/ai/tools/sse', {
      headers: {
        authorization: 'Bearer unmarked-bearer-token',
      },
    });

    await expect(getAccessToken(request as never)).resolves.toBe(
      'unmarked-bearer-token',
    );

    expect(extractToken).toHaveBeenCalledWith(request);
    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('normalizes a raw Authorization bearer token from a request', async () => {
    const request = new Request('http://localhost/api/ai/tools/sse', {
      headers: {
        authorization: 'Bearer cli-device-token',
      },
    });

    await expect(normalizedAccessToken(request as never)).resolves.toEqual({
      accessToken: 'cli-device-token',
      userId: 0,
    });

    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('normalizes an unwrapped Auth.js Authorization bearer from a request', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'wrapped-provider-subject',
      account_id: 88,
      [WRAPPED_ACCESS_TOKEN_CLAIM]: WRAPPED_ACCESS_TOKEN_CLAIM_VALUE,
      access_token: 'wrapped-keycloak-access-token',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const request = new Request('http://localhost/api/ai/tools/sse', {
      headers: {
        authorization: 'Bearer wrapped-authjs-token',
      },
    });

    await expect(normalizedAccessToken(request as never)).resolves.toEqual({
      accessToken: 'wrapped-keycloak-access-token',
      userId: 88,
    });

    expect(extractToken).toHaveBeenCalledWith(request);
    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('normalizes an unwrapped Auth.js bearer string', async () => {
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'wrapped-provider-subject',
      account_id: 88,
      [WRAPPED_ACCESS_TOKEN_CLAIM]: WRAPPED_ACCESS_TOKEN_CLAIM_VALUE,
      access_token: 'wrapped-keycloak-access-token',
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    await expect(normalizedAccessToken('wrapped-authjs-token')).resolves.toEqual({
      accessToken: 'wrapped-keycloak-access-token',
      userId: 88,
    });

    expect(extractToken).toHaveBeenCalledWith(expect.any(Request));
    expect(auth).not.toHaveBeenCalled();
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('passes the request into auth() for session-backed lookup', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: '42',
      },
    });
    (drizDbWithInit as jest.Mock).mockImplementation(async (callback: (db: {
      query: {
        accounts: {
          findFirst: () => Promise<{
            accessToken: string;
            refreshToken: string;
            idToken: string;
            expiresAt: number;
            refreshExpiresAt: number;
            providerAccountId: string;
          }>;
        };
      };
    }) => Promise<unknown>) =>
      callback({
        query: {
          accounts: {
            findFirst: async () => ({
              accessToken: 'db-token',
              refreshToken: 'refresh-token',
              idToken: 'id-token',
              expiresAt: 123,
              refreshExpiresAt: 456,
              providerAccountId: 'provider-account-id',
            }),
          },
        },
      }),
    );

    const request = new Request('http://localhost/api/ai/tools/sse');

    await expect(getAccessToken(request as never)).resolves.toBe('db-token');

    expect(auth).toHaveBeenCalledWith(request);
    expect(drizDbWithInit).toHaveBeenCalledTimes(1);
  });

  it('uses session user account_id when user.id is not numeric', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'keycloak-subject-id',
        account_id: 84,
      },
    });
    (drizDbWithInit as jest.Mock).mockImplementation(async (callback: (db: {
      query: {
        accounts: {
          findFirst: () => Promise<{
            accessToken: string;
            refreshToken: string;
            idToken: string;
            expiresAt: number;
            refreshExpiresAt: number;
            providerAccountId: string;
          }>;
        };
      };
    }) => Promise<unknown>) =>
      callback({
        query: {
          accounts: {
            findFirst: async () => ({
              accessToken: 'db-token-from-account-id',
              refreshToken: 'refresh-token',
              idToken: 'id-token',
              expiresAt: 123,
              refreshExpiresAt: 456,
              providerAccountId: 'provider-account-id',
            }),
          },
        },
      }),
    );

    const request = new Request('http://localhost/api/ai/tools/sse');

    await expect(getAccessToken(request as never)).resolves.toBe(
      'db-token-from-account-id',
    );

    expect(auth).toHaveBeenCalledWith(request);
    expect(drizDbWithInit).toHaveBeenCalledTimes(1);
  });

  it('falls back to provider subject id when user id is non-numeric and account_id is missing', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'keycloak-subject-id',
      },
    });
    (drizDbWithInit as jest.Mock).mockImplementation(async (callback: (db: {
      query: {
        accounts: {
          findFirst: () => Promise<{
            accessToken: string;
            refreshToken: string;
            idToken: string;
            expiresAt: number;
            refreshExpiresAt: number;
            providerAccountId: string;
            userId: number;
          }>;
        };
      };
    }) => Promise<unknown>) =>
      callback({
        query: {
          accounts: {
            findFirst: async () => ({
              accessToken: 'db-token-from-provider-subject',
              refreshToken: 'refresh-token',
              idToken: 'id-token',
              expiresAt: 123,
              refreshExpiresAt: 456,
              providerAccountId: 'keycloak-subject-id',
              userId: 1234,
            }),
          },
        },
      }),
    );

    const request = new Request('http://localhost/api/ai/tools/sse');

    await expect(getAccessToken(request as never)).resolves.toBe(
      'db-token-from-provider-subject',
    );

    expect(auth).toHaveBeenCalledWith(request);
    expect(drizDbWithInit).toHaveBeenCalledTimes(1);
  });

  it('falls back to extracted auth token account_id when session lookup fails', async () => {
    (auth as jest.Mock).mockRejectedValue(new Error('request session unavailable'));
    (extractToken as jest.Mock).mockResolvedValue({
      account_id: 3,
      sub: 'provider-sub-id',
    });

    (drizDbWithInit as jest.Mock).mockImplementation(async (callback: (db: {
      query: {
        accounts: {
          findFirst: () => Promise<{
            accessToken: string;
            refreshToken: string;
            idToken: string;
            expiresAt: number;
            refreshExpiresAt: number;
            providerAccountId: string;
            userId: number;
          }>;
        };
      };
    }) => Promise<unknown>) =>
      callback({
        query: {
          accounts: {
            findFirst: async () => ({
              accessToken: 'db-token-from-extracted-account-id',
              refreshToken: 'refresh-token',
              idToken: 'id-token',
              expiresAt: 123,
              refreshExpiresAt: 456,
              providerAccountId: 'provider-sub-id',
              userId: 3,
            }),
          },
        },
      }),
    );

    const request = new Request('http://localhost/api/email/test-id');

    await expect(getAccessToken(request as never)).resolves.toBe(
      'db-token-from-extracted-account-id',
    );

    expect(extractToken).toHaveBeenCalledWith(request);
  });

  it('reuses an extracted wrapped Auth.js access token before DB lookup', async () => {
    (auth as jest.Mock).mockRejectedValue(new Error('request session unavailable'));
    (extractToken as jest.Mock).mockResolvedValue({
      sub: 'wrapped-provider-subject',
      access_token: 'wrapped-keycloak-access-token',
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    const request = new Request('http://localhost/api/email/test-id');

    await expect(getAccessToken(request as never)).resolves.toBe(
      'wrapped-keycloak-access-token',
    );

    await expect(normalizedAccessToken(request as never)).resolves.toEqual({
      accessToken: 'wrapped-keycloak-access-token',
      userId: 0,
    });

    expect(extractToken).toHaveBeenCalledWith(request);
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });
});
