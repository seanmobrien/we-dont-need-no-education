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
 * @see {@link globalSingleton} in `/lib/typescript/_generics.ts` for singleton implementation
 * @since 1.0.0
 */
export type SingletonConfig = {
  weakRef?: boolean;
};

/**
 * Key type used for singleton storage strategies.
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
  get(key: SingletonStorageKey): unknown | undefined;
  set(key: SingletonStorageKey, value: unknown): void;
  has(key: SingletonStorageKey): boolean;
  delete(key: SingletonStorageKey): void;
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
 */
export type GlobalWithMyGlobal<T, S extends symbol> = typeof globalThis & {
  [K in S]?: T;
};
