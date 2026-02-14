import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
import got from 'got';
const mockGot = got;
const grantQueue = [];
jest.mock('openid-client', () => {
    return {
        discovery: jest.fn(async () => ({
            issuer: { metadata: {} },
        })),
        buildAuthorizationUrl: jest.fn(() => new URL('https://keycloak.example.com/realms/test/protocol/openid-connect/auth?client_id=test-client-id&response_type=code')),
        authorizationCodeGrant: jest.fn(async () => {
            if (!grantQueue.length) {
                throw new Error('authorizationCodeGrant called with empty grantQueue');
            }
            return grantQueue.shift();
        }),
        randomState: jest.fn(() => 'state'),
        randomNonce: jest.fn(() => 'nonce'),
    };
});
let kcAdminMock = null;
jest.mock('@/lib/auth/keycloak-factories', () => {
    kcAdminMock = {
        setAccessToken: jest.fn(),
        users: {
            find: jest.fn(),
        },
    };
    return {
        keycloakAdminClientFactory: jest.fn().mockImplementation(() => {
            return Promise.resolve(kcAdminMock);
        }),
    };
});
jest.mock('@/lib/site-util/auth/crypto-service', () => ({
    CryptoService: jest.fn().mockImplementation(() => ({
        encrypt: jest.fn(async (data) => `encrypted:${data}`),
        decrypt: jest.fn(async (data) => data.replace('encrypted:', '')),
    })),
}));
const redisClient = {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
};
jest.mock('@compliance-theater/redis', () => ({
    getRedisClient: jest.fn(async () => redisClient),
}));
const oc = jest.requireMock('openid-client');
describe('ImpersonationThirdParty (Authorization Code flow)', () => {
    const issuer = 'https://keycloak.example.com/realms/test';
    const redirectUri = 'http://localhost/callback';
    const mockSession = {
        id: 1,
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        user: {
            id: '1',
            image: 'http://example.com/image.jpg',
            email: 'user@example.com',
            subject: '123',
            name: 'some user',
        },
    };
    let mockGot = got;
    beforeEach(() => {
        mockGot = got;
        process.env.AUTH_KEYCLOAK_ISSUER = issuer;
        process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client-id';
        process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
        process.env.AUTH_KEYCLOAK_REDIRECT_URI = redirectUri;
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin@example.com';
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'S3cr3t!';
        grantQueue.length = 0;
    });
    test('happy path: admin login via form -> impersonation -> user token', async () => {
        withJestTestExtensions().session.user = {
            id: 'admin-user-id',
            subject: 'admin-sub',
            email: 'target.user@example.com',
            name: 'Admin User',
            account_id: 'acct-1',
        };
        const loginHtml = `
      <html><body>
        <form action="/realms/test/login-actions/authenticate">
          <input type="hidden" name="session_code" value="abc" />
          <input type="hidden" name="execution" value="exec" />
          <input type="hidden" name="client_id" value="test-client-id" />
          <input type="hidden" name="tab_id" value="tab" />
        </form>
      </body></html>
    `;
        mockGot.get
            .mockResolvedValueOnce({ statusCode: 200, body: loginHtml })
            .mockResolvedValueOnce({
            statusCode: 302,
            headers: { location: `${redirectUri}?code=admin-code&state=state` },
        })
            .mockResolvedValueOnce({
            statusCode: 302,
            headers: { location: `${redirectUri}?code=user-code&state=state` },
        });
        mockGot.post
            .mockResolvedValueOnce({
            statusCode: 302,
            headers: { location: '/continue' },
        })
            .mockResolvedValueOnce({ statusCode: 200 });
        grantQueue.push({ access_token: 'admin-access', expires_in: 3600 }, { access_token: 'user-access', expires_in: 3600 });
        const { ImpersonationThirdParty, } = require('@/lib/auth/impersonation/impersonation.thirdparty');
        kcAdminMock.users.find.mockResolvedValue([
            { id: 'target-user-id' },
        ]);
        const svc = await ImpersonationThirdParty.fromRequest({
            session: mockSession,
        });
        expect(svc).toBeTruthy();
        const token = await svc.getImpersonatedToken();
        expect(token).toBe('user-access');
        expect(mockGot.get).toHaveBeenCalledTimes(3);
        expect(mockGot.post).toHaveBeenCalledTimes(2);
        expect(oc.authorizationCodeGrant).toHaveBeenCalledTimes(2);
    });
    test('error: target user not found', async () => {
        withJestTestExtensions().session.user = {
            id: 'admin-user-id',
            subject: 'admin-sub',
            email: 'missing.user@example.com',
            name: 'Admin User',
        };
        mockGot.get.mockResolvedValueOnce({
            statusCode: 302,
            headers: { location: `${redirectUri}?code=admin-code&state=state` },
        });
        grantQueue.push({ access_token: 'admin-access', expires_in: 3600 });
        const { ImpersonationThirdParty, } = require('@/lib/auth/impersonation/impersonation.thirdparty');
        const svc = await ImpersonationThirdParty.fromRequest({
            session: mockSession,
        });
        kcAdminMock.users.find.mockResolvedValue([]);
        await expect(svc.getImpersonatedToken()).rejects.toThrow(/target user not found/);
    });
});
//# sourceMappingURL=impersonation.thirdparty.test.js.map