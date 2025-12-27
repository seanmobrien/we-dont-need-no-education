import type { IsNotNull } from '../_types';
import type {
  SingletonConfig,
  SingletonStorageStrategy,
} from './types';
import type { SingletonProvider } from './provider';



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
declare module '@/lib/typescript/singleton-provider' {

  export { SingletonProvider };
  export type { SingletonConfig, SingletonStorageStrategy };

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
    config?: SingletonConfig,
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
  export function globalRequiredSingleton<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => IsNotNull<T> | undefined,
    config?: SingletonConfig,
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
    config?: SingletonConfig,
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
  export function globalRequiredSingletonAsync<T, S extends string | symbol = string>(
    symbol: S,
    factory: () => Promise<IsNotNull<T> | undefined>,
    config?: SingletonConfig,
  ): Promise<T>;
}
