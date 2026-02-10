import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';

const LOCAL_FETCH: unique symbol = Symbol(
  '@no-education/nextjs-util/dynamic-fetch/fetch'
);
type FetchImp = typeof globalThis.fetch;

/**
 * Loads the appropriate fetch implementation for the current environment.
 * @returns A promise that resolves to the fetch implementation.
 */
const loadFetchFactory = (): (() => Promise<FetchImp>) => {
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs') {
    const serverFetchFactory: () => Promise<FetchImp> = async () => {
      const serverFetch = await import('./server/fetch');
      return serverFetch.fetch;
    };
    return serverFetchFactory;
  } else {
    const clientFetchFactory: () => Promise<FetchImp> = async () => {
      const clientFetch = await import('./fetch');
      return clientFetch.fetch;
    };
    return clientFetchFactory;
  }
};

/**
 * Provides a compile-time safe environment-appropriate fetch implementation.
 * @param args Arguments to pass to the fetch implementation.
 * @returns The result of the fetch implementation.
 */
export const localFetch: FetchImp = async (...args: Parameters<FetchImp>) => {
  const fetch = await SingletonProvider.Instance.getOrCreateAsync(
    LOCAL_FETCH,
    loadFetchFactory()
  );
  if (!fetch) {
    throw new Error('Fetch not found');
  }
  return fetch(...args);
};

export { localFetch as fetch };
