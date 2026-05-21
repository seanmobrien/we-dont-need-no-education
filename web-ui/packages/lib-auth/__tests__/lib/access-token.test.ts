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
import { getAccessToken, normalizedAccessToken } from '../../src/lib/access-token';

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
});