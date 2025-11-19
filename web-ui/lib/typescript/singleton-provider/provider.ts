import { IsNotNull } from '../_types';
import { StrongReferenceStorage } from './storage-strong-ref';
import { WeakReferenceStorage } from './storage-weak-refs';
import {
  GlobalWithMyGlobal,
  SingletonConfig,
  SingletonStorageKey,
  SingletonStorageStrategy,
} from './types';

export class SingletonProvider {
  #strongStorage = new StrongReferenceStorage();
  #weakStorage = new WeakReferenceStorage();
  #storageByKey: Map<SingletonStorageKey, SingletonStorageStrategy> = new Map();
  #pendingFactories: Map<SingletonStorageKey, Promise<unknown>> = new Map();

  static get Instance(): SingletonProvider {
    const globalSymbol = Symbol.for(
      '@noeducation/lib/typescript/SingletonProvider',
    );
    const globalWithProvider = globalThis as GlobalWithMyGlobal<
      SingletonProvider,
      typeof globalSymbol
    >;
    if (!globalWithProvider[globalSymbol]) {
      globalWithProvider[globalSymbol] = new SingletonProvider();
    }
    return globalWithProvider[globalSymbol]!;
  }

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  #toStorageKey(symbol: string | symbol): SingletonStorageKey {
    return typeof symbol === 'symbol' ? symbol : Symbol.for(symbol);
  }

  #selectStorage(
    config: SingletonConfig | undefined,
  ): SingletonStorageStrategy {
    return config?.weakRef ? this.#weakStorage : this.#strongStorage;
  }

  #ensureWeakValue(value: unknown): asserts value is object {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError(
        'Weak reference singletons require a non-null object value.',
      );
    }
  }

  #lookupExisting<T>(key: SingletonStorageKey): T | undefined {
    const preferred = this.#storageByKey.get(key);
    if (preferred) {
      const result = preferred.get(key);
      if (result !== undefined) {
        return result as T;
      }
      this.#storageByKey.delete(key);
    }

    const strong = this.#strongStorage.get(key);
    if (strong !== undefined) {
      this.#storageByKey.set(key, this.#strongStorage);
      return strong as T;
    }

    const weak = this.#weakStorage.get(key);
    if (weak !== undefined) {
      this.#storageByKey.set(key, this.#weakStorage);
      return weak as T;
    }

    return undefined;
  }

  #store(
    key: SingletonStorageKey,
    storage: SingletonStorageStrategy,
    value: unknown,
  ): void {
    if (storage === this.#weakStorage) {
      this.#ensureWeakValue(value);
      this.#strongStorage.delete(key);
    } else {
      this.#weakStorage.delete(key);
    }
    storage.set(key, value);
    this.#storageByKey.set(key, storage);
  }

  get<T = unknown, S extends string | symbol = string>(
    symbol: S,
  ): T | undefined {
    const key = this.#toStorageKey(symbol);
    return this.#lookupExisting<T>(key);
  }

  getOrCreate<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config: SingletonConfig = {},
  ): T {
    const key = this.#toStorageKey(symbol);
    const existing = this.#lookupExisting<T>(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = factory();
    if (value === undefined || value === null) {
      throw new TypeError(
        'Factory for global singleton cannot return null or undefined.',
      );
    }

    const storage = this.#selectStorage(config);
    this.#store(key, storage, value);
    return value;
  }

  async getOrCreateAsync<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config: SingletonConfig = {},
  ): Promise<T> {
    const key = this.#toStorageKey(symbol);

    // Check if instance already exists
    const existing = this.#lookupExisting<T>(key);
    if (existing !== undefined) {
      return existing;
    }

    // Check if a factory is currently running for this key
    const pendingFactory = this.#pendingFactories.get(key);
    if (pendingFactory) {
      return pendingFactory as Promise<T>;
    }

    // Create new instance with factory
    const factoryPromise = (async () => {
      try {
        const value = await factory();
        if (value === undefined || value === null) {
          throw new TypeError(
            'Factory for global singleton cannot return null or undefined.',
          );
        }

        const storage = this.#selectStorage(config);
        this.#store(key, storage, value);
        return value;
      } finally {
        // Clean up pending factory tracking
        this.#pendingFactories.delete(key);
      }
    })();

    // Track the pending factory
    this.#pendingFactories.set(key, factoryPromise);

    return factoryPromise;
  }

  has<S extends string | symbol = string>(symbol: S): boolean {
    const key = this.#toStorageKey(symbol);
    const preferred = this.#storageByKey.get(key);
    if (preferred?.has(key)) {
      return true;
    }
    this.#storageByKey.delete(key);

    if (this.#strongStorage.has(key)) {
      this.#storageByKey.set(key, this.#strongStorage);
      return true;
    }

    if (this.#weakStorage.has(key)) {
      this.#storageByKey.set(key, this.#weakStorage);
      return true;
    }

    return false;
  }
  set<T, S extends string | symbol = string>(
    symbol: S,
    value: IsNotNull<T>,
    config: SingletonConfig = {},
  ): void {
    if (value === null || value === undefined) {
      throw new TypeError('Cannot set singleton value to null or undefined.');
    }

    const key = this.#toStorageKey(symbol);
    const storage = this.#selectStorage(config);
    this.#store(key, storage, value);
  }
  clear(): void {
    this.#strongStorage.clear();
    this.#weakStorage.clear();
    this.#storageByKey.clear();
  }
  delete<S extends string | symbol = string>(symbol: S): void {
    const key = this.#toStorageKey(symbol);
    this.#strongStorage.delete(key);
    this.#weakStorage.delete(key);
    this.#storageByKey.delete(key);
  }
}
