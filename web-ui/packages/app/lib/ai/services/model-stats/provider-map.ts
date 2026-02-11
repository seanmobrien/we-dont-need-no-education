/**
 * @module lib/ai/services/model-stats/provider-map
 *
 * ProviderMap manages provider metadata (IDs, names, aliases) used throughout
 * the model/quotas subsystem. It exposes a singleton instance which can be
 * initialized from the database or seeded with a mock set for tests.
 *
 * Responsibilities:
 * - Load and cache provider rows from the DB (id, name, displayName, aliases).
 * - Provide stable lookup helpers (by id or by name/alias).
 * - Offer defensive helpers that throw typed errors when lookups fail.
 *
 * The module exports small typed constants and guards to make provider names
 * ergonomic and well-typed across the codebase.
 */
import {
  drizDbWithInit,
  type ProvidersType,
  type DbDatabaseType,
  schema,
} from '@compliance-theater/database';
import { LoggedError, log } from '@compliance-theater/logger';
import { ResourceNotFoundError } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { isKeyOf } from '@compliance-theater/typescript';

/**
 * Primary provider canonical names.
 *
 * These are the short, canonical names used internally to represent the
 * capabilities of a provider.
 */
export const ProviderPrimaryNameTypeValues = [
  'azure',
  'google',
  'openai',
] as const;

/**
 * Common provider alias values used by external libraries or legacy configs.
 *
 * Aliases are additional names that should be treated as equivalent to the
 * canonical provider name when normalizing provider inputs.
 */
