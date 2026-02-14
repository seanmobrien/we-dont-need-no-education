import { jwt } from '@/lib/auth/jwt';
jest.mock('@/lib/auth/utilities', () => ({
    decodeToken: jest.fn(),
}));
jest.mock('@compliance-theater/logger', () => ({
    log: jest.fn(),
}));
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
        expires_in: 300,
        id_token: 'mock_id_token',
    };
    const mockToken = {
        name: 'Test User',
        email: 'test@example.com',
        sub: '123',
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Initial Sign-In (user and account present)', () => {
        it('should NOT store access_token or refresh_token in the JWT', async () => {
            const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });
            expect(result.access_token).toBeUndefined();
            expect(result.refresh_token).toBeUndefined();
        });
        it('should set expires_at to 2 hours in the future (plus/minus small delta)', async () => {
            const now = Math.floor(Date.now() / 1000);
            const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });
            const expectedExpiry = now + (2 * 60 * 60);
            expect(Number(result.expires_at)).toBeGreaterThanOrEqual(expectedExpiry - 5);
            expect(Number(result.expires_at)).toBeLessThanOrEqual(expectedExpiry + 5);
        });
        it('should copy user id and account_id', async () => {
            const result = await jwt({ token: { ...mockToken }, user: mockUser, account: mockAccount });
            expect(result.id).toBe(mockUser.id);
            expect(result.account_id).toBe(mockUser.account_id);
        });
    });
    describe('Subsequent Calls (only token present)', () => {
        it('should return the token as-is', async () => {
            const existingToken = {
                ...mockToken,
                id: '1',
                account_id: 123,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
            };
            const result = await jwt({ token: existingToken, user: undefined, account: undefined });
            expect(result).toBe(existingToken);
        });
        it('should NOT attempt refresh even if "expired" relative to access token logic', async () => {
            const expiredToken = {
                ...mockToken,
                expires_at: Math.floor(Date.now() / 1000) - 3600,
            };
            const result = await jwt({ token: expiredToken, user: undefined, account: undefined });
            expect(result).toBe(expiredToken);
            expect(result.error).toBeUndefined();
        });
    });
});
//# sourceMappingURL=jwt.test.js.map