import type { NextAuthConfig } from '@compliance-theater/auth-compat';

describe('auth.ts integration', () => {
  const requestUrl = 'http://localhost:3000/api/auth/session';
  const loopbackRequestUrl = 'http://127.0.0.1:3000/api/auth/session';

  const loadAuthConfig = async (runtime: 'edge' | 'node') => {
    jest.resetModules();

    const signInMock = jest.fn(async () => '/signed-in');
    const setupDrizzleAdapterMock = jest.fn(async () => ({}) as never);
    const sessionMock = jest.fn(async ({ session }) => session);
    const jwtMock = jest.fn(async ({ token }) => token);
    const redirectMock = jest.fn(async ({ url }) => url);
    const authorizedMock = jest.fn(async () => true);

    jest.doMock('@compliance-theater/auth-compat/runtime', () => ({
      __esModule: true,
      createNextAuth: () => ({
        handlers: { GET: jest.fn(), POST: jest.fn() },
        auth: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      }),
    }));

    jest.doMock('../src/lib/keycloak-provider', () => ({
      __esModule: true,
      setupKeyCloakProvider: () => [],
    }));

    jest.doMock('../src/lib/runtime-loader', () => {
      const actual = jest.requireActual('../src/lib/runtime-loader');
      return {
        __esModule: true,
        ...actual,
        getRuntimeTarget: () => runtime,
      };
    });

    jest.doMock('../src/lib/auth-callback-loaders', () => {
      const actual = jest.requireActual('../src/lib/auth-callback-loaders');
      return {
        __esModule: true,
        ...actual,
        authCallbackLoaderSpecs: {
          drizzleAdapter: {
            loaders: {
              node: async () => ({
                setupDrizzleAdapter: setupDrizzleAdapterMock,
              }),
            },
            isValid: (value: { setupDrizzleAdapter?: unknown } | undefined) =>
              typeof value?.setupDrizzleAdapter === 'function',
          },
          signIn: {
            loaders: {
              node: async () => ({ signIn: signInMock }),
            },
            isValid: (value: { signIn?: unknown } | undefined) =>
              typeof value?.signIn === 'function',
          },
          session: {
            loaders: {
              edge: async () => ({ session: sessionMock }),
              node: async () => ({ session: sessionMock }),
            },
            isValid: (value: { session?: unknown } | undefined) =>
              typeof value?.session === 'function',
          },
          jwt: {
            loaders: {
              edge: async () => ({
                jwt: async ({ token, user }: { token: Record<string, unknown>; user?: { id?: string } }) => ({
                  ...token,
                  edge: true,
                  id: user?.id,
                }),
              }),
              node: async () => ({ jwt: jwtMock }),
            },
            isValid: (value: { jwt?: unknown } | undefined) =>
              typeof value?.jwt === 'function',
          },
          redirect: {
            loaders: {
              default: async () => ({ redirect: redirectMock }),
            },
            isValid: (value: { redirect?: unknown } | undefined) =>
              typeof value?.redirect === 'function',
          },
          authorized: {
            loaders: {
              default: async () => ({ authorized: authorizedMock }),
            },
            isValid: (value: { authorized?: unknown } | undefined) =>
              typeof value?.authorized === 'function',
          },
        },
      };
    });

    jest.doMock('@compliance-theater/env', () => ({
      __esModule: true,
      env: (key: string) => {
        if (key === 'NEXTAUTH_URL') return 'http://localhost:3000';
        if (key === 'NEXTAUTH_TRUST_HOST') return false;
        return undefined;
      },
      isRunningOnEdge: () => runtime === 'edge',
    }));

    let authModule:
      | typeof import('../src/auth.node')
      | undefined;

    await jest.isolateModulesAsync(async () => {
      authModule = jest.requireActual('../src/auth.node') as typeof import('../src/auth.node');
    });

    if (!authModule?.buildNextAuthConfig) {
      throw new Error('Expected auth.ts to export buildNextAuthConfig');
    }

    const config = await authModule.buildNextAuthConfig({
      url: requestUrl,
    } as Request);

    return {
      config,
      mocks: {
        signInMock,
        setupDrizzleAdapterMock,
        sessionMock,
        jwtMock,
        redirectMock,
        authorizedMock,
      },
    };
  };

  it('uses node-only adapter and signIn callback on node runtime', async () => {
    const { config, mocks } = await loadAuthConfig('node');

    expect(mocks.setupDrizzleAdapterMock).toHaveBeenCalledTimes(1);
    expect(config.adapter).toBeDefined();
    expect(config.callbacks?.signIn).toBe(mocks.signInMock);
    expect(config.callbacks?.jwt).toBe(mocks.jwtMock);
    expect(config.callbacks?.session).toBe(mocks.sessionMock);
    expect(config.callbacks?.redirect).toBe(mocks.redirectMock);
    expect(config.callbacks?.authorized).toBe(mocks.authorizedMock);
  });

  it('uses edge jwt callback and noop signIn on edge runtime', async () => {
    const { config, mocks } = await loadAuthConfig('edge');

    expect(mocks.setupDrizzleAdapterMock).not.toHaveBeenCalled();
    expect(config.adapter).toBeUndefined();
    expect(config.callbacks?.signIn).not.toBe(mocks.signInMock);

    const signInCallback = config.callbacks?.signIn as
      | ((params: unknown) => Promise<boolean | string>)
      | undefined;
    const jwtCallback = config.callbacks?.jwt as
      | ((params: unknown) => Promise<unknown>)
      | undefined;

    const signInResult = await signInCallback?.({
      user: { id: 'user-1' },
    } as never);
    expect(signInResult).toBe(false);

    const jwtResult = await jwtCallback?.({
      token: { sub: '123' },
      user: { id: 'edge-user' },
    } as never);
    expect(jwtResult).toMatchObject({
      sub: '123',
      edge: true,
      id: 'edge-user',
    });
    expect(mocks.jwtMock).not.toHaveBeenCalled();
  });

  it('trusts loopback hosts during local development', async () => {
    jest.resetModules();

    jest.doMock('@compliance-theater/auth-compat/runtime', () => ({
      __esModule: true,
      createNextAuth: () => ({
        handlers: { GET: jest.fn(), POST: jest.fn() },
        auth: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      }),
    }));

    jest.doMock('../src/lib/keycloak-provider', () => ({
      __esModule: true,
      setupKeyCloakProvider: () => [],
    }));

    jest.doMock('../src/lib/runtime-loader', () => {
      const actual = jest.requireActual('../src/lib/runtime-loader');
      return {
        __esModule: true,
        ...actual,
        getRuntimeTarget: () => 'node',
      };
    });

    jest.doMock('../src/lib/auth-callback-loaders', () => ({
      __esModule: true,
      authCallbackLoaderSpecs: {
        drizzleAdapter: {
          loaders: { node: async () => ({ setupDrizzleAdapter: async () => ({}) }) },
          isValid: (value: { setupDrizzleAdapter?: unknown } | undefined) =>
            typeof value?.setupDrizzleAdapter === 'function',
        },
        signIn: {
          loaders: { node: async () => ({ signIn: async () => true }) },
          isValid: (value: { signIn?: unknown } | undefined) =>
            typeof value?.signIn === 'function',
        },
        session: {
          loaders: { node: async () => ({ session: async ({ session }: { session: unknown }) => session }) },
          isValid: (value: { session?: unknown } | undefined) =>
            typeof value?.session === 'function',
        },
        jwt: {
          loaders: { node: async () => ({ jwt: async ({ token }: { token: unknown }) => token }) },
          isValid: (value: { jwt?: unknown } | undefined) =>
            typeof value?.jwt === 'function',
        },
        redirect: {
          loaders: { default: async () => ({ redirect: async ({ url }: { url: string }) => url }) },
          isValid: (value: { redirect?: unknown } | undefined) =>
            typeof value?.redirect === 'function',
        },
        authorized: {
          loaders: { default: async () => ({ authorized: async () => true }) },
          isValid: (value: { authorized?: unknown } | undefined) =>
            typeof value?.authorized === 'function',
        },
      },
    }));

    jest.doMock('@compliance-theater/env', () => ({
      __esModule: true,
      env: (key: string) => {
        if (key === 'NEXTAUTH_URL') return 'http://localhost:3000';
        if (key === 'NEXTAUTH_TRUST_HOST') return false;
        return undefined;
      },
      isRunningOnEdge: () => false,
    }));

    let authModule: typeof import('../src/auth.node') | undefined;

    await jest.isolateModulesAsync(async () => {
      authModule = jest.requireActual('../src/auth.node') as typeof import('../src/auth.node');
    });

    if (!authModule?.buildNextAuthConfig) {
      throw new Error('Expected auth.ts to export buildNextAuthConfig');
    }

    const config = await authModule.buildNextAuthConfig({
      url: loopbackRequestUrl,
    } as Request);

    expect(config.trustHost).toBe(true);
  });
});