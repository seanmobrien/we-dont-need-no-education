describe('@compliance-theater/auth-compat peer safety', () => {
  const unmockIfResolvable = (moduleName: string) => {
    try {
      jest.unmock(moduleName);
    } catch (error) {
      if ((error as { code?: string }).code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  };

  afterEach(() => {
    jest.resetModules();
    unmockIfResolvable('next-auth');
    unmockIfResolvable('next-auth/providers/keycloak');
    unmockIfResolvable('@auth/core');
    unmockIfResolvable('@auth/drizzle-adapter');
  });

  it('imports the contract surface without touching any peer', async () => {
    jest.doMock('next-auth', () => {
      throw new Error('peer should not load for contract imports');
    }, { virtual: true });
    jest.doMock('@auth/core', () => {
      throw new Error('peer should not load for contract imports');
    }, { virtual: true });
    jest.doMock('@auth/drizzle-adapter', () => {
      throw new Error('peer should not load for contract imports');
    }, { virtual: true });

    await expect(import('../src/index')).resolves.toMatchObject({
      MissingNextAuthPeerError: expect.any(Function),
      MissingAuthCorePeerError: expect.any(Function),
      MissingDrizzleAdapterPeerError: expect.any(Function),
    });
  });

  it('throws MissingNextAuthPeerError when next-auth is unavailable', async () => {
    jest.doMock('next-auth', () => {
      const error = new Error("Cannot find module 'next-auth'");
      Object.assign(error, { code: 'MODULE_NOT_FOUND' });
      throw error;
    }, { virtual: true });

    const runtime = await import('../src/runtime');

    expect(() => runtime.createNextAuth({})).toThrow(
      runtime.MissingNextAuthPeerError,
    );
  });

  it('initialises NextAuth when the peer exposes a callable module export', async () => {
    const result = { handlers: {}, auth: jest.fn() };
    const nextAuth = jest.fn(() => result);
    jest.doMock('next-auth', () => nextAuth, { virtual: true });

    const runtime = await import('../src/runtime');

    expect(runtime.createNextAuth({})).toBe(result);
    expect(nextAuth).toHaveBeenCalledWith({});
  });

  it('initialises NextAuth when the peer exposes a nested default export', async () => {
    const result = { handlers: {}, auth: jest.fn() };
    const nextAuth = jest.fn(() => result);
    jest.doMock('next-auth', () => ({ default: { default: nextAuth } }), { virtual: true });

    const runtime = await import('../src/runtime');

    expect(runtime.createNextAuth({})).toBe(result);
    expect(nextAuth).toHaveBeenCalledWith({});
  });

  it('loads Keycloak when the provider peer exposes a callable module export', async () => {
    const provider = { id: 'keycloak' };
    const keycloak = jest.fn(() => provider);
    jest.doMock('next-auth/providers/keycloak', () => keycloak, { virtual: true });

    const runtime = await import('../src/runtime');

    expect(runtime.createKeycloakProvider({ clientId: 'id' })).toBe(provider);
    expect(keycloak).toHaveBeenCalledWith({ clientId: 'id' });
  });

  it('throws MissingAuthCorePeerError when @auth/core is unavailable', async () => {
    jest.doMock('@auth/core', () => {
      const error = new Error("Cannot find module '@auth/core'");
      Object.assign(error, { code: 'MODULE_NOT_FOUND' });
      throw error;
    }, { virtual: true });

    const runtime = await import('../src/runtime');

    await expect(
      runtime.Auth(new Request('http://localhost/'), {}),
    ).rejects.toThrow(runtime.MissingAuthCorePeerError);
  });

  it('throws MissingDrizzleAdapterPeerError when @auth/drizzle-adapter is unavailable', async () => {
    jest.doMock('@auth/drizzle-adapter', () => {
      const error = new Error("Cannot find module '@auth/drizzle-adapter'");
      Object.assign(error, { code: 'MODULE_NOT_FOUND' });
      throw error;
    }, { virtual: true });

    const runtime = await import('../src/runtime');

    expect(() => runtime.createDrizzleAdapter({})).toThrow(
      runtime.MissingDrizzleAdapterPeerError,
    );
  });
});
