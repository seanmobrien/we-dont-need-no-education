/**
 * @jest-environment node
 */

jest.mock('../../src/lib/session/shared', () => ({
  __esModule: true,
  setupSession: jest.fn(),
}));

jest.mock('../../src/lib/server/get-account-tokens', () => ({
  __esModule: true,
  getAccountTokens: jest.fn(),
}));

jest.mock('../../src/lib/refresh-token', () => ({
  __esModule: true,
  refreshAccessToken: jest.fn(),
}));

jest.mock('../../src/lib/server/update-account-tokens', () => ({
  __esModule: true,
  updateAccountTokens: jest.fn(),
}));

jest.mock('../../src/lib/utilities', () => ({
  __esModule: true,
  decodeToken: jest.fn(),
}));

import type { JWT, Session } from '@compliance-theater/auth-compat';
import { session as sessionCallback } from '../../src/lib/session/session-nodejs';
import { setupSession } from '../../src/lib/session/shared';
import { getAccountTokens } from '../../src/lib/server/get-account-tokens';
import { refreshAccessToken } from '../../src/lib/refresh-token';
import { updateAccountTokens } from '../../src/lib/server/update-account-tokens';
import { decodeToken } from '../../src/lib/utilities';

describe('session-nodejs account token identity fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads DB tokens using providerAccountId when session.user.id is non-numeric', async () => {
    (setupSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'provider-subject',
        subject: 'provider-subject',
      },
    } satisfies Partial<Session>);
    (getAccountTokens as jest.Mock).mockResolvedValue({
      accessToken: 'db-access-token',
      refreshToken: 'db-refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      idToken: 'db-id-token',
    });
    (decodeToken as jest.Mock).mockResolvedValue({
      resource_access: {
        test: {
          roles: ['read'],
        },
      },
    });

    const result = await sessionCallback({
      session: {} as Session,
      token: {} as JWT,
    });

    expect(getAccountTokens).toHaveBeenCalledWith({
      providerAccountId: 'provider-subject',
    });
    expect(result.resource_access).toEqual({
      test: {
        roles: ['read'],
      },
    });
  });

  it('persists refreshed tokens using providerAccountId when no numeric user id is available', async () => {
    const refreshedExpiry = Math.floor(Date.now() / 1000) + 3600;

    (setupSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'provider-subject',
        subject: 'provider-subject',
      },
    } satisfies Partial<Session>);
    (getAccountTokens as jest.Mock).mockResolvedValue({
      accessToken: 'expired-access-token',
      refreshToken: 'refresh-token',
      expiresAt: Math.floor(Date.now() / 1000) - 60,
      idToken: 'expired-id-token',
    });
    (refreshAccessToken as jest.Mock).mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: refreshedExpiry,
      idToken: 'new-id-token',
    });
    (decodeToken as jest.Mock).mockResolvedValue({
      resource_access: {
        test: {
          roles: ['read'],
        },
      },
    });

    await sessionCallback({
      session: {} as Session,
      token: {} as JWT,
    });

    expect(updateAccountTokens).toHaveBeenCalledWith(
      {
        providerAccountId: 'provider-subject',
      },
      {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: refreshedExpiry,
        idToken: 'new-id-token',
      },
    );
  });
});