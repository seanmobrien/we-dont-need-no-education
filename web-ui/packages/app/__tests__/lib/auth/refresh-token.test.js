import { refreshAccessToken } from '@/lib/auth/refresh-token';
import { fetch } from '@/lib/nextjs-util/dynamic-fetch';
import { hideConsoleOutput } from '@/__tests__/test-utils';
const DefaultTokenValues = {
    name: 'Test User',
    email: 'test@example.com',
    sub: '123',
    access_token: 'old_access_token',
    refresh_token: 'valid_refresh_token',
    expires_at: 1000,
    jti: 'uuid',
};
export class JsonWebToken {
    name;
    email;
    sub;
    access_token;
    refresh_token;
    expires_at;
    iat;
    exp;
    jti;
    constructor(init, overrides) {
        const normalized = JsonWebToken.normalizeParams(init, overrides);
        Object.assign(this, normalized);
    }
    static normalizeParams(init, overrides) {
        if (!init) {
            return { ...DefaultTokenValues, ...(overrides ?? {}) };
        }
        if (typeof init === 'object' && 'token' in init && init.token !== undefined) {
            const payload = typeof init.token === 'string' ? { token: init.token } : init.token;
            return {
                ...(init.defaults ?? DefaultTokenValues),
                ...payload,
                ...(init.overrides ?? {}),
                ...(overrides ?? {}),
            };
        }
        const payload = typeof init === 'string' ? { token: init } : init;
        return {
            ...DefaultTokenValues,
            ...payload,
            ...(overrides ?? {}),
        };
    }
    static get TestToken() {
        return new JsonWebToken(DefaultTokenValues);
    }
}
describe('refreshAccessToken', () => {
    let mockFetch = fetch;
    beforeEach(() => {
        mockFetch = fetch;
        mockFetch.mockReset();
    });
    const mockToken = JsonWebToken.TestToken;
    it('should refresh token successfully', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(0));
        const mockResponse = {
            access_token: 'new_access_token',
            expires_in: 300,
            refresh_token: 'valid_refresh_token',
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn(() => Promise.resolve(mockResponse)),
        });
        const refreshedToken = await refreshAccessToken(mockToken);
        expect(refreshedToken).toEqual(expect.objectContaining({
            access_token: 'new_access_token',
            refresh_token: 'valid_refresh_token',
        }));
        expect(refreshedToken.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
        expect(mockFetch).toHaveBeenCalledWith('https://keycloak.example.com/realms/test/protocol/openid-connect/token', expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: expect.any(URLSearchParams),
        }));
    });
    it('should return original token with error if refresh fails', async () => {
        hideConsoleOutput().setup();
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: jest.fn(() => Promise.resolve({ error: 'invalid_grant' })),
        });
        const result = await refreshAccessToken(mockToken);
        expect(result).toEqual(expect.objectContaining({
            ...mockToken,
            error: expect.anything(),
        }));
    });
    it('should return error if no refresh token is present', async () => {
        hideConsoleOutput().setup();
        const noRefreshToken = { ...mockToken, refresh_token: undefined };
        const result = await refreshAccessToken(noRefreshToken);
        expect(result).toEqual(expect.objectContaining({
            ...noRefreshToken,
            error: expect.anything()
        }));
    });
    it('should fallback to old refresh token if new one is not returned', async () => {
        const mockResponse = {
            access_token: 'new_access_token',
            expires_in: 300,
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });
        const refreshedToken = await refreshAccessToken(mockToken);
        expect(refreshedToken.refresh_token).toBe('valid_refresh_token');
    });
});
//# sourceMappingURL=refresh-token.test.js.map