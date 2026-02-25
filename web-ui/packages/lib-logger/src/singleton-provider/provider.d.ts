
declare module "@compliance-theater/lib/logger/singleton-provider/provider" {
  /**
   * Comprehensive singleton management system for TypeScript applications.
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
    * import { SingletonProvider, globalSingleton } from '@compliance-theater/logger/singleton-provider';
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
   */
  export class SingletonProvider implements ISingletonProvider {
    static get Instance(): SingletonProvider;
    private constructor();
    /**
 * Retrieve a singleton instance by key.
 * @param symbol The key (string or symbol) for the singleton.
 * @returns The singleton instance if present, otherwise undefined.
 */
    get<T = unknown, S extends string | symbol = string>(symbol: S): T | undefined;
    /**
 * Retrieve or create a singleton instance by key using a factory function.
 * @param symbol The key (string or symbol) for the singleton.
 * @param factory Factory function to create the instance if not present.
 * @param config Optional configuration for storage strategy.
 * @returns The singleton instance, or undefined if factory returns undefined.
 */
    getOrCreate<T, S extends string | symbol = string>(
      symbol: S,
      factory: () => T,
      config?: unknown
    ): T | undefined;
    /**
 * Retrieve or create a required singleton instance by key using a factory function.
 * Throws if the factory returns undefined or null.
 * @param symbol The key (string or symbol) for the singleton.
 * @param factory Factory function to create the instance if not present.
 * @param config Optional configuration for storage strategy.
 * @returns The singleton instance.
 * @throws {TypeError} If the factory returns undefined or null.
 */
    getRequired<T, S extends string | symbol = string>(
      symbol: S,
      factory: () => T,
      config?: unknown
    ): T;

    /**
     * Retrieve or create a singleton instance asynchronously by key using a factory function.
     * @param symbol The key (string or symbol) for the singleton.
     * @param factory Async factory function to create the instance if not present.
     * @param config Optional configuration for storage strategy.
     * @returns A promise resolving to the singleton instance, or undefined if factory returns undefined.
     */
    getOrCreateAsync<T, S extends string | symbol = string>(
      symbol: S,
      factory: () => Promise<T>,
      config?: unknown
    ): Promise<T | undefined>;
    /**
   * Retrieve or create a required singleton instance asynchronously by key using a factory function.
   * Throws if the factory returns undefined or null.
   * @param symbol The key (string or symbol) for the singleton.
   * @param factory Async factory function to create the instance if not present.
   * @param config Optional configuration for storage strategy.
   * @returns A promise resolving to the singleton instance.
   * @throws {TypeError} If the factory returns undefined or null.
   */
    getRequiredAsync<T, S extends string | symbol = string>(
      symbol: S,
      factory: () => Promise<T>,
      config?: unknown
    ): Promise<T>;
    /**
     * Check if a singleton instance exists for the given key.
     * @param symbol The key (string or symbol) for the singleton.
     * @returns True if the singleton exists, false otherwise.
     */
    has<S extends string | symbol = string>(symbol: S): boolean;
    /**
 * Set a singleton instance for the given key.
 * @param symbol The key (string or symbol) for the singleton.
 * @param value The value to set (must not be null or undefined).
 * @param config Optional configuration for storage strategy.
 * @throws {TypeError} If value is null or undefined.
 */
    set<T, S extends string | symbol = string>(
      symbol: S,
      value: T,
      config?: unknown
    ): void;

    /**
     * Clear all singleton instances from all storage.
     */
    clear(): void;

    /**
     * Delete a singleton instance for the given key.
     * @param symbol The key (string or symbol) for the singleton.
     */
    delete<S extends string | symbol = string>(symbol: S): void;
  }
}

