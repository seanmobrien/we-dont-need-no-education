/**
 * Type declarations for weak reference singleton storage.
 *
 * @fileoverview Weak reference storage implementation for singleton management.
 *
 * This module provides a storage strategy that maintains weak references to singleton
 * instances using JavaScript's WeakRef. Unlike strong references, weak references allow
 * instances to be garbage collected when no other strong references exist, preventing
 * memory leaks in long-running applications.
 *
 * This storage strategy is recommended for:
 * - Large objects that should be collected when not in active use
 * - Caches that can be regenerated if needed
 * - Optional services that don't need guaranteed persistence
 *
 * @module lib/typescript/singleton-provider/storage-weak-ref
 * @see {@link SingletonStorageStrategy} for the interface this implements
 */

import type { SingletonStorageKey, SingletonStorageStrategy } from "./types";

declare module "@/lib/typescript/singleton-provider/storage-weak-ref" {
  /**
   * Storage strategy using weak references for automatic garbage collection.
   *
   * This class stores singleton instances using WeakRef, allowing them to be garbage
   * collected when no other strong references exist. The storage automatically cleans
   * up dereferenced instances when accessed.
   *
   * Key characteristics:
   * - **Weak references**: Instances can be garbage collected when not strongly referenced elsewhere
   * - **Automatic cleanup**: Dead references are removed when accessed
   * - **Memory efficient**: Prevents memory leaks for large or temporary singletons
   * - **Object-only**: Only accepts non-null object values (WeakRef limitation)
   *
   * @implements {SingletonStorageStrategy}
   *
   * @example
   * ```typescript
   * const storage = new WeakReferenceStorage();
   * const myKey = Symbol('cache');
   *
   * // Store a cache object
   * const cache = new Map();
   * storage.set(myKey, cache);
   *
   * // Access the cache
   * const retrieved = storage.get(myKey); // Returns the Map
   *
   * // If cache is GC'd and no other references exist:
   * // cache = null;
   * // ... garbage collection occurs ...
   * // storage.get(myKey); // Returns undefined
   * ```
   *
   * @example
   * ```typescript
   * // Common use case: temporary caches
   * const tempCache = new Map();
   * storage.set(Symbol('temp'), tempCache);
   *
   * // Use the cache...
   * tempCache.set('key', 'value');
   *
   * // When tempCache goes out of scope and is GC'd,
   * // the singleton storage automatically cleans up
   * ```
   */
  export class WeakReferenceStorage implements SingletonStorageStrategy {
    /**
     * Retrieves a singleton instance from weak reference storage.
     *
     * If the weak reference has been garbage collected, this method returns undefined
     * and automatically removes the dead reference from storage.
     *
     * @param {SingletonStorageKey} key - The unique key identifying the singleton
     * @returns {unknown | undefined} The stored instance if still alive, undefined if garbage collected or not found
     *
     * @example
     * ```typescript
     * const key = Symbol('service');
     * const service = new Service();
     * storage.set(key, service);
     *
     * const retrieved = storage.get(key); // Returns service if still referenced
     *
     * // If service was garbage collected:
     * const missing = storage.get(key); // Returns undefined, cleans up entry
     * ```
     */
    get(key: SingletonStorageKey): unknown | undefined;

    /**
     * Stores a singleton instance using weak reference semantics.
     *
     * The instance must be a non-null object (WeakRef limitation). It will be held
     * weakly and can be garbage collected when no other strong references exist.
     *
     * @param {SingletonStorageKey} key - The unique key to store the instance under
     * @param {unknown} value - The singleton instance to store (must be a non-null object)
     * @throws {TypeError} If value is not a non-null object
     *
     * @example
     * ```typescript
     * const key = Symbol('cache');
     * const cache = new Map();
     * storage.set(key, cache); // OK: Map is an object
     * ```
     *
     * @example
     * ```typescript
     * // These will throw TypeError:
     * storage.set(Symbol('num'), 42); // Error: primitives not allowed
     * storage.set(Symbol('str'), 'text'); // Error: primitives not allowed
     * storage.set(Symbol('null'), null); // Error: null not allowed
     * ```
     */
    set(key: SingletonStorageKey, value: unknown): void;

    /**
     * Checks if a singleton instance exists and is still alive.
     *
     * Returns false if the instance was garbage collected, and automatically
     * removes the dead reference from storage.
     *
     * @param {SingletonStorageKey} key - The key to check
     * @returns {boolean} True if an alive instance exists, false if not found or garbage collected
     *
     * @example
     * ```typescript
     * const key = Symbol('service');
     * storage.has(key); // false - not yet created
     *
     * storage.set(key, new Service());
     * storage.has(key); // true - instance exists
     *
     * // After garbage collection:
     * storage.has(key); // false - instance was collected, entry cleaned up
     * ```
     */
    has(key: SingletonStorageKey): boolean;

    /**
     * Removes a singleton weak reference from storage.
     *
     * Removes the weak reference immediately, allowing the instance to be
     * garbage collected if no other references exist.
     *
     * @param {SingletonStorageKey} key - The key of the singleton to remove
     *
     * @example
     * ```typescript
     * const key = Symbol('cache');
     * storage.set(key, new Map());
     * storage.delete(key); // Removes weak reference
     * storage.get(key); // undefined
     * ```
     */
    delete(key: SingletonStorageKey): void;

    /**
     * Removes all weak references from storage.
     *
     * Clears the internal map of weak references, allowing all weakly-held
     * instances to be garbage collected if no other references exist.
     *
     * @example
     * ```typescript
     * storage.set(Symbol('cache1'), new Map());
     * storage.set(Symbol('cache2'), new Map());
     * storage.clear(); // Removes all weak references
     * ```
     *
     * @example
     * ```typescript
     * // Test cleanup pattern
     * afterEach(() => {
     *   storage.clear(); // Allow all test singletons to be GC'd
     * });
     * ```
     */
    clear(): void;
  }
}
