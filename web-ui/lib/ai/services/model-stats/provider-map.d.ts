/**
 * @fileoverview ProviderMap module definition.
 *
 * This module provides the type definitions and documentation for the ProviderMap class
 * and related types. ProviderMap manages provider metadata used throughout the
 * model/quotas subsystem.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-08-23
 */

import { type ProvidersType, type DbDatabaseType } from '../../../drizzle-db';

declare module '@/lib/ai/services/model-stats/provider-map' {
  /**
   * Primary provider canonical names.
   *
   * These are the short, canonical names used internally to represent the
   * capabilities of a provider.
   */
  export const ProviderPrimaryNameTypeValues: readonly [
    'azure',
    'google',
    'openai',
  ];

  /**
   * Common provider alias values used by external libraries or legacy configs.
   *
   * Aliases are additional names that should be treated as equivalent to the
   * canonical provider name when normalizing provider inputs.
   */
  export const ProviderAliasTypeValues: readonly [
    'google.generative-ai',
    'azure.chat',
    'azure-openai.chat',
  ];

  /**
   * Type representing a primary provider name (one of the canonical names).
   */
  export type ProviderPrimaryNameType =
    (typeof ProviderPrimaryNameTypeValues)[number];

  /**
   * Type representing a provider alias name.
   */
  export type ProviderAliasType = (typeof ProviderAliasTypeValues)[number];

  /**
   * Union of all supported provider name variants (primary and aliases).
   */
  export type ProviderNameType = ProviderPrimaryNameType | ProviderAliasType;

  /**
   * Type guard that returns `true` when the provided value is a known provider
   * name or alias. Useful when accepting free-form input (config, tests,
   * runtime) and wanting a narrow `ProviderNameType`.
   *
   * @param value - Candidate value to test.
   * @returns `true` if `value` is one of the known provider names or aliases.
   */
  export function isProviderName(value: unknown): value is ProviderNameType;

  /**
   * Shape of a provider record stored in the in-memory provider map.
   *
   * It mirrors the database `ProvidersType` row but omits DB-managed columns
   * (`id`, `createdAt`, `updatedAt`) because the map stores the row indexed by
   * `id` and the timestamps are not required for lookups.
   */
  export type ProviderMapEntry = Omit<
    ProvidersType,
    'id' | 'createdAt' | 'updatedAt'
  >;

  type ProviderIdType = ProvidersType['id'];
  type ProviderNameOrIdType = ProviderIdType | ProviderNameType;

  /**
   * ProviderMap
   *
   * Singleton that manages provider metadata used by the ModelMap and other
   * services. It caches provider rows (id, name, aliases, displayName, etc.) and
   * provides convenient lookup helpers by id, name or alias. The class is
   * designed to be initialized once and reused; it supports seeding with an
   * in-memory record set for tests via `setupMockInstance` and can refresh its
   * cache from the database via `refresh`.
   *
   * Lifecycle & thread-safety:
   * - Use `ProviderMap.getInstance(db?)` to obtain the singleton asynchronously.
   * - Callers may also use the sync `ProviderMap.Instance` getter after the
   *   instance has been initialized.
   * - `refresh` will re-populate caches and resolve the internal initialization
   *   promise; failures are logged and cause the initialization promise to reject.
   *
   * Example:
   * ```ts
   * const map = await ProviderMap.getInstance();
   * const providerId = map.idOrThrow('azure');
   * ```
   */
  export class ProviderMap {
    /**
     * Get the singleton instance of ProviderMap.
     * @returns {ProviderMap} The singleton instance.
     */
    static get Instance(): ProviderMap;

    /**
     * Return the singleton `ProviderMap` instance, asynchronously initializing it
     * if necessary. If a `db` is supplied it will be used for initialization.
     *
     * @param db - Optional database handle used for initialization.
     * @returns Promise that resolves to the initialized ProviderMap.
     */
    static getInstance(db?: DbDatabaseType): Promise<ProviderMap>;

    /**
     * Create a mock ProviderMap instance seeded with in-memory records. Useful
     * for unit tests that need deterministic provider lookups without touching
     * the database.
     *
     * @param records - Array of `[id, ProviderMapEntry]` tuples to seed the map.
     * @returns The initialized ProviderMap singleton.
     */
    static setupMockInstance(
      records: (readonly [ProviderIdType, ProviderMapEntry])[],
    ): ProviderMap;

    constructor(
      entriesOrDb?:
        | (readonly [ProviderIdType, ProviderMapEntry])[]
        | DbDatabaseType,
    );

    /**
     * Iterate over stored provider entries as `[id, ProviderMapEntry]` tuples.
     */
    get entries(): IterableIterator<[ProviderIdType, ProviderMapEntry]>;

    /**
     * Return all provider IDs currently stored in the map.
     */
    get allIds(): ProviderIdType[];

    /**
     * Return all recognized provider names (canonical or aliases) currently
     * mapped to IDs.
     */
    get allNames(): ProviderNameType[];

    /**
     * Return true when the map is fully initialized (either from DB or
     * by a mock seed).
     */
    get initialized(): boolean;

    /**
     * Promise that resolves when the map is fully initialized (either from DB or
     * by a mock seed).
     */
    get whenInitialized(): Promise<boolean>;

    /**
     * Lookup a provider record by id or name (name or alias).
     *
     * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
     * @returns The provider entry or `undefined` if not found.
     */
    record(idOrName: ProviderNameOrIdType): ProviderMapEntry | undefined;

    /**
     * Lookup a provider record by id or name and throw `ResourceNotFoundError`
     * when it cannot be found. Useful in code paths where a missing provider
     * should be treated as an exceptional condition.
     *
     * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
     * @throws {ResourceNotFoundError} When the provider cannot be found.
     * @returns The provider entry when found.
     */
    recordOrThrow(idOrName: ProviderNameOrIdType): ProviderMapEntry;

    /**
     * Return the canonical provider name for the given id or name/alias.
     *
     * @param id - Provider id (UUID) or a recognized provider name/alias.
     * @returns The canonical provider name or `undefined` when not found.
     */
    name(id: ProviderNameOrIdType): ProviderNameType | undefined;

    /**
     * Like `name()` but throws when the provider cannot be found.
     *
     * @throws {ResourceNotFoundError} When the provider name is not found.
     */
    nameOrThrow(id: ProviderNameOrIdType): ProviderNameType;

    /**
     * Return the provider id for a provider name or id. If the input is already
     * an id it will be returned when present in the cache.
     *
     * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
     * @returns Provider id or `undefined` when not found.
     */
    id(idOrName: ProviderNameOrIdType): ProviderIdType | undefined;

    /**
     * Like `id()` but throws when the provider id cannot be resolved.
     *
     * @throws {ResourceNotFoundError}
     */
    idOrThrow(idOrName: ProviderNameOrIdType): ProviderIdType;

    /**
     * Return true when the provider map contains a provider for the given id or name.
     */
    contains(idOrName: ProviderNameOrIdType): boolean;

    /**
     * Refresh the provider map from the database. This will clear current
     * in-memory caches and repopulate them from the `providers` table.
     *
     * The call returns a promise that resolves when initialization completes.
     * Failures are logged and the initialization promise is rejected.
     *
     * @param db - Optional database handle to use for loading providers.
     * @returns Promise that resolves to true when refresh completes.
     */
    refresh(db?: DbDatabaseType): Promise<boolean>;
  }
}
