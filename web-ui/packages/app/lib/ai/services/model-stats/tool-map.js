import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { LoggedError, log } from '@compliance-theater/logger';
import { ResourceNotFoundError } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { SingletonProvider } from '@compliance-theater/typescript';
const REGISTRY_KEY = '@noeducation/model-stats:ToolMap';
export class ToolMap {
    static get #instance() {
        return SingletonProvider.Instance.get(REGISTRY_KEY);
    }
    static set #instance(value) {
        if (value === undefined) {
            SingletonProvider.Instance.delete(REGISTRY_KEY);
        }
        else {
            SingletonProvider.Instance.set(REGISTRY_KEY, value);
        }
    }
    #idToRecord;
    #nameToId;
    #whenInitialized;
    #initialized = false;
    constructor(entriesOrDb) {
        this.#idToRecord = new Map();
        this.#nameToId = new Map();
        this.#whenInitialized = Promise.withResolvers();
        this.#initialized = false;
        if (Array.isArray(entriesOrDb)) {
            for (const [id, record] of entriesOrDb) {
                this.#idToRecord.set(id, record);
            }
            this.#initializeNameToIdMap();
        }
        else {
            this.refresh(entriesOrDb);
        }
    }
    static get Instance() {
        return SingletonProvider.Instance.getRequired(REGISTRY_KEY, () => new ToolMap());
    }
    static getInstance(db) {
        let ret = ToolMap.#instance;
        if (!ret) {
            ret = new ToolMap(db);
            ToolMap.#instance = ret;
        }
        return ret.whenInitialized.then(() => ret);
    }
    static setupMockInstance(records) {
        const ret = new ToolMap(records);
        this.#instance = ret;
        return ret;
    }
    static reset() {
        ToolMap.#instance = undefined;
    }
    get initialized() {
        return this.#initialized;
    }
    get whenInitialized() {
        return this.#whenInitialized.promise;
    }
    get entries() {
        return this.#idToRecord.entries();
    }
    get allIds() {
        return Array.from(this.#idToRecord.keys());
    }
    get allNames() {
        return Array.from(this.#nameToId.keys());
    }
    record(idOrName) {
        if (this.#idToRecord.has(idOrName)) {
            return this.#idToRecord.get(idOrName);
        }
        const id = this.#nameToId.get(idOrName);
        return id ? this.#idToRecord.get(id) : undefined;
    }
    recordOrThrow(idOrName) {
        const rec = this.record(idOrName);
        if (rec)
            return rec;
        throw new ResourceNotFoundError({
            resourceType: 'tool',
            normalized: idOrName,
            inputRaw: idOrName,
            message: `Tool not found: ${String(idOrName)}`,
        });
    }
    name(idOrName) {
        const rec = this.record(idOrName);
        return rec?.toolName;
    }
    nameOrThrow(idOrName) {
        const n = this.name(idOrName);
        if (n)
            return n;
        throw new ResourceNotFoundError({
            resourceType: 'tool',
            normalized: idOrName,
            inputRaw: idOrName,
            message: `Tool name not found for: ${String(idOrName)}`,
        });
    }
    id(idOrName) {
        if (this.#idToRecord.has(idOrName)) {
            return idOrName;
        }
        const name = idOrName;
        return this.#nameToId.get(name);
    }
    idOrThrow(idOrName) {
        const val = this.id(idOrName);
        if (val)
            return val;
        throw new ResourceNotFoundError({
            resourceType: 'tool',
            normalized: idOrName,
            inputRaw: idOrName,
            message: `Tool id not found: ${String(idOrName)}`,
        });
    }
    contains(idOrName) {
        return !!this.record(idOrName);
    }
    async scanForTools(tools) {
        if (!Array.isArray(tools)) {
            tools = [tools];
        }
        const newEntries = tools
            .filter((tool) => {
            try {
                const id = tool && tool.name && this.name(tool.name);
                return !id;
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Error checking tool existence in ToolMap',
                });
                return false;
            }
        })
            .map((tool) => {
            let chatTool = null;
            switch (tool.type) {
                case 'function':
                    chatTool = {
                        chatToolId: crypto.randomUUID(),
                        toolName: tool.name,
                        inputSchema: JSON.stringify(tool.inputSchema || { type: 'object' }),
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
                    log((l) => l.warn(`Unknown tool type in scanForTools: ${tool?.type}`));
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
                await db.insert(schema.chatTool).values(entry).execute();
                this.#idToRecord.set(entry.chatToolId, entry);
                this.#nameToId.set(entry.toolName, entry.chatToolId);
                processed++;
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Error inserting new tool in scanForTools',
                    data: { toolName: entry.toolName },
                });
            }
        }
        return processed;
    }
    refresh(db) {
        this.#idToRecord.clear();
        this.#nameToId.clear();
        this.#initialized = false;
        this.#whenInitialized = Promise.withResolvers();
        const initDb = (!!db ? Promise.resolve(db) : drizDbWithInit())
            .then((database) => database.select().from(schema.chatTool))
            .then((rows) => {
            rows.forEach((row) => {
                this.#idToRecord.set(row.chatToolId, row);
            });
        })
            .then(() => this.#initializeNameToIdMap());
        initDb.catch((err) => {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                message: 'Failed to load tool map from database',
            });
            this.#whenInitialized.reject();
        });
        return this.#whenInitialized.promise;
    }
    #initializeNameToIdMap() {
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
//# sourceMappingURL=tool-map.js.map