export const ProviderAliasTypeValues = [
  'google.generative-ai',
  'azure.chat',
  'azure-openai.chat',
] as const;

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
export const isProviderName = (value: unknown): value is ProviderNameType =>
  isKeyOf(value, ProviderPrimaryNameTypeValues) ||
  isKeyOf(value, ProviderAliasTypeValues);

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
type ProviderMapEntryNameKey = 'name';
type ProviderMapEntryAliasesKey = 'aliases';
type ProviderMapEntryIdKey = 'id';
type ProviderIdType = ProvidersType[ProviderMapEntryIdKey];
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
  // Global symbol key to expose init resolvers across module copies/HMR boundaries
  static readonly #INIT_KEY = Symbol.for(
    '@noeducation/model-stats:ProviderMap:init'
  );
  // Symbol-based global registry key to ensure singleton across module reloads/bundles
  static readonly #REGISTRY_KEY = Symbol.for(
    '@noeducation/model-stats:ProviderMap'
  );
  static get #instance(): ProviderMap | undefined {
    type GlobalReg = { [k: symbol]: ProviderMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    return g[this.#REGISTRY_KEY];
  }
  static set #instance(value: ProviderMap | undefined) {
    type GlobalReg = { [k: symbol]: ProviderMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = value;
  }
  static readonly #ProviderNameKey: ProviderMapEntryNameKey = 'name' as const;
  static readonly #ProviderAliasesKey: ProviderMapEntryAliasesKey =
    'aliases' as const;

  static get Instance(): ProviderMap {
    type GlobalReg = { [k: symbol]: ProviderMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    if (!g[this.#REGISTRY_KEY]) {
      g[this.#REGISTRY_KEY] = new ProviderMap();
    }
    this.#instance = g[this.#REGISTRY_KEY]!;
    return this.#instance;
  }
  /**
   * Return the singleton `ProviderMap` instance, asynchronously initializing it
   * if necessary. If a `db` is supplied it will be used for initialization.
   *
   * @param db - Optional database handle used for initialization.
   * @returns Promise that resolves to the initialized ProviderMap.
   */
  static getInstance(db?: DbDatabaseType): Promise<ProviderMap> {
    type GlobalReg = { [k: symbol]: ProviderMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    if (!g[this.#REGISTRY_KEY]) {
      g[this.#REGISTRY_KEY] = new ProviderMap(db);
    }
    this.#instance = g[this.#REGISTRY_KEY]!;
    const inst = this.#instance;
    const init = (
      inst as unknown as Record<
        symbol,
        PromiseWithResolvers<boolean> | undefined
      >
    )[ProviderMap.#INIT_KEY];
    const p: Promise<boolean> =
      init?.promise ?? inst.whenInitialized ?? Promise.resolve(true);
    return p.then(() => this.#instance!);
  }
  /**
   * Create a mock ProviderMap instance seeded with in-memory records. Useful
   * for unit tests that need deterministic provider lookups without touching
   * the database.
   *
   * @param records - Array of `[id, ProviderMapEntry]` tuples to seed the map.
   * @returns The initialized ProviderMap singleton.
   */
  static setupMockInstance(
    records: (readonly [ProviderIdType, ProviderMapEntry])[]
  ): ProviderMap {
    type GlobalReg = { [k: symbol]: ProviderMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = new ProviderMap(records);
    this.#instance = g[this.#REGISTRY_KEY]!;
    return this.#instance;
  }

  readonly #idToRecord: Map<ProviderIdType, ProviderMapEntry>;
  readonly #nameToId: Map<ProviderNameType, ProviderIdType>;
  #whenInitialized: PromiseWithResolvers<boolean>;
  #initialized: boolean = false;

  constructor(
    entriesOrDb?:
      | (readonly [ProviderIdType, ProviderMapEntry])[]
      | DbDatabaseType
  ) {
    this.#nameToId = new Map();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();
    // Expose init resolvers via a symbol to avoid private brand checks across module copies
    (this as unknown as Record<symbol, PromiseWithResolvers<boolean>>)[
      ProviderMap.#INIT_KEY
    ] = this.#whenInitialized;
    if (Array.isArray(entriesOrDb)) {
      this.#idToRecord = new Map(entriesOrDb);
      this.#initializeNameToIdMap();
    } else {
      this.#idToRecord = new Map();
      this.refresh(entriesOrDb);
    }
  }
  get entries(): IterableIterator<[ProviderIdType, ProviderMapEntry]> {
    return this.#idToRecord.entries();
  }
  /**
   * Iterate over stored provider entries as `[id, ProviderMapEntry]` tuples.
   */
  get allIds(): ProviderIdType[] {
    return Array.from(this.#idToRecord.keys());
  }
  /**
   * Return all provider IDs currently stored in the map.
   */
  get allNames(): ProviderNameType[] {
    return Array.from(this.#nameToId.keys());
  }
  /**
   * Return all recognized provider names (canonical or aliases) currently
   * mapped to IDs.
   */
  get initialized(): boolean {
    return this.#initialized;
  }
  /**
   * Promise that resolves when the map is fully initialized (either from DB or
   * by a mock seed).
   */
  get whenInitialized(): Promise<boolean> {
    return this.#whenInitialized.promise;
  }
  /**
   * Lookup a provider record by id or name (name or alias).
   *
   * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
   * @returns The provider entry or `undefined` if not found.
   */
  record(idOrName: ProviderNameOrIdType): ProviderMapEntry | undefined {
    let id: string;
    if (isProviderName(idOrName)) {
      const check = this.#nameToId.get(idOrName);
      if (!check) {
        return undefined;
      }
      id = check;
    } else {
      id = idOrName;
    }
    return this.#idToRecord.get(id);
  }
  /**
   * Lookup a provider record by id or name and throw `ResourceNotFoundError`
   * when it cannot be found. Useful in code paths where a missing provider
   * should be treated as an exceptional condition.
   *
   * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
   * @throws {ResourceNotFoundError} When the provider cannot be found.
   * @returns The provider entry when found.
   */
  recordOrThrow(idOrName: ProviderNameOrIdType): ProviderMapEntry {
    const rec = this.record(idOrName);
    if (rec) return rec;
    throw new ResourceNotFoundError({
      resourceType: 'provider',
      normalized: idOrName,
      inputRaw: idOrName,
      message: `Provider not found: ${String(idOrName)}`,
    });
  }
  /**
   * Return the canonical provider name for the given id or name/alias.
   *
   * @param id - Provider id (UUID) or a recognized provider name/alias.
   * @returns The canonical provider name or `undefined` when not found.
   */
  name(id: ProviderNameOrIdType): ProviderNameType | undefined {
    const record = this.record(id);
    return record?.[ProviderMap.#ProviderNameKey] as
      | ProviderNameType
      | undefined;
  }

  /**
   * Like `name()` but throws when the provider cannot be found.
   *
   * @throws {ResourceNotFoundError} When the provider name is not found.
   */
  nameOrThrow(id: ProviderNameOrIdType): ProviderNameType {
    const name = this.name(id);
    if (name) return name;
    throw new ResourceNotFoundError({
      resourceType: 'provider',
      normalized: id,
      inputRaw: id,
      message: `Provider name not found for: ${String(id)}`,
    });
  }
  /**
   * Return the provider id for a provider name or id. If the input is already
   * an id it will be returned when present in the cache.
   *
   * @param idOrName - Provider id (UUID) or a recognized provider name/alias.
   * @returns Provider id or `undefined` when not found.
   */
  id(idOrName: ProviderNameOrIdType): ProviderIdType | undefined {
    const name = this.name(idOrName);

    return name ? this.#nameToId.get(name) : undefined;
  }

  /**
   * Like `id()` but throws when the provider id cannot be resolved.
   *
   * @throws {ResourceNotFoundError}
   */
  idOrThrow(idOrName: ProviderNameOrIdType): ProviderIdType {
    const val = this.id(idOrName);
    if (val) return val;
    throw new ResourceNotFoundError({
      resourceType: 'provider',
      normalized: idOrName,
      inputRaw: idOrName,
      message: `Provider id not found: ${String(idOrName)}`,
    });
  }
  /**
   * Return true when the provider map contains a provider for the given id or name.
   */
  contains(idOrName: ProviderNameOrIdType): boolean {
    return !!this.record(idOrName);
  }
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
  refresh(db?: DbDatabaseType): Promise<boolean> {
    this.#idToRecord.clear();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();
    (this as unknown as Record<symbol, PromiseWithResolvers<boolean>>)[
      ProviderMap.#INIT_KEY
    ] = this.#whenInitialized;

    const initDb = (!!db ? Promise.resolve(db) : drizDbWithInit())
      .then((db) => {
        return db.select().from(schema.providers);
      })
      .then((rows) => {
        (rows as ProvidersType[]).forEach(
          ({
            id,
            name,
            displayName,
            description,
            baseUrl,
            isActive,
            aliases,
          }) => {
            this.#idToRecord.set(id, {
              name,
              displayName,
              description,
              baseUrl,
              isActive,
              aliases,
            });
          }
        );
        return Promise.resolve();
      })
      .then(() => this.#initializeNameToIdMap());
    // Log and suppress failure
    initDb.catch((err: unknown) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Failed to load provider map from database',
      });
      this.#whenInitialized.reject();
    });
    return this.#whenInitialized.promise;
  }

  #initializeNameToIdMap(): Promise<boolean> {
    this.#nameToId.clear();
    this.#idToRecord.forEach((rec, id) => {
      const thisName = rec[ProviderMap.#ProviderNameKey];
      if (isProviderName(thisName)) {
        this.#nameToId.set(thisName, id);
      } else {
        log((l) => l.warn(`Invalid provider name for id ${id}: ${thisName}`));
        // Force it, but keep in mind it probably won't work very well until we
        // the the code updated...
        this.#nameToId.set(thisName as ProviderNameType, id);
      }
      const aliases = rec[ProviderMap.#ProviderAliasesKey] || [];
      aliases.forEach((alias) => {
        if (isProviderName(alias)) {
          this.#nameToId.set(alias, id);
        } else {
          log((l) =>
            l.warn(
              `Invalid provider alias for provider ${thisName} (${id}): ${alias}`
            )
          );
          // Force it, but keep in mind it probably won't work very well until we
          // the the code updated...
          this.#nameToId.set(alias as ProviderNameType, id);
        }
      });
    });
    this.#initialized = true;
    this.#whenInitialized.resolve(true);
    return this.#whenInitialized.promise;
  }
}
