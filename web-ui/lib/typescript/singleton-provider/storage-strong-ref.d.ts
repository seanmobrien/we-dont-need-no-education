/**
 * Type declarations for strong reference singleton storage.
 *
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

declare module '@/lib/typescript/singleton-provider/storage-strong-ref' {
  import type {
    SingletonStorageKey,
    SingletonStorageStrategy,
  } from '@/lib/typescript/singleton-provider/types';

  /**
   * Storage strategy using strong references on the global object.
   *
   * This class stores singleton instances directly on `globalThis`, maintaining strong
   * references that prevent garbage collection. It tracks all keys internally to enable
   * cleanup operations.
   *
   * Key characteristics:
   * - **Strong references**: Instances are never garbage collected until explicitly deleted
   * - **Global persistence**: Instances persist across module reloads (in dev environments)
   * - **Manual cleanup**: Provides clear() method to remove all tracked instances
   * - **Key tracking**: Maintains internal set of keys for efficient bulk operations
   *
   * @implements {SingletonStorageStrategy}
   *
   * @example
   * const storage = new StrongReferenceStorage();
   * const myKey = Symbol('myService');
   * storage.set(myKey, { data: 'value' });
   * const instance = storage.get(myKey); // Returns the stored object
   * storage.has(myKey); // true
   * storage.delete(myKey); // Removes the instance
   *
   * @example
   * // Bulk cleanup
   * storage.set(Symbol('service1'), service1);
   * storage.set(Symbol('service2'), service2);
   * storage.clear(); // Removes all tracked instances
   */
  export class StrongReferenceStorage implements SingletonStorageStrategy {
    /**
     * Retrieves a singleton instance from storage.
     *
     * @param {SingletonStorageKey} key - The unique key (typically a Symbol) identifying the singleton
     * @returns {unknown | undefined} The stored instance, or undefined if not found
     *
     * @example
     * const myKey = Symbol('myService');
     * storage.set(myKey, myService);
     * const instance = storage.get(myKey); // Returns myService
     * const missing = storage.get(Symbol('notFound')); // Returns undefined
     */
    get(key: SingletonStorageKey): unknown | undefined;

    /**
     * Stores a singleton instance with strong reference semantics.
     *
     * The instance is stored directly on the global object and will not be garbage
     * collected until explicitly deleted. The key is tracked internally for cleanup operations.
     *
     * @param {SingletonStorageKey} key - The unique key (typically a Symbol) to store the instance under
     * @param {unknown} value - The singleton instance to store
     * @returns {void}
     *
     * @example
     * const myKey = Symbol('myService');
     * const myService = new MyService();
     * storage.set(myKey, myService); // Stores with strong reference
     *
     * @example
     * // Updating an existing singleton
     * storage.set(myKey, oldInstance);
     * storage.set(myKey, newInstance); // Replaces the old instance
     */
    set(key: SingletonStorageKey, value: unknown): void;

    /**
     * Checks if a singleton instance exists in storage.
     *
     * @param {SingletonStorageKey} key - The key to check
     * @returns {boolean} True if an instance exists for the key, false otherwise
     *
     * @example
     * const myKey = Symbol('myService');
     * storage.has(myKey); // false
     * storage.set(myKey, myService);
     * storage.has(myKey); // true
     * storage.delete(myKey);
     * storage.has(myKey); // false
     *
     * @note Returns false for keys that were set to undefined
     */
    has(key: SingletonStorageKey): boolean;

    /**
     * Removes a singleton instance from storage.
     *
     * Deletes the instance from the global object and removes the key from internal tracking.
     * After deletion, the instance may be garbage collected if no other references exist.
     *
     * @param {SingletonStorageKey} key - The key of the singleton to remove
     * @returns {void}
     *
     * @example
     * const myKey = Symbol('myService');
     * storage.set(myKey, myService);
     * storage.delete(myKey); // Removes the singleton
     * storage.get(myKey); // Returns undefined
     *
     * @example
     * // Safe to call on non-existent keys
     * storage.delete(Symbol('nonExistent')); // No error, no-op
     */
    delete(key: SingletonStorageKey): void;

    /**
     * Removes all tracked singleton instances from storage.
     *
     * Iterates through all keys that have been set and removes them from the global object.
     * This is useful for cleanup in testing environments or when resetting application state.
     *
     * @returns {void}
     *
     * @example
     * // Cleanup all singletons
     * storage.set(Symbol('service1'), service1);
     * storage.set(Symbol('service2'), service2);
     * storage.set(Symbol('service3'), service3);
     * storage.clear(); // Removes all three services
     *
     * @example
     * // Common pattern in test cleanup
     * afterEach(() => {
     *   storage.clear(); // Reset singleton state between tests
     * });
     *
     * @note Only removes keys that were tracked by this storage instance.
     * Does not affect other global properties.
     */
    clear(): void;
  }
}
