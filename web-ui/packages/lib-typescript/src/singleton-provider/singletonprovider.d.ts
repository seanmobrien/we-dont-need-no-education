/**
 * Interface for a generic singleton provider.
 *
 * Provides methods to get, create, set, check, and delete singleton instances by key.
 * Supports both synchronous and asynchronous creation, as well as strong and weak reference storage strategies.
 *
 * @template T The type of the singleton instance.
 * @template S The type of the key (string or symbol).
 */
export interface ISingletonProvider {
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
