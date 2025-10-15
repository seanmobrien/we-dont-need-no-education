/**
 * @jest-environment node
 */

jest.mock('got');

import { withJestTestExtensions } from '@/__tests__/jest.test-extensions';
import type { Got } from 'got';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for ImpersonationThirdParty (Authorization Code flow)
 * - Happy path: admin code via login form, impersonation, then user code exchange
 * - Error path: user not found via admin client
 *
 * NOTE: Per repo guidelines, set mocks BEFORE importing the SUT.
 */
// import { got, type Got } from 'got';

// const mockGot = got as jest.Mocked<Got>;

// Queue-based mock for authorizationCodeGrant responses (admin then user)
const grantQueue: Array<any> = [];

// Mock openid-client functional API
jest.mock('openid-client', () => {
  return {
    discovery: jest.fn(async () => ({
      // Minimal structure; SUT passes this object through to helpers
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

// Mocks for got HTTP calls

/*
const mockGot.get = jest.fn();
const mockGot.post = jest.fn();
const gotExtended = {
  get: (...args: any[]) => mockGot.get(...args),
  post: (...args: any[]) => mockGot.post(...args),
};
const gotExtend = jest.fn().mockReturnValue(gotExtended);
jest.mock('got', () => ({
  __esModule: true,
  got: {
    get: (...args: any[]) => mockGot.get(...args),
    post: (...args: any[]) => mockGot.post(...args),
    extend: (...args: any[]) => gotExtend(...args),
  },
}));
*/

let kcAdminMock: any = null;

// Minimal Keycloak Admin Client mock (captures last created instance)
jest.mock('@/lib/auth/keycloak-factories', () => {
  kcAdminMock = {
    setAccessToken: jest.fn(),
    users: {
      find: jest.fn(),
    },
  };
  return {
    keycloakAdminClientFactory: jest.fn().mockImplementation(() => {
      return kcAdminMock;
    }),
  };
});

// Mock CryptoService for token encryption/decryption
jest.mock('@/lib/site-util/auth/crypto-service', () => ({
  CryptoService: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn(async (data: string) => `encrypted:${data}`),
    decrypt: jest.fn(async (data: string) => data.replace('encrypted:', '')),
  })),
}));

// Mock Redis client (return null to skip offline token strategy)
const redisClient = {
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
};
jest.mock('@/lib/ai/middleware/cacheWithRedis/redis-client', () => ({
  getRedisClient: jest.fn(async () => redisClient),
}));

// Import after mocks are set
import type { MockedFunction } from 'jest-mock';

// Helpers to access the mocked modules with types
const oc = jest.requireMock('openid-client') as {
  discovery: MockedFunction<any>;
  buildAuthorizationUrl: MockedFunction<any>;
  authorizationCodeGrant: MockedFunction<any>;
  randomState: MockedFunction<any>;
  randomNonce: MockedFunction<any>;
};

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

  let got: Got = undefined as unknown as Got;
  let mockGot: jest.Mocked<Got> = undefined as unknown as jest.Mocked<Got>;

  beforeEach(() => {
    jest.mock('got');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    got = require('got').got as Got;
    mockGot = got as jest.Mocked<Got>;

    // Ensure env vars used by fromRequest are present
    process.env.AUTH_KEYCLOAK_ISSUER = issuer;
    process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client-id';
    process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
    process.env.AUTH_KEYCLOAK_REDIRECT_URI = redirectUri;
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin@example.com';
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'S3cr3t!';

    grantQueue.length = 0;
  });

  test('happy path: admin login via form -> impersonation -> user token', async () => {
    // Arrange auth() to return a session with user info
    withJestTestExtensions().session!.user = {
      id: 'admin-user-id',
      subject: 'admin-sub',
      email: 'target.user@example.com',
      name: 'Admin User',
      account_id: 'acct-1',
    } as any;

    // Build login page HTML with a simple form and hidden inputs
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

    // Sequence of HTTP calls:
    // 1) GET authorize (no session) -> 200 + login page
    mockGot.get
      .mockResolvedValueOnce({ statusCode: 200, body: loginHtml })
      // 2) GET authorize (after successful login) -> 302 to redirect with admin code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=admin-code&state=state` },
      })
      // 3) GET authorize (post-impersonation for user) -> 302 to redirect with user code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=user-code&state=state` },
      });

    // 1) POST login form -> 302
    mockGot.post
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: '/continue' },
      })
      // 2) POST impersonation endpoint -> 200 OK
      .mockResolvedValueOnce({ statusCode: 200 });

    // authorizationCodeGrant returns admin token then user token
    grantQueue.push(
      { access_token: 'admin-access', expires_in: 3600 },
      { access_token: 'user-access', expires_in: 3600 },
    );

    // Import SUT lazily to ensure our mocks are applied first

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      ImpersonationThirdParty,
    } = require('@/lib/auth/impersonation/impersonation.thirdparty');
    // Ensure admin client finds the target user by email (configure captured instance)
    (kcAdminMock.users.find as jest.Mock).mockResolvedValue([
      { id: 'target-user-id' },
    ]);
    // Act
    const svc = await ImpersonationThirdParty.fromRequest({
      session: mockSession,
    });

    expect(svc).toBeTruthy();
    const token = await svc!.getImpersonatedToken();

    // Assert
    expect(token).toBe('user-access');
    expect(mockGot.get).toHaveBeenCalledTimes(3);
    expect(mockGot.post).toHaveBeenCalledTimes(2);
    expect(oc.authorizationCodeGrant).toHaveBeenCalledTimes(2);
  });

  test('error: target user not found', async () => {
    // Arrange auth() to return a session with user info
    withJestTestExtensions().session!.user = {
      id: 'admin-user-id',
      subject: 'admin-sub',
      email: 'missing.user@example.com',
      name: 'Admin User',
    };

    // HTTP: admin login flow still succeeds
    mockGot.get.mockResolvedValueOnce({
      statusCode: 302,
      headers: { location: `${redirectUri}?code=admin-code&state=state` },
    });

    grantQueue.push({ access_token: 'admin-access', expires_in: 3600 });

    const {
      ImpersonationThirdParty,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('@/lib/auth/impersonation/impersonation.thirdparty');
    // Create service, then set admin users.find to return empty -> user not found
    const svc = await ImpersonationThirdParty.fromRequest({
      session: mockSession,
    });
    (kcAdminMock.users.find as jest.Mock).mockResolvedValue([]);
    await expect(svc!.getImpersonatedToken()).rejects.toThrow(
      /target user not found/,
    );

    //expect(mockGot.get).toHaveBeenCalledTimes(1);
    //expect(mockGot.post).toHaveBeenCalledTimes(0);
  });
});
