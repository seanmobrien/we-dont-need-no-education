import { getStackTrace } from "@compliance-theater/types/get-stack-trace";
import { log } from "@compliance-theater/logger/core";
import {
  GlobalWithMyGlobal,
  SingletonStorageKey,
  SingletonStorageStrategy,
} from "./types";

const STORED_MAP_KEY = Symbol.for(
  "@compliance-theater/logger/singleton-provider/strong-storage-ref/GlobalMap"
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
          `StrongReferenceStorage.get called with non-global symbol key: ${String(
            key
          )}\n${getStackTrace({ skip: 2, myCodeOnly: true })}`
        )
      );
    }
    return this.#global.get(key);
  }

  set(key: SingletonStorageKey, value: unknown): void {
    if (!Symbol.keyFor(key)) {
      log((l) =>
        l.warn(
          `StrongReferenceStorage.set called with non-global symbol key: ${String(
            key
          )}\n${getStackTrace({ skip: 2, myCodeOnly: true })}`
        )
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
