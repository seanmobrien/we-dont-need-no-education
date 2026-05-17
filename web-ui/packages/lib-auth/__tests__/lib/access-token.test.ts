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

import { drizDbWithInit } from '@compliance-theater/database/orm';

import { auth } from '../../src/auth.node';
import { getAccessToken, normalizedAccessToken } from '../../src/lib/access-token';

describe('access-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});