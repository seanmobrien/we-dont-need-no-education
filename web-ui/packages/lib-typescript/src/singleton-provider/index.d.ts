import type { IsNotNull } from "../types";
import type { SingletonConfig, SingletonStorageStrategy } from "./types";
import type { WeakReferenceStorage } from "./storage-weak-ref";
import type { StrongReferenceStorage } from "./storage-strong-ref";
/**
 * Type declarations for singleton provider module.
 *
 * @fileoverview Singleton Provider Module
 *
 * This module provides a comprehensive singleton management system for TypeScript applications.
 * It offers both global and scoped singleton storage with configurable memory management strategies,
 * including support for WeakMap-based storage to prevent memory leaks in long-running applications.
 *
 * The module implements a two-tier singleton system:
 * 1. **Global Singletons**: Stored on the global scope using Symbol.for() keys
 * 2. **Scoped Singletons**: Managed through the SingletonProvider instance with WeakMap support
 *
 * Key features:
 * - Memory-efficient singleton storage with WeakMap support
 * - Type-safe singleton creation and retrieval
 * - Automatic cleanup and resource management
 * - Configurable storage strategies (strong vs weak references)
 * - Thread-safe operations for Node.js environments
 *
 * @example
 * ```typescript
 * import { SingletonProvider, globalSingleton } from '@/lib/typescript/singleton-provider';
 *
 * // Using the global singleton function
 * const dbConnection = globalSingleton('database', () => createDatabaseConnection());
 *
 * // Using the SingletonProvider instance for scoped singletons
 * const provider = SingletonProvider.Instance;
 *
 * // Create a singleton with weak references for better memory management
 * const cache = provider.getOrCreate('app-cache', () => new Map(), { weakRef: true });
 *
 * // Check if a singleton exists
 * if (provider.has('user-session')) {
 *   const session = provider.get('user-session');
 *   // Use existing session
 * } else {
 *   // Create new session
 *   const newSession = provider.getOrCreate('user-session', createSession);
 * }
 *
 * // Clean up when done
 * provider.clear();
 * ```
 *
 * @since 1.0.0
 * @version 1.0.0
 */
declare module "@/lib/typescript/singleton-provider" {
  export type {
    SingletonConfig,
    SingletonStorageStrategy,
    WeakReferenceStorage,
    StrongReferenceStorage,
  };

  /**
   * Singleton provider class for managing singleton instances with advanced memory management.
   *
   * The SingletonProvider implements a sophisticated singleton pattern that supports both
   * global and scoped singleton storage. It provides configurable memory management through
   * WeakMap support, allowing singletons to be garbage collected when no longer referenced.
   *
   * Key features:
   * - **Dual Storage Strategy**: Supports both global scope and WeakMap-based storage
   * - **Memory Management**: Configurable weak references to prevent memory leaks
   * - **Type Safety**: Full TypeScript support with generic type parameters
   * - **Thread Safety**: Safe for use in Node.js environments with proper locking
   * - **Resource Cleanup**: Comprehensive cleanup methods for memory management
   *
   * The class uses a singleton pattern itself, with the Instance property providing
   * access to the global provider instance.
   *
   * @example
   * ```typescript
   * // Get the global singleton provider instance
   * const provider = SingletonProvider.Instance;
   *
   * // Create a database connection singleton
   * const db = provider.getOrCreate('database', () => createDbConnection());
   *
   * // Create a cache with weak references for better memory management
   * const cache = provider.getOrCreate('cache', () => new Map(), { weakRef: true });
   *
   * // Check if a singleton exists
   * if (provider.has('user-service')) {
   *   const service = provider.get('user-service');
   *   // Use existing service
   * }
   *
   * // Manually set a singleton value
   * provider.set('config', appConfig);
   *
   * // Clean up all singletons
   * provider.clear();
   * ```
   *
   * @since 1.0.0
   */
  export class SingletonProvider {
    /**
     * Gets the global singleton instance of the SingletonProvider.
     *
     * This static getter provides access to the single global instance of the
     * SingletonProvider class. It uses the internal singleton mechanism to ensure
     * only one instance exists throughout the application lifecycle.
     *
     * The instance is lazily created on first access and stored globally using
     * a well-known symbol to avoid naming conflicts.
     *
     * @static
     * @returns The global SingletonProvider instance
     *
     * @example
     * ```typescript
     * // Get the global provider instance
     * const provider = SingletonProvider.Instance;
     *
     * // Use it to manage singletons
     * const db = provider.getOrCreate('database', createDbConnection);
     * ```
     */
    static get Instance(): SingletonProvider;

