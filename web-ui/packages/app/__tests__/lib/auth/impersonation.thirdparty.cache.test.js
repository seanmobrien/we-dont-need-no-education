import { createMockTracer } from '@/__tests__/shared/setup/jest.mock-tracing';
import { withJestTestExtensions } from '@/__tests__/shared/jest.test-extensions';
const b64url = (obj) => Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
const makeJwtWithExp = (expSecondsFromNow) => {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url({ alg: 'none', typ: 'JWT' });
    const payload = b64url({ exp: now + expSecondsFromNow });
    return `${header}.${payload}.sig`;
};
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
const gotGet = jest.fn();
const gotPost = jest.fn();
const gotExtended = {
    get: (...args) => gotGet(...args),
    post: (...args) => gotPost(...args),
};
const gotExtend = jest.fn().mockReturnValue(gotExtended);
jest.mock('got', () => ({
    __esModule: true,
    got: {
        get: (...args) => gotGet(...args),
        post: (...args) => gotPost(...args),
        extend: (...args) => gotExtend(...args),
    },
}));
const mockEncrypt = jest.fn(async (s) => `enc:${s}`);
const mockDecrypt = jest.fn(async (s) => s.startsWith('enc:') ? s.slice(4) : s);
jest.mock('@/lib/site-util/auth/crypto-service', () => ({
    CryptoService: jest.fn().mockImplementation(() => ({
        encrypt: mockEncrypt,
        decrypt: mockDecrypt,
    })),
}));
const redisClient = {
    get: jest.fn(),
    setEx: jest.fn(),
};
jest.mock('@compliance-theater/redis', () => ({
    getRedisClient: jest.fn(async () => redisClient),
}));
let lastKcAdminInstance = null;
const MockKcAdminCtor = jest.fn().mockImplementation(() => {
    lastKcAdminInstance = {
        setAccessToken: jest.fn(),
        users: {
            find: jest.fn(async () => []),
        },
    };
    return lastKcAdminInstance;
});
jest.mock('@keycloak/keycloak-admin-client', () => ({
    __esModule: true,
    default: MockKcAdminCtor,
}));
const tracer = createMockTracer();
describe('ImpersonationThirdParty - offline token cache lifecycle', () => {
    const issuer = 'https://keycloak.example.com/realms/test';
    const redirectUri = 'http://localhost/callback';
    beforeEach(() => {
        tracer.setup();
        process.env.AUTH_KEYCLOAK_ISSUER = issuer;
        process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client-id';
        process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
        process.env.AUTH_KEYCLOAK_REDIRECT_URI = redirectUri;
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin@example.com';
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'S3cr3t!';
        delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
        withJestTestExtensions().session.user = {
            id: 'admin-user-id',
            subject: 'admin-sub',
            email: 'target.user@example.com',
            name: 'Admin User',
        };
        grantQueue.length = 0;
    });
    afterEach(() => {
        tracer.dispose();
    });
    test('uses cached valid offline token from Redis -> refresh grant, no login', async () => {
        const rt1 = makeJwtWithExp(3600);
        redisClient.get.mockResolvedValueOnce(`enc:${rt1}`);
        const rt2 = makeJwtWithExp(7200);
        gotPost
            .mockResolvedValueOnce({
            statusCode: 200,
            body: JSON.stringify({
                access_token: 'admin-access',
                expires_in: 3600,
                refresh_token: rt2,
            }),
        })
            .mockResolvedValueOnce({ statusCode: 200 });
        gotGet.mockResolvedValueOnce({
            statusCode: 302,
            headers: { location: `${redirectUri}?code=user-code&state=state` },
        });
        grantQueue.push({ access_token: 'user-access', expires_in: 3600 });
        const { ImpersonationThirdParty, } = require('@/lib/auth/impersonation/impersonation.thirdparty');
        const svc = await ImpersonationThirdParty.fromRequest({
            session: {
                id: 1,
                expires: new Date(Date.now() + 3600 * 1000).toISOString(),
                user: {
                    id: '1',
                    image: 'http://example.com/image.jpg',
                    email: 'user@example.com',
                    subject: '123',
                    name: 'some user',
                },
            },
        });
        lastKcAdminInstance.users.find.mockImplementation(async () => {
            return [{ id: 'target-user-id' }];
        });
        const token = await svc.getImpersonatedToken();
        expect(token).toBe('user-access');
        expect(gotPost).toHaveBeenCalled();
        const firstPostUrl = gotPost.mock.calls[0][0];
        expect(String(firstPostUrl)).toContain('/protocol/openid-connect/token');
        expect(redisClient.setEx).toHaveBeenCalledTimes(1);
        const setArgs = redisClient.setEx.mock.calls[0];
        expect(setArgs[0]).toMatch(/^keycloak:offline_token:test:test-client-id:system/);
        expect(typeof setArgs[1]).toBe('number');
        expect(setArgs[1]).toBeGreaterThan(0);
        expect(setArgs[2]).toBe(`enc:${rt2}`);
        expect(gotGet).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=impersonation.thirdparty.cache.test.js.map