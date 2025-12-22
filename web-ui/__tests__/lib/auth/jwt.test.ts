import { jwt } from '@/lib/auth/jwt';
import { refreshAccessToken } from '@/lib/auth/refresh-token';
import { isRunningOnEdge, isRunningOnServer } from '@/lib/site-util/env';
import { JWT } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/auth/refresh-token');
// jest.mock('@/lib/site-util/env');
/*
jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
  Logger: jest.fn(),
}));
*/
jest.mock('@/lib/auth/utilities', () => ({
  decodeToken: jest.fn(),
}));

// Mock dynamic import
const mockUpdateAccountTokens = jest.fn();
jest.mock('@/lib/auth/server/update-account-tokens', () => ({
  updateAccountTokens: mockUpdateAccountTokens,
}));

describe('jwt callback', () => {
  const mockToken: JWT = {
    name: 'Test User',
    email: 'test@example.com',
    sub: '123',
    id: 1,
    access_token: 'valid_access_token',
    refresh_token: 'valid_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour future
    iat: 1000,
    exp: 1000,
    jti: 'uuid',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isRunningOnEdge as jest.Mock).mockReturnValue(false); // Default to Node env
  });

  it('should return token as is if not expired', async () => {
    const result = await jwt({ token: mockToken, user: undefined, account: undefined });
    expect(result).toEqual(mockToken);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('should refresh token if expired', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour past
    };

    const refreshedToken = {
      ...expiredToken,
      access_token: 'new_access_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    (refreshAccessToken as jest.Mock).mockResolvedValue(refreshedToken);

    const result = await jwt({ token: expiredToken, user: undefined, account: undefined });

    expect(result).toEqual(refreshedToken);
    expect(refreshAccessToken).toHaveBeenCalledWith(expiredToken);
  });

  it('should return error if refresh fails', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: Math.floor(Date.now() / 1000) - 3600,
    };

    (refreshAccessToken as jest.Mock).mockResolvedValue({
      ...expiredToken,
      error: 'RefreshAccessTokenError'
    });

    const result = await jwt({ token: expiredToken, user: undefined, account: undefined });
    expect(result.error).toBe('RefreshAccessTokenError');
  });

  it('should trigger database update on server if refresh succeeds', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: Math.floor(Date.now() / 1000) - 3600,
    };
    const refreshedToken = {
      ...expiredToken,
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      idToken: 'new_id_token'
    };
    (refreshAccessToken as jest.Mock).mockResolvedValue(refreshedToken);
    (isRunningOnEdge as jest.Mock).mockReturnValue(false);
    (isRunningOnServer as jest.Mock).mockReturnValue(true);

    await jwt({ token: expiredToken, user: undefined, account: undefined });

    // Slight delay to allow async fire-and-forget to run
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockUpdateAccountTokens).toHaveBeenCalledWith(1, {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: refreshedToken.expires_at,
      idToken: 'new_id_token'
    });
  });

  it('should NOT trigger database update on Edge', async () => {
    const expiredToken = {
      ...mockToken,
      expires_at: Math.floor(Date.now() / 1000) - 3600,
    };
    const refreshedToken = {
      ...expiredToken,
      access_token: 'new_access_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    (refreshAccessToken as jest.Mock).mockResolvedValue(refreshedToken);
    (isRunningOnEdge as jest.Mock).mockReturnValue(true);

    await jwt({ token: expiredToken, user: undefined, account: undefined });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockUpdateAccountTokens).not.toHaveBeenCalled();
  });
});
