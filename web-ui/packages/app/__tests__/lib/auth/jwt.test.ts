import { jwt } from '@/lib/auth/jwt';
import { JWT } from '@auth/core/jwt';

// Mock dependencies
jest.mock('@/lib/auth/utilities', () => ({
  decodeToken: jest.fn(),
}));

jest.mock('@compliance-theater/logger', () => ({
  log: jest.fn(),
}));

// We don't need to mock refresh-token or env or update-account-tokens anymore 
// because jwt.ts doesn't use them.

describe('jwt callback', () => {
  const mockUser = {
    id: '1',
    account_id: 123,
    email: 'test@example.com',
  };

  const mockAccount = {
    provider: 'keycloak',
    type: 'oauth',
    providerAccountId: 'sub-123',
    access_token: 'secret_access_token',
    refresh_token: 'secret_refresh_token',
    expires_in: 300, // 5 minutes
    id_token: 'mock_id_token',
  };

  const mockToken: JWT = {
    name: 'Test User',
    email: 'test@example.com',
    sub: '123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Sign-In (user and account present)', () => {
    it('should NOT store access_token or refresh_token in the JWT', async () => {
      // @ts-expect-error - mock types
      const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });

      expect(result.access_token).toBeUndefined();
      expect(result.refresh_token).toBeUndefined();
    });

    it('should set expires_at to 2 hours in the future (plus/minus small delta)', async () => {
      const now = Math.floor(Date.now() / 1000);
      // @ts-expect-error - mock types
      const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });

      const expectedExpiry = now + (2 * 60 * 60); // 2 hours

      // Allow 5 second variance
      expect(Number(result.expires_at)).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(Number(result.expires_at)).toBeLessThanOrEqual(expectedExpiry + 5);
    });

    it('should copy user id and account_id', async () => {
      // @ts-expect-error - mock types
      const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });

      expect(result.id).toBe(mockUser.id);
      expect(result.account_id).toBe(mockUser.account_id);
    });
  });

  describe('Subsequent Calls (only token present)', () => {
    it('should return the token as-is', async () => {
      const existingToken: JWT = {
        ...mockToken,
        id: '1',
        account_id: 123,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = await jwt({ token: existingToken, user: undefined, account: undefined });

      expect(result).toBe(existingToken);
    });

    it('should NOT attempt refresh even if "expired" relative to access token logic', async () => {
      // Logic for refreshing was removed, so this is just verifying no side effects/errors
      const expiredToken: JWT = {
        ...mockToken,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      const result = await jwt({ token: expiredToken, user: undefined, account: undefined });

      // Should just return the expired token, Middleware/Session will handle it
      expect(result).toBe(expiredToken);
      expect(result.error).toBeUndefined();
    });
  });
});
