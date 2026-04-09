/**
 * Type declarations for the singleton provider interface.
 *
 * Defines the contract for a registry that manages named singleton instances,
 * supporting both synchronous and asynchronous factory patterns, optional
 * weak-reference storage, and explicit lifecycle control (set, delete, clear).
 *
 * @module @compliance-theater/types/lib/logger/singleton-provider
 * @since 1.0.0
 */

import type { IsNotNull } from '../../types/typescript/is-not-null';

/**
 * Contract for a singleton registry that stores and retrieves typed instances
 * keyed by string or symbol identifiers.
 *
 * The registry supports four access patterns:
 * - **get** — passive lookup; returns `undefined` when absent.
 * - **getOrCreate / getOrCreateAsync** — lookup with lazy initialisation via a factory.
 * - **getRequired / getRequiredAsync** — like getOrCreate but throws when the factory
 *   resolves to `undefined`.
 * - **set** — explicit, pre-constructed value registration.
 *
 * All mutating operations accept an optional `config` argument so that
 * implementations may offer storage-strategy tuning (e.g. `WeakRef`-backed
 * storage) without changing the interface's method signatures.
 *
 * @example
 * ```typescript
 * import type { ISingletonProvider } from '@compliance-theater/types/lib/logger/singleton-provider';
 *
 * declare const provider: ISingletonProvider;
 *
 * // Lazy creation — returns undefined if factory returns undefined
 * const cache = provider.getOrCreate('app-cache', () => new Map<string, unknown>());
 *
 * // Required creation — throws if factory returns undefined
 * const db = provider.getRequired('db', () => createConnection());
 *
 * // Async lazy creation
 * const client = await provider.getOrCreateAsync('http-client', async () => buildClient());
 *
 * // Explicit registration
 * provider.set('config', loadedConfig);
 *
 * // Lifecycle management
 * provider.delete('app-cache');
 * provider.clear();
 * ```
 */
