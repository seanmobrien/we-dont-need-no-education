import {
  SingletonProvider,
  globalRequiredSingleton,
  globalRequiredSingletonAsync,
  singletonProviderFactory,
} from '../src/singleton-provider';

describe('singleton-provider index exports', () => {
  beforeEach(() => {
    SingletonProvider.Instance.clear();
  });

  afterEach(() => {
    SingletonProvider.Instance.clear();
  });

  it('returns singleton provider instance from factory', () => {
    const fromFactory = singletonProviderFactory();
    expect(fromFactory).toBe(SingletonProvider.Instance);
  });

  it('throws for missing required sync singleton', () => {
    expect(() => globalRequiredSingleton('missing-sync', () => undefined)).toThrow(
      'Unable to create required global missing-sync',
    );
  });

  it('returns required sync singleton when present', () => {
    const value = globalRequiredSingleton('present-sync', () => ({ id: 1 }));
    expect(value).toEqual({ id: 1 });
  });

  it('throws for missing required async singleton', async () => {
    await expect(
      globalRequiredSingletonAsync('missing-async', async () => undefined),
    ).rejects.toThrow('Unable to create required global missing-async');
  });

  it('returns required async singleton when present', async () => {
    const value = await globalRequiredSingletonAsync('present-async', async () => ({ id: 2 }));
    expect(value).toEqual({ id: 2 });
  });
});
