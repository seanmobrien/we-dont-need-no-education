import { drizDbWithInit, type DbDatabaseType, schema } from '@/lib/drizzle-db';
import type { ChatToolType } from '@/lib/drizzle-db/drizzle-types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ResourceNotFoundError } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { log } from '@repo/lib-logger';
import type {
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2FunctionTool,
} from '@ai-sdk/provider';
import { SingletonProvider } from '@repo/lib-typescript';

type ToolMapEntry = ChatToolType;
type ToolIdType = ChatToolType['chatToolId'];
type ToolNameType = ChatToolType['toolName'];
type ToolNameOrIdType = ToolIdType | ToolNameType;

const REGISTRY_KEY = '@noeducation/model-stats:ToolMap';

export class ToolMap {
  static get #instance(): ToolMap | undefined {
    return SingletonProvider.Instance.get<ToolMap>(REGISTRY_KEY);
  }
  static set #instance(value: ToolMap | undefined) {
    if (value === undefined) {
      SingletonProvider.Instance.delete(REGISTRY_KEY);
    } else {
      SingletonProvider.Instance.set<ToolMap>(REGISTRY_KEY, value);
    }
  }

  readonly #idToRecord: Map<ToolIdType, ToolMapEntry>;

  readonly #nameToId: Map<ToolNameType, ToolIdType>;

  #whenInitialized: PromiseWithResolvers<boolean>;

  #initialized: boolean = false;

  constructor(
    entriesOrDb?: (readonly [ToolIdType, ToolMapEntry])[] | DbDatabaseType,
  ) {
    this.#idToRecord = new Map();
    this.#nameToId = new Map();
    this.#whenInitialized = Promise.withResolvers<boolean>();
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

  static get Instance(): ToolMap {
    return SingletonProvider.Instance.getRequired<ToolMap>(
      REGISTRY_KEY,
      () => new ToolMap(),
    );
  }

  static getInstance(db?: DbDatabaseType): Promise<ToolMap> {
    let ret = ToolMap.#instance;
    if (!ret) {
      ret = new ToolMap(db);
      ToolMap.#instance = ret;
    }
    return ret.whenInitialized.then(() => ret!);
  }

  static setupMockInstance(
    records: (readonly [ToolIdType, ToolMapEntry])[],
  ): ToolMap {
    const ret = new ToolMap(records);
    this.#instance = ret;
    return ret;
  }
  static reset(): void {
    ToolMap.#instance = undefined;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  get whenInitialized(): Promise<boolean> {
    return this.#whenInitialized.promise;
  }

  get entries(): IterableIterator<[ToolIdType, ToolMapEntry]> {
    return this.#idToRecord.entries();
  }

  get allIds(): ToolIdType[] {
    return Array.from(this.#idToRecord.keys());
  }

  get allNames(): ToolNameType[] {
    return Array.from(this.#nameToId.keys());
  }

  record(idOrName: ToolNameOrIdType): ToolMapEntry | undefined {
    // First, try by id
    if (this.#idToRecord.has(idOrName as ToolIdType)) {
      return this.#idToRecord.get(idOrName as ToolIdType);
    }
    // Then, try by name
    const id = this.#nameToId.get(idOrName as ToolNameType);
    return id ? this.#idToRecord.get(id) : undefined;
  }

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

  name(idOrName: ToolNameOrIdType): ToolNameType | undefined {
    const rec = this.record(idOrName);
    return rec?.toolName;
  }

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

  id(idOrName: ToolNameOrIdType): ToolIdType | undefined {
    if (this.#idToRecord.has(idOrName as ToolIdType)) {
      return idOrName as ToolIdType;
    }
    const name = idOrName as ToolNameType;
    return this.#nameToId.get(name);
  }

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

  refresh(db?: DbDatabaseType): Promise<boolean> {
    this.#idToRecord.clear();
    this.#nameToId.clear();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();

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