export type ISingletonProvider = {
    /**
     * Retrieves a singleton instance by key without creating one if absent.
     *
     * @template T - The expected type of the stored value. Defaults to `unknown`.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol - The key identifying the singleton.
     * @returns The stored instance cast to `T`, or `undefined` if no entry exists for `symbol`.
     *
     * @example
     * ```typescript
     * const existing = provider.get<MyService>('my-service');
     * if (existing !== undefined) {
     *   existing.doWork();
     * }
     * ```
     */
    get<T = unknown, S extends string | symbol = string>(symbol: S): T | undefined;

    /**
     * Retrieves an existing singleton, or creates and stores one using `factory` when absent.
     *
     * The factory is only invoked when no entry exists for `symbol`. If the factory
     * returns `undefined`, nothing is stored and `undefined` is returned to the caller.
     *
     * @template T - The type of the singleton value.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol  - The key identifying the singleton.
     * @param factory - Synchronous factory invoked at most once per `symbol`.
     *   Must return a non-null, non-undefined value (enforced by {@link IsNotNull}),
     *   or `undefined` to signal that creation was not possible.
     * @param config  - Optional implementation-defined configuration (e.g. storage strategy).
     * @returns The existing or newly created instance, or `undefined` if the factory
     *   declined to produce a value.
     *
     * @example
     * ```typescript
     * const service = provider.getOrCreate(
     *   'feature-flags',
     *   () => new FeatureFlagService(),
     *   { weakRef: true },
     * );
     * ```
     */
    getOrCreate<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => IsNotNull<T> | undefined,
        config?: unknown
    ): T | undefined;

    /**
     * Retrieves an existing singleton, or creates one using `factory` when absent.
     * Throws a `TypeError` if the factory returns `undefined`.
     *
     * Use this overload when the singleton is mandatory for the application to
     * function correctly and an absent value indicates a programming error.
     *
     * @template T - The type of the singleton value.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol  - The key identifying the singleton.
     * @param factory - Synchronous factory that must return a non-null, non-undefined value.
     *   The return type is constrained by {@link IsNotNull} to exclude `null` and `undefined`.
     * @param config  - Optional implementation-defined configuration (e.g. storage strategy).
     * @returns The existing or newly created instance.
     *
     * @throws {TypeError} When the factory returns `undefined` or `null`.
     *
     * @example
     * ```typescript
     * // Will throw if createDatabasePool() returns undefined
     * const pool = provider.getRequired('db-pool', () => createDatabasePool());
     * pool.query('SELECT 1');
     * ```
     */
    getRequired<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => IsNotNull<T> | undefined,
        config?: unknown
    ): T;

    /**
     * Asynchronously retrieves an existing singleton, or creates and stores one using
     * an async `factory` when absent.
     *
     * The factory is only invoked when no entry exists for `symbol`. The resolved
     * value is stored before the returned promise settles. If the factory resolves
     * to `undefined`, nothing is stored and the promise resolves to `undefined`.
     *
     * @template T - The type of the singleton value.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol  - The key identifying the singleton.
     * @param factory - Async factory invoked at most once per `symbol`.
     *   Must resolve to a non-null, non-undefined value (enforced by {@link IsNotNull}),
     *   or `undefined` to signal that creation was not possible.
     * @param config  - Optional implementation-defined configuration (e.g. storage strategy).
     * @returns A promise that resolves to the existing or newly created instance,
     *   or `undefined` if the factory resolved to `undefined`.
     *
     * @example
     * ```typescript
     * const client = await provider.getOrCreateAsync(
     *   'redis-client',
     *   async () => Redis.createClient({ url: process.env.REDIS_URL }),
     * );
     * ```
     */
    getOrCreateAsync<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => Promise<IsNotNull<T> | undefined>,
        config?: unknown
    ): Promise<T | undefined>;

    /**
     * Asynchronously retrieves an existing singleton, or creates one using an async
     * `factory` when absent. Throws a `TypeError` if the factory resolves to `undefined`.
     *
     * Use this overload when the singleton is mandatory and an absent value indicates
     * a programming error or unrecoverable initialisation failure.
     *
     * @template T - The type of the singleton value.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol  - The key identifying the singleton.
     * @param factory - Async factory that must resolve to a non-null, non-undefined value.
     *   The resolved type is constrained by {@link IsNotNull} to exclude `null` and `undefined`.
     * @param config  - Optional implementation-defined configuration (e.g. storage strategy).
     * @returns A promise that resolves to the existing or newly created instance.
     *
     * @throws {TypeError} When the factory's promise resolves to `undefined` or `null`.
     *
     * @example
     * ```typescript
     * // Throws at runtime if the HTTP client cannot be initialised
     * const http = await provider.getRequiredAsync(
     *   'http-client',
     *   async () => buildHttpClient(config),
     * );
     * ```
     */
    getRequiredAsync<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => Promise<IsNotNull<T> | undefined>,
        config?: unknown
    ): Promise<T>;

    /**
     * Checks whether an entry exists in the registry for the given key.
     *
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol - The key to look up.
     * @returns `true` if an entry is present for `symbol`, `false` otherwise.
     *
     * @example
     * ```typescript
     * if (!provider.has('user-session')) {
     *   provider.set('user-session', createSession());
     * }
     * ```
     */
    has<S extends string | symbol = string>(symbol: S): boolean;

    /**
     * Explicitly registers a pre-constructed value under `symbol`, replacing any
     * existing entry.
     *
     * Unlike `getOrCreate`, this method bypasses lazy initialisation and stores the
     * value immediately. The value type is constrained by {@link IsNotNull} to
     * prevent storing `null` or `undefined`, keeping the registry free of empty slots.
     *
     * @template T - The type of the value being registered.
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol - The key to associate with `value`.
     * @param value  - The non-null, non-undefined value to store.
     * @param config - Optional implementation-defined configuration (e.g. storage strategy).
     *
     * @throws {TypeError} When `value` is `null` or `undefined`.
     *
     * @example
     * ```typescript
     * // Pre-register a value constructed outside the registry
     * provider.set('app-config', config);
     * ```
     */
    set<T, S extends string | symbol = string>(
        symbol: S,
        value: IsNotNull<T>,
        config?: unknown
    ): void;

    /**
     * Removes all entries from the registry.
     *
     * After this call, every subsequent `get` call will return `undefined` and
     * every `has` call will return `false`. Any `getOrCreate` call will re-invoke
     * the supplied factory.
     *
     * @example
     * ```typescript
     * // Tear down all singletons between test cases
     * afterEach(() => provider.clear());
     * ```
     */
    clear(): void;

    /**
     * Removes the entry associated with `symbol` from the registry.
     *
     * If no entry exists for `symbol`, this is a no-op. After deletion, the next
     * `getOrCreate` call for the same key will re-invoke the factory.
     *
     * @template S - The key type; constrained to `string | symbol`. Defaults to `string`.
     *
     * @param symbol - The key whose entry should be removed.
     *
     * @example
     * ```typescript
     * // Force the next access to re-initialise the connection
     * provider.delete('db-pool');
     * ```
     */
    delete<S extends string | symbol = string>(symbol: S): void;
};
