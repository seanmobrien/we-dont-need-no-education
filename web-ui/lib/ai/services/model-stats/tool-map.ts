import { drizDbWithInit, type DbDatabaseType, schema } from '/lib/drizzle-db';
import type { ChatToolType } from '/lib/drizzle-db/drizzle-types';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import { ResourceNotFoundError } from '/lib/ai/services/chat/errors/resource-not-found-error';
import { log } from '/lib/logger';
import type {
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2FunctionTool,
} from '@ai-sdk/provider';

type ToolMapEntry = ChatToolType;
type ToolIdType = ChatToolType['chatToolId'];
type ToolNameType = ChatToolType['toolName'];
type ToolNameOrIdType = ToolIdType | ToolNameType;

/**
 * ToolMap manages chat tool metadata from the `chat_tool` table.
 * It mirrors ProviderMap's lifecycle and lookup utilities.
 */
export class ToolMap {
  /** Global symbol key to access the init resolvers across module copies */
  static readonly #INIT_KEY = Symbol.for(
    '@noeducation/model-stats:ToolMap:init',
  );
  /** Symbol-based global registry key for singleton ToolMap. */
  static readonly #REGISTRY_KEY = Symbol.for(
    '@noeducation/model-stats:ToolMap',
  );
  /** Local cached reference to the global singleton via global symbol registry. */
  static get #instance(): ToolMap | undefined {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    return g[this.#REGISTRY_KEY];
  }
  static set #instance(value: ToolMap | undefined) {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = value;
  }

  /** In-memory cache for tool records, keyed by record ID. */
  readonly #idToRecord: Map<ToolIdType, ToolMapEntry>;

  /** In-memory mapping of tool name to record ID. */
  readonly #nameToId: Map<ToolNameType, ToolIdType>;

  /** Promise that resolves when the instance is initialized. */
  #whenInitialized: PromiseWithResolvers<boolean>;

  /** Whether the instance has been initialized. */
  #initialized: boolean = false;

  constructor(
    entriesOrDb?: (readonly [ToolIdType, ToolMapEntry])[] | DbDatabaseType,
  ) {
    this.#idToRecord = new Map();
    this.#nameToId = new Map();
    this.#whenInitialized = Promise.withResolvers<boolean>();
    // Expose init resolvers via a global symbol so static methods don't touch private slots
    (this as unknown as Record<symbol, PromiseWithResolvers<boolean>>)[
      ToolMap.#INIT_KEY
    ] = this.#whenInitialized;
    this.#initialized = false;

    if (Array.isArray(entriesOrDb)) {
      for (const [id, record] of entriesOrDb) {
        this.#idToRecord.set(id, record);
      }
      this.#initializeNameToIdMap();
    } else {
      this.refresh(entriesOrDb);
    }
  }

  /**
   * Synchronous singleton getter. Prefer getInstance() in async flows.
   */
  static get Instance(): ToolMap {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    if (!g[this.#REGISTRY_KEY]) {
      g[this.#REGISTRY_KEY] = new ToolMap();
    }
    this.#instance = g[this.#REGISTRY_KEY]!;
    return this.#instance;
  }

  /**
   * Return the singleton ToolMap instance, initializing from DB if needed.
   */
  static getInstance(db?: DbDatabaseType): Promise<ToolMap> {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    if (!g[this.#REGISTRY_KEY]) {
      g[this.#REGISTRY_KEY] = new ToolMap(db);
    }
    this.#instance = g[this.#REGISTRY_KEY]!;
    const init = (
      this.#instance as unknown as Record<
        symbol,
        PromiseWithResolvers<boolean> | undefined
      >
    )[ToolMap.#INIT_KEY];
    const promise =
      init?.promise ??
      (this.#instance.initialized
        ? Promise.resolve(true)
        : Promise.resolve(true));
    return promise.then(() => this.#instance!);
  }

  /** Setup a mock instance for tests using in-memory entries. */
  static setupMockInstance(
    records: (readonly [ToolIdType, ToolMapEntry])[],
  ): ToolMap {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = new ToolMap(records);
    this.#instance = g[this.#REGISTRY_KEY]!;
    return this.#instance;
  }

  /** Reset the singleton (tests/reinit). */
  static reset(): void {
    type GlobalReg = { [k: symbol]: ToolMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = undefined;
    ToolMap.#instance = undefined;
  }

  /** Whether initialized. */
  get initialized(): boolean {
    return this.#initialized;
  }

  /** Promise that resolves when initialized. */
  get whenInitialized(): Promise<boolean> {
    return this.#whenInitialized.promise;
  }

  /** Iterate entries as [id, record]. */
  get entries(): IterableIterator<[ToolIdType, ToolMapEntry]> {
    return this.#idToRecord.entries();
  }

  /** Return all tool IDs. */
  get allIds(): ToolIdType[] {
    return Array.from(this.#idToRecord.keys());
  }

  /** Return all tool names. */
  get allNames(): ToolNameType[] {
    return Array.from(this.#nameToId.keys());
  }

  /** Lookup a tool record by id or name. */
  record(idOrName: ToolNameOrIdType): ToolMapEntry | undefined {
    // First, try by id
    if (this.#idToRecord.has(idOrName as ToolIdType)) {
      return this.#idToRecord.get(idOrName as ToolIdType);
    }
    // Then, try by name
    const id = this.#nameToId.get(idOrName as ToolNameType);
    return id ? this.#idToRecord.get(id) : undefined;
  }

  /** Lookup a tool record or throw when missing. */
  recordOrThrow(idOrName: ToolNameOrIdType): ToolMapEntry {
    const rec = this.record(idOrName);
    if (rec) return rec;
    throw new ResourceNotFoundError({
      resourceType: 'tool',
      normalized: idOrName,
      inputRaw: idOrName,
      message: `Tool not found: ${String(idOrName)}`,
    });
  }

  /** Return the tool name for an id or name. */
  name(idOrName: ToolNameOrIdType): ToolNameType | undefined {
    const rec = this.record(idOrName);
    return rec?.toolName;
  }

  /** Like name(), but throws if missing. */
  nameOrThrow(idOrName: ToolNameOrIdType): ToolNameType {
    const n = this.name(idOrName);
    if (n) return n;
    throw new ResourceNotFoundError({
      resourceType: 'tool',
      normalized: idOrName,
      inputRaw: idOrName,
      message: `Tool name not found for: ${String(idOrName)}`,
    });
  }

  /** Return the tool id for an id or name. */
  id(idOrName: ToolNameOrIdType): ToolIdType | undefined {
    if (this.#idToRecord.has(idOrName as ToolIdType)) {
      return idOrName as ToolIdType;
    }
    const name = idOrName as ToolNameType;
    return this.#nameToId.get(name);
  }

  /** Like id(), but throws if missing. */
  idOrThrow(idOrName: ToolNameOrIdType): ToolIdType {
    const val = this.id(idOrName);
    if (val) return val;
    throw new ResourceNotFoundError({
      resourceType: 'tool',
      normalized: idOrName,
      inputRaw: idOrName,
      message: `Tool id not found: ${String(idOrName)}`,
    });
  }

  /** Whether a tool exists for id or name. */
  contains(idOrName: ToolNameOrIdType): boolean {
    return !!this.record(idOrName);
  }

  async scanForTools(
    tools:
      | Array<LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool>
      | (LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool),
  ): Promise<number> {
    if (!Array.isArray(tools)) {
      tools = [tools];
    }
    const newEntries = tools
      .filter((tool) => {
        try {
          const id = tool && tool.name && this.name(tool.name);
          return !id;
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Error checking tool existence in ToolMap',
          });
          return false;
        }
      })
      .map((tool) => {
        let chatTool: ChatToolType | null = null;
        switch (tool.type) {
          case 'function':
            chatTool = {
              chatToolId: crypto.randomUUID(),
              toolName: tool.name,
              inputSchema: JSON.stringify(
                tool.inputSchema || { type: 'object' },
              ),
              outputSchema: null,
              providerOptions: tool.providerOptions
                ? JSON.stringify(tool.providerOptions)
                : null,
              description: tool.description || '',
            };
            break;
          case 'provider-defined':
            chatTool = {
              chatToolId: crypto.randomUUID(),
              toolName: tool.name,
              inputSchema: JSON.stringify(tool.args ?? { type: 'object' }),
              outputSchema: null,
              providerOptions: null,
              description: `provider-defined tool: ${tool.id || ''}`,
            };
            break;
          default:
            log((l) =>
              l.warn(
                `Unknown tool type in scanForTools: ${(tool as { type: string })?.type}`,
              ),
            );
        }
        return chatTool;
      })
      .filter(Boolean);
    if (newEntries.length === 0) {
      return 0;
    }
    const db = await drizDbWithInit();
    let processed = 0;
    for (const entry of newEntries) {
      try {
        await db.insert(schema.chatTool).values(entry!).execute();
        this.#idToRecord.set(entry!.chatToolId, entry!);
        this.#nameToId.set(entry!.toolName, entry!.chatToolId);
        processed++;
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          message: 'Error inserting new tool in scanForTools',
          data: { toolName: entry!.toolName },
        });
      }
    }
    return processed;
  }

  /** Refresh caches from database. */
  refresh(db?: DbDatabaseType): Promise<boolean> {
    this.#idToRecord.clear();
    this.#nameToId.clear();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();
    // Re-expose fresh resolvers under the global INIT symbol
    (this as unknown as Record<symbol, PromiseWithResolvers<boolean>>)[
      ToolMap.#INIT_KEY
    ] = this.#whenInitialized;

    const initDb = (!!db ? Promise.resolve(db) : drizDbWithInit())
      .then((database) => database.select().from(schema.chatTool))
      .then((rows) => {
        (rows as ToolMapEntry[]).forEach((row) => {
          this.#idToRecord.set(row.chatToolId, row);
        });
      })
      .then(() => this.#initializeNameToIdMap());

    initDb.catch((err: unknown) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Failed to load tool map from database',
      });
      this.#whenInitialized.reject();
    });

    return this.#whenInitialized.promise;
  }

  #initializeNameToIdMap(): Promise<boolean> {
    this.#nameToId.clear();
    this.#idToRecord.forEach((rec, id) => {
      if (!rec.toolName) {
        log((l) => l.warn(`Invalid tool name for id ${id}`));
        return;
      }
      this.#nameToId.set(rec.toolName, id);
    });
    this.#initialized = true;
    this.#whenInitialized.resolve(true);
    return this.#whenInitialized.promise;
  }
}
