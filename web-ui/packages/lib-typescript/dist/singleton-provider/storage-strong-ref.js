import { log, getStackTrace } from "@compliance-theater/logger";
const STORED_MAP_KEY = Symbol.for(
  "@no-education/typescript/SingletonProvider/StrongReferenceStorage/GlobalMap"
);
export class StrongReferenceStorage {
  #keys = new Set();
  get #global() {
    const globalThat = globalThis;
    if (!globalThat[STORED_MAP_KEY]) {
      globalThat[STORED_MAP_KEY] = new Map();
    }
    return globalThat[STORED_MAP_KEY];
  }
  get(key) {
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
  set(key, value) {
    if (!Symbol.keyFor(key)) {
      log((l) =>
        l.warn(
          `StrongReferenceStorage.get called with non-global symbol key: ${String(
            key
          )}\n${getStackTrace({ skip: 2, myCodeOnly: true })}`
        )
      );
    }
    this.#global.set(key, value);
    this.#keys.add(key);
  }
  has(key) {
    return this.#global.has(key);
  }
  delete(key) {
    this.#global.delete(key);
    this.#keys.delete(key);
  }
  clear() {
    [...Array.from(this.#keys)].forEach((key) => {
      this.#global.delete(key);
      this.#keys.delete(key);
    });
  }
}