    /**
     * Retrieves an existing singleton instance by symbol key.
     *
     * This method attempts to retrieve a singleton instance that was previously
     * created and stored using the provided symbol key. It searches both WeakMap
     * and global storage, returning undefined if no instance exists.
     *
     * Unlike getOrCreate, this method never creates new instances and only returns
     * existing ones.
     *
     * @template T - The expected type of the singleton value (defaults to unknown)
     * @template S - The symbol or string type used as the storage key
     * @param symbol - The symbol or string key used to identify the singleton
     * @returns The existing singleton instance, or undefined if not found
     *
     * @example
     * ```typescript
     * // Try to get an existing database connection
     * const db = provider.get<DatabaseConnection>('database');
     *
     * if (db) {
     *   // Use existing connection
     *   await db.query('SELECT * FROM users');
     * } else {
     *   // Create new connection
     *   const newDb = provider.getOrCreate('database', createConnection);
     * }
     * ```
     */
    get<T = unknown, S extends string | symbol = string>(
      symbol: S
    ): T | undefined;

    /**
     * Retrieves an existing singleton or creates a new one using the provided factory.
     *
     * This method implements the core singleton pattern: it first checks if a singleton
     * instance already exists for the given symbol. If found, it returns the existing
     * instance. If not found, it creates a new instance using the factory function and
     * stores it according to the configuration.
     *
     * The method supports configurable storage strategies, allowing choice between
     * strong references (global scope) and weak references (WeakMap) for better
     * memory management.
     *
     * @template T - The type of singleton value being created
     * @template S - The symbol or string type used as the storage key
     * @param symbol - The symbol or string key for the singleton
     * @param factory - Factory function that creates the singleton instance
     * @param config - Optional configuration for storage strategy (defaults to strong references)
     * @returns The existing or newly created singleton instance
     *
     * @throws {TypeError} When the factory function returns null or undefined
     *
     * @example
     * ```typescript
     * // Create a database connection singleton
     * const db = provider.getOrCreate('database', () => {
     *   return new DatabaseConnection(process.env.DB_URL);
     * });
     *
     * // Create a cache with weak references for memory efficiency
     * const cache = provider.getOrCreate('cache', () => new Map(), {
     *   weakRef: true
     * });
     *
     * // Multiple calls return the same instance
     * const db1 = provider.getOrCreate('database', createDb);
     * const db2 = provider.getOrCreate('database', createDb);
     * console.log(db1 === db2); // true
     * ```
     */
    getOrCreate<T, S extends string | symbol = string>(
      symbol: S,
      factory: () => IsNotNull<T>,
      config?: SingletonConfig
    ): T;

    /**
     * Checks if a singleton instance exists for the given symbol.
     *
     * This method checks whether a singleton has been created and is being tracked
     * by this provider instance. It checks both WeakMap and global storage to ensure
     * the singleton actually exists.
     *
     * @template S - The symbol or string type used as the storage key
     * @param symbol - The symbol or string key to check
     * @returns True if a singleton exists for the key, false otherwise
     *
     * @example
     * ```typescript
     * // Check if a service has been initialized
     * if (provider.has('user-service')) {
     *   console.log('User service is available');
     * } else {
     *   console.log('User service needs to be initialized');
     * }
     *
     * // Safe retrieval pattern
     * const service = provider.has('api-client')
     *   ? provider.get('api-client')
     *   : provider.getOrCreate('api-client', createApiClient);
     * ```
     */
    has<S extends string | symbol = string>(symbol: S): boolean;

    /**
     * Manually sets a singleton instance for the given symbol.
     *
     * This method allows direct assignment of singleton instances without using a factory.
     * It's useful for setting pre-created instances or overriding existing singletons.
     * The storage strategy (strong vs weak references) can be configured.
     *
     * When weakRef is true, the instance is stored in WeakMap and can be garbage collected
     * if no other references exist. When false, it's stored globally with strong references.
     *
     * @template T - The type of singleton value being stored
     * @template S - The symbol or string type used as the storage key
     * @param symbol - The symbol or string key for the singleton
     * @param value - The singleton instance to store (must not be null or undefined)
     * @param config - Optional configuration for storage strategy (defaults to strong references)
     *
     * @throws {TypeError} When the value parameter is null or undefined
     *
     * @example
     * ```typescript
     * // Set a pre-configured logger instance
     * const logger = new Logger({ level: 'info' });
     * provider.set('logger', logger);
     *
     * // Set a cache with weak references for memory efficiency
     * const cache = new Map();
     * provider.set('cache', cache, { weakRef: true });
     *
     * // Override an existing singleton
     * provider.set('database', newDatabaseConnection);
     * ```
     */
    set<T, S extends string | symbol = string>(
      symbol: S,
      value: IsNotNull<T>,
      config?: SingletonConfig
    ): void;

    /**
     * Clears all singleton instances managed by this provider.
     *
     * This method removes all singletons that were created through this provider instance,
     * cleaning up both WeakMap and global storage. It's useful for testing, application
     * shutdown, or when a complete reset is needed.
     *
     * The method iterates through all tracked keys and removes the corresponding instances
     * from both storage locations (WeakMap and global scope) to ensure complete cleanup.
     *
     * @example
     * ```typescript
     * // Clear all singletons during testing
     * afterEach(() => {
     *   provider.clear();
     * });
     *
     * // Reset application state
     * provider.clear();
     * initializeApplication();
     *
     * // Graceful shutdown
     * process.on('SIGTERM', () => {
     *   provider.clear();
     *   process.exit(0);
     * });
     * ```
     */
    clear(): void;

