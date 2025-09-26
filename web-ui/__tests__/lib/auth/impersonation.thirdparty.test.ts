/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for ImpersonationThirdParty (Authorization Code flow)
 * - Happy path: admin code via login form, impersonation, then user code exchange
 * - Error path: user not found via admin client
 *
 * NOTE: Per repo guidelines, set mocks BEFORE importing the SUT.
 */

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
const gotGet = jest.fn();
const gotPost = jest.fn();
jest.mock('got', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => gotGet(...args),
    post: (...args: any[]) => gotPost(...args),
  },
}));

// Minimal Keycloak Admin Client mock (captures last created instance)
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

// Import after mocks are set
import type { MockedFunction } from 'jest-mock';
import { auth } from '@/auth';

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

  beforeEach(() => {
    // Ensure env vars used by fromRequest are present
    process.env.AUTH_KEYCLOAK_ISSUER = issuer;
    process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client-id';
    process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
    process.env.AUTH_KEYCLOAK_REDIRECT_URI = redirectUri;
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME = 'admin@example.com';
    process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD = 'S3cr3t!';

    // Reset HTTP mocks
    gotGet.mockReset();
    gotPost.mockReset();
    grantQueue.length = 0;
  });

  test('happy path: admin login via form -> impersonation -> user token', async () => {
    // Arrange auth() to return a session with user info
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
        account_id: 'acct-1',
      },
    });

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
    gotGet
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
    gotPost
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
    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );

    // Act
    const svc = await ImpersonationThirdParty.fromRequest();

    // Ensure admin client finds the target user by email (configure captured instance)
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async (params: any) => {
        if (
          params?.email === 'target.user@example.com' &&
          params?.exact === true
        ) {
          return [{ id: 'target-user-id' }];
        }
        return [];
      },
    );
    expect(svc).toBeTruthy();
    const token = await svc!.getImpersonatedToken();

    // Assert
    expect(token).toBe('user-access');
    expect(gotGet).toHaveBeenCalledTimes(3);
    expect(gotPost).toHaveBeenCalledTimes(2);
    expect(oc.authorizationCodeGrant).toHaveBeenCalledTimes(2);
  });

  test('happy path: two-step login (username then password)', async () => {
    // Arrange auth() to return a session with user info
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
        account_id: 'acct-1',
      },
    });

    // First page: username-only form (no hidden inputs required)
    const firstHtml = `
      <html><body>
        <form id="kc-form-login" action="/realms/test/login-actions/authenticate?execution=exec1&tab_id=tab1">
          <input id="username" name="username" type="text" value="" />
          <input id="rememberMe" name="rememberMe" type="checkbox" />
        </form>
      </body></html>
    `;

    // Second page: password form (with hidden credentialId)
    const secondHtml = `
      <html><body>
        <form id="kc-form-login" action="/realms/test/login-actions/authenticate?execution=exec2&tab_id=tab2">
          <input id="kc-attempted-username" value="admin@example.com" readonly />
          <input id="password" name="password" type="password" value="" />
          <input type="hidden" id="id-hidden-input" name="credentialId" />
        </form>
      </body></html>
    `;

    // HTTP sequence
    // 1) GET authorize -> 200 firstHtml
    gotGet
      .mockResolvedValueOnce({ statusCode: 200, body: firstHtml })
      // 2) GET second page after username POST redirect -> 200 secondHtml
      .mockResolvedValueOnce({ statusCode: 200, body: secondHtml })
      // 3) GET authorize (after login) -> 302 admin code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=admin-code&state=state` },
      })
      // 4) GET authorize (user, after impersonation) -> 302 user code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=user-code&state=state` },
      });

    // POSTs
    // 1) POST username-only -> 302 to second page URL
    gotPost
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: {
          location:
            '/realms/test/login-actions/authenticate?execution=exec2&tab_id=tab2',
        },
      })
      // 2) POST password form -> 302
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: '/continue' },
      })
      // 3) POST impersonation -> 200 OK
      .mockResolvedValueOnce({ statusCode: 200 });

    grantQueue.push(
      { access_token: 'admin-access', expires_in: 3600, refresh_token: 'r1' },
      { access_token: 'user-access', expires_in: 3600 },
    );

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    const svc = await ImpersonationThirdParty.fromRequest();

    // Ensure user lookup succeeds
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async (params: any) => {
        if (
          params?.email === 'target.user@example.com' &&
          params?.exact === true
        ) {
          return [{ id: 'target-user-id' }];
        }
        return [];
      },
    );

    const token = await svc!.getImpersonatedToken();
    expect(token).toBe('user-access');

    // Assert POST call details
    expect(gotPost).toHaveBeenCalledTimes(3);
    const firstPostArgs = gotPost.mock.calls[0];
    expect(firstPostArgs[0]).toContain(
      '/realms/test/login-actions/authenticate?execution=exec1',
    );
    expect(String(firstPostArgs[1].body)).toContain(
      'username=admin%40example.com',
    );

    const secondPostArgs = gotPost.mock.calls[1];
    expect(secondPostArgs[0]).toContain(
      '/realms/test/login-actions/authenticate?execution=exec2',
    );
    expect(String(secondPostArgs[1].body)).toContain('password=');
    expect(String(secondPostArgs[1].body)).toContain('credentialId=');
  });

  test('happy path: two-step login with 200 response containing password form', async () => {
    // Arrange auth() to return a session with user info
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
        account_id: 'acct-1',
      },
    });

    // First page: username-only form
    const firstHtml = `
      <html><body>
        <form id="kc-form-login" action="/realms/test/login-actions/authenticate?execution=exec1&tab_id=tab1">
          <input id="username" name="username" type="text" value="" />
          <input id="rememberMe" name="rememberMe" type="checkbox" />
        </form>
      </body></html>
    `;

    // Second form is returned directly in the POST 200 response body
    const secondHtml = `
      <html><body>
        <form id="kc-form-login" action="/realms/test/login-actions/authenticate?execution=exec2&tab_id=tab2">
          <input id="kc-attempted-username" value="admin@example.com" readonly />
          <input id="password" name="password" type="password" value="" />
          <input type="hidden" id="id-hidden-input" name="credentialId" />
        </form>
      </body></html>
    `;

    // HTTP sequence
    // 1) GET authorize -> 200 firstHtml
    gotGet
      .mockResolvedValueOnce({ statusCode: 200, body: firstHtml })
      // 2) GET authorize (after login) -> 302 admin code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=admin-code&state=state` },
      })
      // 3) GET authorize (user, after impersonation) -> 302 user code
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=user-code&state=state` },
      });

    // POSTs
    // 1) POST username-only -> 200 with second form in body
    gotPost
      .mockResolvedValueOnce({ statusCode: 200, body: secondHtml })
      // 2) POST password form -> 302
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: '/continue' },
      })
      // 3) POST impersonation -> 200 OK
      .mockResolvedValueOnce({ statusCode: 200 });

    grantQueue.push(
      { access_token: 'admin-access', expires_in: 3600, refresh_token: 'r1' },
      { access_token: 'user-access', expires_in: 3600 },
    );

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    const svc = await ImpersonationThirdParty.fromRequest();

    // Ensure user lookup succeeds
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async (params: any) => {
        if (
          params?.email === 'target.user@example.com' &&
          params?.exact === true
        ) {
          return [{ id: 'target-user-id' }];
        }
        return [];
      },
    );

    const token = await svc!.getImpersonatedToken();
    expect(token).toBe('user-access');

    // Assert POST call details
    expect(gotPost).toHaveBeenCalledTimes(3);
    const firstPostArgs = gotPost.mock.calls[0];
    expect(firstPostArgs[0]).toContain(
      '/realms/test/login-actions/authenticate?execution=exec1',
    );
    expect(String(firstPostArgs[1].body)).toContain(
      'username=admin%40example.com',
    );

    const secondPostArgs = gotPost.mock.calls[1];
    expect(secondPostArgs[0]).toContain(
      '/realms/test/login-actions/authenticate?execution=exec2',
    );
    expect(String(secondPostArgs[1].body)).toContain('password=');
    expect(String(secondPostArgs[1].body)).toContain('credentialId=');
  });

  test('error: target user not found', async () => {
    // Arrange auth() to return a session with user info
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'missing.user@example.com',
        name: 'Admin User',
      },
    });

    // HTTP: admin login flow still succeeds
    const loginHtml = `<form action="/realms/test/login-actions/authenticate"><input type="hidden" name="client_id" value="test-client-id" /></form>`;
    gotGet
      .mockResolvedValueOnce({ statusCode: 200, body: loginHtml })
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=admin-code&state=state` },
      });
    gotPost.mockResolvedValueOnce({
      statusCode: 302,
      headers: { location: '/continue' },
    });

    grantQueue.push({ access_token: 'admin-access', expires_in: 3600 });

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    // Create service, then set admin users.find to return empty -> user not found
    const svc = await ImpersonationThirdParty.fromRequest();
    (lastKcAdminInstance.users.find as jest.Mock).mockResolvedValue([]);
    await expect(svc!.getImpersonatedToken()).rejects.toThrow(
      /target user not found/,
    );
  });

  test('error: missing impersonator credentials (Authorization Code flow)', async () => {
    // Arrange a valid session
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
      },
    });

    // Remove impersonator credentials from env (fromRequest should still construct, but getImpersonatedToken will fail)
    delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME;
    delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD;

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    const svc = await ImpersonationThirdParty.fromRequest();
    expect(svc).toBeTruthy();

    await expect(svc!.getImpersonatedToken()).rejects.toThrow(
      /missing impersonator credentials/i,
    );
  });

  test('error: admin login page parse fails (no form action)', async () => {
    // Arrange session
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
      },
    });

    // First authorize returns HTML without a <form>
    gotGet.mockResolvedValueOnce({
      statusCode: 200,
      body: '<html>no form here</html>',
    });

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    const svc = await ImpersonationThirdParty.fromRequest();
    await expect(svc!.getImpersonatedToken()).rejects.toThrow(
      /unable to locate login form action/i,
    );
  });

  test('error: authorize after impersonation did not return 302', async () => {
    // Arrange session
    (auth as jest.Mock).mockResolvedValue({
      user: {
        id: 'admin-user-id',
        subject: 'admin-sub',
        email: 'target.user@example.com',
        name: 'Admin User',
      },
    });

    // Build login page HTML with a simple form
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

    // Sequence: GET authorize -> 200 login page, POST login -> 302, GET authorize -> 302 with admin code,
    // POST impersonation -> 200, GET authorize for user -> 200 (unexpected, should be 302)
    gotGet
      .mockResolvedValueOnce({ statusCode: 200, body: loginHtml })
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: `${redirectUri}?code=admin-code&state=state` },
      })
      .mockResolvedValueOnce({ statusCode: 200, body: 'unexpected ok' });

    gotPost
      .mockResolvedValueOnce({
        statusCode: 302,
        headers: { location: '/continue' },
      })
      .mockResolvedValueOnce({ statusCode: 200 });

    // authorizationCodeGrant for admin only (user path will error before usage)
    grantQueue.push({ access_token: 'admin-access', expires_in: 3600 });

    const { ImpersonationThirdParty } = await import(
      '@/lib/auth/impersonation/impersonation.thirdparty'
    );
    const svc = await ImpersonationThirdParty.fromRequest();
    // Ensure user lookup succeeds to reach authorizeAndExchange
    (lastKcAdminInstance.users.find as jest.Mock).mockImplementation(
      async (params: any) => {
        if (
          params?.email === 'target.user@example.com' &&
          params?.exact === true
        ) {
          return [{ id: 'target-user-id' }];
        }
        return [];
      },
    );

    await expect(svc!.getImpersonatedToken()).rejects.toThrow(
      /expected 302 from authorize/i,
    );
  });
});
