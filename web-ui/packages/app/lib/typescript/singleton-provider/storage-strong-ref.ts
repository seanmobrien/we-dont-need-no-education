/**
 * @fileoverview Strong reference storage implementation for singleton management.
 *
 * This module provides a storage strategy that maintains strong references to singleton
 * instances on the global object. Unlike weak references, strong references prevent
 * garbage collection, ensuring singletons persist for the lifetime of the application.
 *
 * This is the recommended storage strategy for most singleton use cases where you want
 * guaranteed persistence and don't need automatic cleanup.
 *
 * @module lib/typescript/singleton-provider/storage-strong-ref
 * @see {@link SingletonStorageStrategy} for the interface this implements
 */

import { log } from '@repo/lib-logger';
import {
  GlobalWithMyGlobal,
  SingletonStorageKey,
  SingletonStorageStrategy,
} from './types';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';

const STORED_MAP_KEY = Symbol.for(
  '@no-education/typescript/SingletonProvider/StrongReferenceStorage/GlobalMap',
);
type StoredMapKeyType = typeof STORED_MAP_KEY;

export class StrongReferenceStorage implements SingletonStorageStrategy {
  #keys: Set<SingletonStorageKey> = new Set();

  get #global() {
    const globalThat = globalThis as GlobalWithMyGlobal<
      Map<SingletonStorageKey, unknown>,
      StoredMapKeyType
    >;
    if (!globalThat[STORED_MAP_KEY]) {
      globalThat[STORED_MAP_KEY] = new Map<SingletonStorageKey, unknown>();
    }
    return globalThat[STORED_MAP_KEY];
  }

  get(key: SingletonStorageKey): unknown | undefined {
    if (!Symbol.keyFor(key)) {
      log((l) =>
        l.warn(
          `StrongReferenceStorage.get called with non-global symbol key: ${String(key)}\n${getStackTrace({ skip: 2, myCodeOnly: true })}`,
        ),
      );
    }
    return this.#global.get(key);
  }

  set(key: SingletonStorageKey, value: unknown): void {
    if (!Symbol.keyFor(key)) {
      log((l) =>
        l.warn(
          `StrongReferenceStorage.get called with non-global symbol key: ${String(key)}\n${getStackTrace({ skip: 2, myCodeOnly: true })}`,
        ),
      );
    }
    this.#global.set(key, value);
    this.#keys.add(key);
  }

  has(key: SingletonStorageKey): boolean {
    return this.#global.has(key);
  }

  delete(key: SingletonStorageKey): void {
    this.#global.delete(key);
    this.#keys.delete(key);
  }

  clear(): void {
    [...Array.from(this.#keys)].forEach((key) => {
      this.#global.delete(key);
      this.#keys.delete(key);
    });
  }
}