    /**
     * Deletes a specific singleton instance by symbol key.
     *
     * This method removes a single singleton instance from both WeakMap and global storage,
     * allowing it to be garbage collected if no other references exist. It's useful for
     * cleaning up specific resources or resetting individual singletons.
     *
     * @template S - The symbol or string type used as the storage key
     * @param symbol - The symbol or string key of the singleton to delete
     *
     * @example
     * ```typescript
     * // Remove a specific service
     * provider.delete('user-service');
     *
     * // Reset a cache
     * provider.delete('app-cache');
     * const newCache = provider.getOrCreate('app-cache', () => new Map());
     *
     * // Clean up temporary singletons
     * provider.delete('temp-session');
     * ```
     */
    delete<S extends string | symbol = string>(symbol: S): void;
  }

  /**
   * Retrieves or lazily creates a singleton instance stored on the global scope.
   *
   * This function provides a convenient, high-level API for creating global singletons
   * using well-known symbol keys. It leverages the SingletonProvider.Instance internally
   * to manage singleton lifecycle with configurable memory management strategies.
   *
   * The function supports both strong and weak references, allowing applications to
   * choose between persistent storage (strong references) and memory-efficient storage
   * (weak references) that can be garbage collected when no longer referenced.
   *
   * @template T - Type of the singleton value
   * @template S - Symbol string namespace used with Symbol.for (defaults to string)
   * @param symbol - Global symbol namespace for the singleton (string or symbol)
   * @param factory - Function that creates the singleton value when it doesn't exist
   * @param config - Optional configuration for storage strategy (defaults to strong references)
   * @returns The cached or newly-created singleton instance, or undefined if factory returns undefined
   *
   * @example
   * ```typescript
   * // Basic usage with string key
   * const db = globalSingleton('database', () => createDatabaseConnection());
   *
   * // Using symbol key for better isolation
   * const loggerSymbol = Symbol.for('app-logger');
   * const logger = globalSingleton(loggerSymbol, () => new Logger());
   *
   * // Memory-efficient singleton with weak references
   * const cache = globalSingleton('cache', () => new Map(), { weakRef: true });
   *
   * // Multiple calls return the same instance
   * const db1 = globalSingleton('database', createDb);
   * const db2 = globalSingleton('database', createDb);
   * console.log(db1 === db2); // true
   * ```
   *
   * @see {@link SingletonProvider} for the underlying provider class
   * @see {@link SingletonConfig} for configuration options
   * @since 1.0.0
   */
  export function globalSingleton<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config?: SingletonConfig
  ): T | undefined;

  /**
   * Retrieves or lazily creates a required global singleton instance.
   * Throws if the factory returns undefined or null.
   *
   * @template T - Type of the singleton value
   * @template S - Symbol string namespace used with Symbol.for (defaults to string)
   * @param symbol - Global symbol namespace for the singleton (string or symbol)
   * @param factory - Function that creates the singleton value when it doesn't exist
   * @param config - Optional configuration for storage strategy
   * @returns The cached or newly-created singleton instance
   * @throws {TypeError} If the singleton cannot be created
   */
  export function globalRequiredSingleton<
    T,
    S extends string | symbol = string,
  >(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config?: SingletonConfig
  ): T;

  /**
   * Asynchronously retrieves or lazily creates a singleton instance stored on the global scope.
   *
   * @template T - Type of the singleton value
   * @template S - Symbol string namespace used with Symbol.for (defaults to string)
   * @param symbol - Global symbol namespace for the singleton (string or symbol)
   * @param factory - Async function that creates the singleton value when it doesn't exist
   * @param config - Optional configuration for storage strategy
   * @returns Promise resolving to the cached or newly-created singleton instance, or undefined
   */
  export function globalSingletonAsync<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config?: SingletonConfig
  ): Promise<T | undefined>;

  /**
   * Asynchronously retrieves or lazily creates a required global singleton instance.
   * Throws if the factory returns undefined or null.
   *
   * @template T - Type of the singleton value
   * @template S - Symbol string namespace used with Symbol.for (defaults to string)
   * @param symbol - Global symbol namespace for the singleton (string or symbol)
   * @param factory - Async function that creates the singleton value when it doesn't exist
   * @param config - Optional configuration for storage strategy
   * @returns Promise resolving to the cached or newly-created singleton instance
   * @throws {TypeError} If the singleton cannot be created
   */
  export function globalRequiredSingletonAsync<
    T,
    S extends string | symbol = string,
  >(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config?: SingletonConfig
  ): Promise<T>;
}
