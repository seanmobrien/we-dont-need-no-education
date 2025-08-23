import { drizDbWithInit, type ProvidersType, type DbDatabaseType, schema } from "@/lib/drizzle-db";
import { LoggedError } from '@/lib/react-util/errors/logged-error';


type ProviderMapEntry = Omit<ProvidersType, 'id' | 'createdAt' | 'updatedAt'>;
type ProviderMapEntryNameKey = 'name';
type ProviderMapEntryIdKey = 'id';
type ProviderIdType = ProvidersType[ProviderMapEntryIdKey];
type ProviderNameType = ProviderMapEntry[ProviderMapEntryNameKey];
type ProviderNameOrIdType = ProviderIdType | ProviderNameType;

export class ProviderMap {
  static #instance: ProviderMap | undefined;
  static readonly #ProviderNameKey: ProviderMapEntryNameKey = 'name' as const;

  static get Instance(): ProviderMap {
    this.#instance ??= new ProviderMap();
    return this.#instance;
  }
  static getInstance(db?: DbDatabaseType): Promise<ProviderMap> {
    if (this.#instance) {
      return this.#instance.#whenInitialized.promise.then(
        () => this.#instance!,
      );
    }
    this.#instance = new ProviderMap(db);
    return this.#instance.#whenInitialized.promise.then(() => this.#instance!);
  }

  readonly #idToRecord: Map<ProviderIdType, ProviderMapEntry>;
  readonly #nameToId: Map<ProviderNameType, ProviderIdType>;
  #whenInitialized: PromiseWithResolvers<boolean>;
  #initialized: boolean = false;

  constructor(
    entriesOrDb?:
      | (readonly [ProviderIdType, ProviderMapEntry])[]
      | DbDatabaseType,
  ) {
    this.#nameToId = new Map();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();
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
  get allIds(): ProviderIdType[] {
    return Array.from(this.#idToRecord.keys());
  }
  get allNames(): ProviderNameType[] {
    return Array.from(this.#nameToId.keys());
  }
  get initialized(): boolean {
    return this.#initialized;
  }
  get whenInitialized(): Promise<boolean> {
    return this.#whenInitialized.promise;
  }
  record(idOrName: ProviderNameOrIdType): ProviderMapEntry | undefined {
    let ret = this.#idToRecord.get(idOrName);
    if (!ret) {
      const id = this.#nameToId.get(idOrName);
      if (id) {
        ret = this.#idToRecord.get(id);
      }
    }
    return ret;
  }
  name(id: ProviderNameOrIdType): ProviderNameType | undefined {
    const record = this.record(id);
    return record?.[ProviderMap.#ProviderNameKey];
  }
  id(idOrName: ProviderNameOrIdType): ProviderIdType | undefined {
    const name = this.name(idOrName);
    return name ? this.#nameToId.get(name) : undefined;
  }
  contains(idOrName: ProviderNameOrIdType): boolean {
    return !!this.record(idOrName);
  }
  refresh(db?: DbDatabaseType): Promise<boolean> {
    this.#idToRecord.clear();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();

    const initDb = (!!db ? Promise.resolve(db) : drizDbWithInit())
      .then((db) => {
        return db.select().from(schema.providers);
      })
      .then((rows) => {
        (rows as ProvidersType[]).forEach(
          ({ id, name, displayName, description, baseUrl, isActive }) => {
            this.#idToRecord.set(id, {
              name,
              displayName,
              description,
              baseUrl,
              isActive,
            });
          },
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
      this.#nameToId.set(rec[ProviderMap.#ProviderNameKey], id);
    });
    this.#initialized = true;
    this.#whenInitialized.resolve(true);
    return this.#whenInitialized.promise;
  }
}
