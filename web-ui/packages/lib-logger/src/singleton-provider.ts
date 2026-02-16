import { log } from "./core";

type IsNotNull<K> = K extends null
  ? never
  : K extends undefined
    ? never
    : K;

export interface ISingletonProvider {
  get<T = unknown, S extends string | symbol = string>(symbol: S): T | undefined;
  getOrCreate<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config?: unknown
  ): T | undefined;
  getRequired<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config?: unknown
  ): T;
  getOrCreateAsync<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config?: unknown
  ): Promise<T | undefined>;
  getRequiredAsync<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config?: unknown
  ): Promise<T>;
  has<S extends string | symbol = string>(symbol: S): boolean;
  set<T, S extends string | symbol = string>(
    symbol: S,
    value: IsNotNull<T>,
    config?: unknown
  ): void;
  clear(): void;
  delete<S extends string | symbol = string>(symbol: S): void;
}

export const singletonProviderFactory = (): ISingletonProvider | undefined => {
  const globalSymbol = Symbol.for(
    "@noeducation/lib/typescript/SingletonProvider"
  );
  type GlobalWithSingletonGlobal = typeof globalThis & {
    [globalSymbol]?: ISingletonProvider;
  };
  const globalWithProvider = globalThis as GlobalWithSingletonGlobal;
  const existing = globalWithProvider[globalSymbol];
  if (!existing) {
      log(l => l.warn('Request for singleton provider, but none exists yet.'));
      return undefined;
  }
  return existing;
};
