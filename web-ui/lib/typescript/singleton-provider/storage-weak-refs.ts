import { SingletonStorageKey, SingletonStorageStrategy } from './types';

export class WeakReferenceStorage implements SingletonStorageStrategy {
  #refs: Map<SingletonStorageKey, WeakRef<object>> = new Map();

  get(key: SingletonStorageKey): unknown | undefined {
    const ref = this.#refs.get(key);
    const value = ref?.deref();
    if (value === undefined) {
      this.#refs.delete(key);
    }
    return value;
  }

  set(key: SingletonStorageKey, value: unknown): void {
    if (typeof value !== 'object' || value === null) {
      throw new TypeError(
        'Weak reference singletons require a non-null object value.',
      );
    }
    this.#refs.set(key, new WeakRef(value));
  }

  has(key: SingletonStorageKey): boolean {
    const ref = this.#refs.get(key);
    const value = ref?.deref();
    if (value === undefined) {
      this.#refs.delete(key);
      return false;
    }
    return true;
  }

  delete(key: SingletonStorageKey): void {
    this.#refs.delete(key);
  }

  clear(): void {
    this.#refs.clear();
  }
}
