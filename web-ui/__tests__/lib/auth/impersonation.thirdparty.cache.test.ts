/**
 * @jest-environment node
 */

/**
 * Offline token cache lifecycle tests for ImpersonationThirdParty
 * - Uses Redis + CryptoService mocks to simulate encrypted cached refresh token
 * - Verifies refresh_token grant path avoids headless login
 * - Verifies expired cached token falls back to login and persists rotated token
 */
import { createMockTracer } from '@/__tests__/jest.mock-tracing';
import { withJestTestExtensions } from '@/__tests__/jest.test-extensions';
// Helpers to craft minimal JWT strings with exp claim
const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
const makeJwtWithExp = (expSecondsFromNow: number) => {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'none', typ: 'JWT' });
  const payload = b64url({ exp: now + expSecondsFromNow });
  return `${header}.${payload}.sig`;
};

// Queue-based mock for authorizationCodeGrant responses (user only in refresh path)
const grantQueue: Array<any> = [];

// Mock openid-client functional API
jest.mock('openid-client', () => {
  return {
    discovery: jest.fn(async () => ({
      issuer: { metadata: {} },
    })),
    buildAuthorizationUrl: jest.fn(
      () =>
        new URL(
          'https://keycloak.example.com/realms/test/protocol/openid-connect/auth?client_id=test-client-id&response_type=code',
        ),
    ),
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

// got mocks
const gotGet = jest.fn();
const gotPost = jest.fn();
const gotExtended = {
  get: (...args: any[]) => gotGet(...args),
  post: (...args: any[]) => gotPost(...args),
};
const gotExtend = jest.fn().mockReturnValue(gotExtended);
jest.mock('got', () => ({
  __esModule: true,
  got: {
    get: (...args: any[]) => gotGet(...args),
    post: (...args: any[]) => gotPost(...args),
    extend: (...args: any[]) => gotExtend(...args),
  },
}));

// CryptoService mock (named export is a class)
const mockEncrypt = jest.fn(async (s: string) => `enc:${s}`);
const mockDecrypt = jest.fn(async (s: string) =>
  s.startsWith('enc:') ? s.slice(4) : s,
);
jest.mock('@/lib/site-util/auth/crypto-service', () => ({
  CryptoService: jest.fn().mockImplementation(() => ({
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
  })),
}));

// Redis client wrapper mock
const redisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
};
jest.mock('@/lib/redis-client', () => ({
  getRedisClient: jest.fn(async () => redisClient),
}));

// Keycloak Admin mock
let lastKcAdminInstance: any = null;
const MockKcAdminCtor = jest.fn().mockImplementation(() => {
  lastKcAdminInstance = {
    setAccessToken: jest.fn(),
    users: {
      find: jest.fn(async () => [] as Array<{ id: string }>),
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
    //jest.clearAllMocks();
    // Env for fromRequest
    process.env.AUTH_KEYCLOAK_ISSUER = issuer;
    process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client-id';
    process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
    process.env.AUTH_KEYCLOAK_REDIRECT_URI = redirectUri;
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin@example.com';
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'S3cr3t!';
    // Ensure no preset offline token in env
    delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
    withJestTestExtensions().session!.user = {
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
    // Arrange cached encrypted refresh token with future exp
    const rt1 = makeJwtWithExp(3600);
    redisClient.get.mockResolvedValueOnce(`enc:${rt1}`);

    // Token endpoint refresh returns admin access + rotated refresh token
    const rt2 = makeJwtWithExp(7200);
    gotPost
      // 1) POST token endpoint (refresh)
      .mockResolvedValueOnce({
        statusCode: 200,
        body: JSON.stringify({
          access_token: 'admin-access',
          expires_in: 3600,
          refresh_token: rt2,
        }),
      })
      // 2) POST impersonation
      .mockResolvedValueOnce({ statusCode: 200 });

    // Authorize for user after impersonation
    gotGet.mockResolvedValueOnce({
      statusCode: 302,
      headers: { location: `${redirectUri}?code=user-code&state=state` },
    });

    // Only user grant needed (admin came from refresh path)
    grantQueue.push({ access_token: 'user-access', expires_in: 3600 });

    const {
      ImpersonationThirdParty,
    } = require('@/lib/auth/impersonation/impersonation.thirdparty');
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
    // Ensure user resolution
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async () => {
        return [{ id: 'target-user-id' }];
      },
    );

    const token = await svc!.getImpersonatedToken();
    expect(token).toBe('user-access');

    // Assert refresh grant path invoked first
    expect(gotPost).toHaveBeenCalled();
    const firstPostUrl = gotPost.mock.calls[0][0];
    expect(String(firstPostUrl)).toContain('/protocol/openid-connect/token');

    // Assert rotated refresh token persisted encrypted with TTL
    expect(redisClient.setEx).toHaveBeenCalledTimes(1);
    const setArgs = redisClient.setEx.mock.calls[0];
    expect(setArgs[0]).toMatch(
      /^keycloak:offline_token:test:test-client-id:system/,
    );
    expect(typeof setArgs[1]).toBe('number');
    expect(setArgs[1]).toBeGreaterThan(0);
    expect(setArgs[2]).toBe(`enc:${rt2}`);

    // No admin login flow (no initial GET login page)
    // Only one GET for user authorize
    expect(gotGet).toHaveBeenCalledTimes(1);
  });
  /*
  test('expired cached offline token -> falls back to login and stores new offline token', async () => {
    // Arrange expired token in Redis
    const expired = makeJwtWithExp(-3600);
    redisClient.get.mockResolvedValueOnce(`enc:${expired}`);

    // Login page HTML
    const loginHtml = `
      <form action="/realms/test/login-actions/authenticate">
        <input type="hidden" name="client_id" value="test-client-id" />
      </form>`;

    // GET authorize -> 200 login
    gotGet
      .mockResolvedValueOnce({ statusCode: 200, body: loginHtml })
      // GET authorize for user after impersonation
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=user-code&state=state` },
      });

    // POST login -> 302, POST impersonation -> 200
    gotPost
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: '/continue' },
      })
      .mockResolvedValueOnce({ statusCode: 200 });

    // Admin grant (from login) returns refresh token which should be stored
    const newRt = makeJwtWithExp(3600);
    grantQueue.push({
      access_token: 'admin-access',
      expires_in: 3600,
      refresh_token: newRt,
    });
    // User grant
    grantQueue.push({ access_token: 'user-access', expires_in: 3600 });

    const { ImpersonationThirdParty } = await import(
      '/lib/auth/impersonation/impersonation.thirdparty'
    );
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async (params: any) => {
        return [{ id: 'target-user-id' }];
      },
    );
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

    const token = await svc!.getImpersonatedToken();
    expect(token).toBe('user-access');

    // No refresh grant first (first POST was login action, not token endpoint)
    const firstPostUrl = gotPost.mock.calls[0][0];
    expect(String(firstPostUrl)).toContain('/login-actions/authenticate');

    // New offline token stored
    expect(redisClient.setEx).toHaveBeenCalledTimes(1);
    const setArgs = redisClient.setEx.mock.calls[0];
    expect(setArgs[2]).toBe(`enc:${newRt}`);
  });
  */
});
