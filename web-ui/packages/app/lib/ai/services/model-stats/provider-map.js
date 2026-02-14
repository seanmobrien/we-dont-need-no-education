import { drizDbWithInit, schema, } from '@compliance-theater/database/orm';
import { LoggedError, log } from '@compliance-theater/logger';
import { ResourceNotFoundError } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { isKeyOf } from '@compliance-theater/typescript';
export const ProviderPrimaryNameTypeValues = [
    'azure',
    'google',
    'openai',
];
export const ProviderAliasTypeValues = [
    'google.generative-ai',
    'azure.chat',
    'azure-openai.chat',
];
export const isProviderName = (value) => isKeyOf(value, ProviderPrimaryNameTypeValues) ||
    isKeyOf(value, ProviderAliasTypeValues);
export class ProviderMap {
    static #INIT_KEY = Symbol.for('@noeducation/model-stats:ProviderMap:init');
    static #REGISTRY_KEY = Symbol.for('@noeducation/model-stats:ProviderMap');
    static get #instance() {
        const g = globalThis;
        return g[this.#REGISTRY_KEY];
    }
    static set #instance(value) {
        const g = globalThis;
        g[this.#REGISTRY_KEY] = value;
    }
    static #ProviderNameKey = 'name';
    static #ProviderAliasesKey = 'aliases';
    static get Instance() {
        const g = globalThis;
        if (!g[this.#REGISTRY_KEY]) {
            g[this.#REGISTRY_KEY] = new ProviderMap();
        }
        this.#instance = g[this.#REGISTRY_KEY];
        return this.#instance;
    }
    static getInstance(db) {
        const g = globalThis;
        if (!g[this.#REGISTRY_KEY]) {
            g[this.#REGISTRY_KEY] = new ProviderMap(db);
        }
        this.#instance = g[this.#REGISTRY_KEY];
        const inst = this.#instance;
        const init = inst[ProviderMap.#INIT_KEY];
        const p = init?.promise ?? inst.whenInitialized ?? Promise.resolve(true);
        return p.then(() => this.#instance);
    }
    static setupMockInstance(records) {
        const g = globalThis;
        g[this.#REGISTRY_KEY] = new ProviderMap(records);
        this.#instance = g[this.#REGISTRY_KEY];
        return this.#instance;
    }
    #idToRecord;
    #nameToId;
    #whenInitialized;
    #initialized = false;
    constructor(entriesOrDb) {
        this.#nameToId = new Map();
        this.#initialized = false;
        this.#whenInitialized = Promise.withResolvers();
        this[ProviderMap.#INIT_KEY] = this.#whenInitialized;
        if (Array.isArray(entriesOrDb)) {
            this.#idToRecord = new Map(entriesOrDb);
            this.#initializeNameToIdMap();
        }
        else {
            this.#idToRecord = new Map();
            this.refresh(entriesOrDb);
        }
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
    get initialized() {
        return this.#initialized;
    }
    get whenInitialized() {
        return this.#whenInitialized.promise;
    }
    record(idOrName) {
        let id;
        if (isProviderName(idOrName)) {
            const check = this.#nameToId.get(idOrName);
            if (!check) {
                return undefined;
            }
            id = check;
        }
        else {
            id = idOrName;
        }
        return this.#idToRecord.get(id);
    }
    recordOrThrow(idOrName) {
        const rec = this.record(idOrName);
        if (rec)
            return rec;
        throw new ResourceNotFoundError({
            resourceType: 'provider',
            normalized: idOrName,
            inputRaw: idOrName,
            message: `Provider not found: ${String(idOrName)}`,
        });
    }
    name(id) {
        const record = this.record(id);
        return record?.[ProviderMap.#ProviderNameKey];
    }
    nameOrThrow(id) {
        const name = this.name(id);
        if (name)
            return name;
        throw new ResourceNotFoundError({
            resourceType: 'provider',
            normalized: id,
            inputRaw: id,
            message: `Provider name not found for: ${String(id)}`,
        });
    }
    id(idOrName) {
        const name = this.name(idOrName);
        return name ? this.#nameToId.get(name) : undefined;
    }
    idOrThrow(idOrName) {
        const val = this.id(idOrName);
        if (val)
            return val;
        throw new ResourceNotFoundError({
            resourceType: 'provider',
            normalized: idOrName,
            inputRaw: idOrName,
            message: `Provider id not found: ${String(idOrName)}`,
        });
    }
    contains(idOrName) {
        return !!this.record(idOrName);
    }
    refresh(db) {
        this.#idToRecord.clear();
        this.#initialized = false;
        this.#whenInitialized = Promise.withResolvers();
        this[ProviderMap.#INIT_KEY] = this.#whenInitialized;
        const initDb = (!!db ? Promise.resolve(db) : drizDbWithInit())
            .then((db) => {
            return db.select().from(schema.providers);
        })
            .then((rows) => {
            rows.forEach(({ id, name, displayName, description, baseUrl, isActive, aliases, }) => {
                this.#idToRecord.set(id, {
                    name,
                    displayName,
                    description,
                    baseUrl,
                    isActive,
                    aliases,
                });
            });
            return Promise.resolve();
        })
            .then(() => this.#initializeNameToIdMap());
        initDb.catch((err) => {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                log: true,
                message: 'Failed to load provider map from database',
            });
            this.#whenInitialized.reject();
        });
        return this.#whenInitialized.promise;
    }
    #initializeNameToIdMap() {
        this.#nameToId.clear();
        this.#idToRecord.forEach((rec, id) => {
            const thisName = rec[ProviderMap.#ProviderNameKey];
            if (isProviderName(thisName)) {
                this.#nameToId.set(thisName, id);
            }
            else {
                log((l) => l.warn(`Invalid provider name for id ${id}: ${thisName}`));
                this.#nameToId.set(thisName, id);
            }
            const aliases = rec[ProviderMap.#ProviderAliasesKey] || [];
            aliases.forEach((alias) => {
                if (isProviderName(alias)) {
                    this.#nameToId.set(alias, id);
                }
                else {
                    log((l) => l.warn(`Invalid provider alias for provider ${thisName} (${id}): ${alias}`));
                    this.#nameToId.set(alias, id);
                }
            });
        });
        this.#initialized = true;
        this.#whenInitialized.resolve(true);
        return this.#whenInitialized.promise;
    }
}
//# sourceMappingURL=provider-map.js.map