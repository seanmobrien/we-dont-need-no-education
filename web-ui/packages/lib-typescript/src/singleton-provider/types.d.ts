/**
 * Type declarations for singleton provider types.
 *
 * This module defines the core type system for the singleton provider implementation,
 * including configuration options, storage strategies, and internal type utilities.
 *
 * @module @compliance-theater/typescript/singleton-provider/types
 */

declare module "@compliance-theater/typescript/singleton-provider/types" {
  /**
   * Configuration options for singleton pattern implementations.
   *
   * This type defines optional configuration parameters for singleton creation and
   * management, particularly focusing on memory management strategies. The configuration
   * allows tuning the singleton behavior for different use cases and performance requirements.
   *
   * @typedef {Object} SingletonConfig
   *
   * @property {boolean} [weakRef] - Optional flag indicating whether to use WeakRef
   *   for singleton storage. When enabled, singletons can be garbage collected if
   *   no other references exist, preventing memory leaks in long-running applications.
   *   When disabled, singletons are stored with strong references and persist until
   *   explicitly cleared. Defaults to false for backward compatibility.
   *
   * @example
   * ```typescript
   * // Standard singleton with strong references
   * const standardConfig: SingletonConfig = {
   *   weakRef: false
   * };
   *
   * // Memory-efficient singleton with weak references
   * const memoryEfficientConfig: SingletonConfig = {
   *   weakRef: true
   * };
   *
   * // Default configuration (equivalent to not specifying config)
   * const defaultConfig: SingletonConfig = {};
   * ```
   *
   * @see {@link globalSingleton} in `@compliance-theater/typescript/generics.ts` for singleton implementation
   * @since 1.0.0
   */
  export type SingletonConfig = {
    weakRef?: boolean;
  };

  /**
   * Key type used for singleton storage strategies.
   * All singleton keys are symbols to prevent naming collisions.
   */
  export type SingletonStorageKey = symbol;

  /**
   * Interface defining the storage strategy for singleton instances.
   * This interface abstracts the underlying storage mechanism, allowing
   * for different implementations such as in-memory maps, weak maps, or
   * custom storage solutions.
   * @internal
   * @since 1.0.0
   * @version 1.0.0
   * @example
   * ```typescript
   * // Example implementation using a simple Map
   * class MapStorageStrategy implements SingletonStorageStrategy {
   *   private storage = new Map<SingletonStorageKey, unknown>();
   *   get(key: SingletonStorageKey): unknown | undefined {
   *     return this.storage.get(key);
   *   }
   *   set(key: SingletonStorageKey, value: unknown): void {
   *     this.storage.set(key, value);
   *   }
   *   has(key: SingletonStorageKey): boolean {
   *     return this.storage.has(key);
   *   }
   *   delete(key: SingletonStorageKey): void {
   *     this.storage.delete(key);
   *   }
   *   clear(): void {
   *     this.storage.clear();
   *   }
   * }
   * ```
   *
   */
  export interface SingletonStorageStrategy {
    /**
     * Retrieves a singleton instance from storage.
     *
     * @param key - The unique symbol key identifying the singleton
     * @returns The stored instance, or undefined if not found
     */
    get(key: SingletonStorageKey): unknown | undefined;

    /**
     * Stores a singleton instance.
     *
     * @param key - The unique symbol key to store the instance under
     * @param value - The singleton instance to store
     */
    set(key: SingletonStorageKey, value: unknown): void;

    /**
     * Checks if a singleton instance exists in storage.
     *
     * @param key - The key to check
     * @returns True if an instance exists for the key, false otherwise
     */
    has(key: SingletonStorageKey): boolean;

    /**
     * Removes a singleton instance from storage.
     *
     * @param key - The key of the singleton to remove
     */
    delete(key: SingletonStorageKey): void;

    /**
     * Removes all singleton instances from storage.
     */
    clear(): void;
  }

  /**
   * Extended global object type with singleton storage capabilities.
   *
   * This utility type extends the globalThis object to include optional properties
   * for storing singleton instances keyed by symbols. It provides type-safe access
   * to globally stored singletons while maintaining compatibility with the standard
   * global object interface.
   *
   * @internal
   * @template T - The type of singleton value stored globally
   * @template S - The symbol type used as the storage key
   *
   * @example
   * ```typescript
   * const mySymbol = Symbol.for('my-singleton');
   * const global = globalThis as GlobalWithMyGlobal<MyService, typeof mySymbol>;
   * global[mySymbol] = new MyService();
   * ```
   */
  export type GlobalWithMyGlobal<T, S extends symbol> = typeof globalThis & {
    [K in S]?: T;
  };
}
