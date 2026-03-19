describe('@compliance-theater/react-query-compat peer safety', () => {
  afterEach(() => {
    jest.resetModules();
    jest.unmock('@tanstack/react-query');
  });

  it('imports the contract surface without touching the TanStack peer', async () => {
    jest.doMock('@tanstack/react-query', () => {
      throw new Error('peer should not load for contract imports');
    });

    await expect(import('../src/index')).resolves.toMatchObject({
      MissingReactQueryPeerError: expect.any(Function),
    });
  });

  it('throws a clear compat error when runtime integration is used without the peer', async () => {
    jest.doMock('@tanstack/react-query', () => {
      const error = new Error("Cannot find module '@tanstack/react-query'");
      Object.assign(error, { code: 'MODULE_NOT_FOUND' });
      throw error;
    });

    const runtime = await import('../src/runtime');

    expect(() => new runtime.QueryClient()).toThrow(
      runtime.MissingReactQueryPeerError,
    );
    expect(() => new runtime.QueryClient()).toThrow(
      'React Query runtime is unavailable.',
    );
  });
});
