import { ResourceNotFoundError } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { eq, and } from 'drizzle-orm';
import { LoggedError, log } from '@compliance-theater/logger';
import { ProviderMap, ProviderPrimaryNameTypeValues, } from './provider-map';
import { isKeyOf, newUuid } from '@compliance-theater/typescript';
export const ModelAliasNameValues = ['hifi', 'lofi', 'embedding'];
export const EnvironmentAliasMap = {
    azure: {
        hifi: 'AZURE_OPENAI_DEPLOYMENT_HIFI',
        lofi: 'AZURE_OPENAI_DEPLOYMENT_LOFI',
        embedding: 'AZURE_OPENAI_DEPLOYMENT_EMBEDDING',
    },
    google: {
        hifi: 'GOOGLE_GENERATIVE_HIFI',
        lofi: 'GOOGLE_GENERATIVE_LOFI',
        embedding: 'GOOGLE_GENERATIVE_EMBEDDING',
    },
    openai: {
        hifi: 'OPENAI_HIFI',
        lofi: 'OPENAI_LOFI',
        embedding: 'OPENAI_EMBEDDING',
    },
};
export class ModelMap {
    static #INIT_KEY = Symbol.for('@noeducation/model-stats:ModelMap:init');
    static #REGISTRY_KEY = Symbol.for('@noeducation/model-stats:ModelMap');
    static get #instance() {
        const g = globalThis;
        return g[this.#REGISTRY_KEY];
    }
    static set #instance(value) {
        const g = globalThis;
        g[this.#REGISTRY_KEY] = value;
    }
    #providerModelToRecord;
    #idToRecord;
    #modelIdToQuota;
    #whenInitialized;
    #initialized = false;
    #lastCacheUpdate = 0;
    #CACHE_TTL = 5 * 60 * 1000;
    constructor(modelsOrDb) {
        this.#providerModelToRecord = new Map();
        this.#idToRecord = new Map();
        this.#modelIdToQuota = new Map();
        this.#initialized = false;
        this.#whenInitialized = Promise.withResolvers();
        this[ModelMap.#INIT_KEY] = this.#whenInitialized;
        if (Array.isArray(modelsOrDb)) {
            for (const [key, record] of modelsOrDb) {
                this.#providerModelToRecord.set(key, record);
                this.#idToRecord.set(record.id, record);
            }
            this.#initialized = true;
            this.#lastCacheUpdate = Date.now();
            this.#whenInitialized.resolve(true);
        }
    }
    static get Instance() {
        const g = globalThis;
        if (!g[this.#REGISTRY_KEY]) {
            g[this.#REGISTRY_KEY] = new ModelMap();
        }
        this.#instance = g[this.#REGISTRY_KEY];
        return this.#instance;
    }
    static async getInstance(db) {
        const g = globalThis;
        let inst = g[this.#REGISTRY_KEY];
        if (!inst) {
            inst = new ModelMap(db);
            g[this.#REGISTRY_KEY] = inst;
            this.#instance = inst;
            const init = inst[ModelMap.#INIT_KEY];
            const p = (init?.promise ?? Promise.resolve(true))
                .then((x) => {
                log((l) => l.silly('ModelMap initialized successfully'));
                return x;
            })
                .catch((e) => {
                this.#instance = undefined;
                g[this.#REGISTRY_KEY] = undefined;
                LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    log: true,
                    message: 'Uncaught error during ModelMap initialization',
                    source: 'ModelMap.Instance',
                });
            });
            inst.refresh(db);
            await p;
            return inst;
        }
        this.#instance = inst;
        const init2 = inst[ModelMap.#INIT_KEY];
        await (init2?.promise ?? Promise.resolve(true)).catch(() => { });
        return inst;
    }
    static setupMockInstance(records, quotas) {
        const g = globalThis;
        g[this.#REGISTRY_KEY] = new ModelMap(records);
        this.#instance = g[this.#REGISTRY_KEY];
        for (const [key, record] of quotas) {
            this.#instance.#modelIdToQuota.set(key, record);
        }
        return this.#instance;
    }
    static reset() {
        const g = globalThis;
        g[this.#REGISTRY_KEY] = undefined;
        ModelMap.#instance = undefined;
    }
    async refresh(db) {
        const tempProviderModelToRecord = new Map();
        const tempIdToRecord = new Map();
        const tempModelIdToQuota = new Map();
        if (this.#initialized) {
            this.#whenInitialized = Promise.withResolvers();
        }
        try {
            const database = db || (await drizDbWithInit());
            const [modelsWithProviders, quotas] = await Promise.all([
                database
                    .select({
                    modelId: schema.models.id,
                    providerId: schema.models.providerId,
                    modelName: schema.models.modelName,
                    displayName: schema.models.displayName,
                    description: schema.models.description,
                    isActive: schema.models.isActive,
                    createdAt: schema.models.createdAt,
                    updatedAt: schema.models.updatedAt,
                    providerName: schema.providers.name,
                })
                    .from(schema.models)
                    .innerJoin(schema.providers, eq(schema.models.providerId, schema.providers.id))
                    .where(eq(schema.models.isActive, true))
                    .execute(),
                database
                    .select()
                    .from(schema.modelQuotas)
                    .where(eq(schema.modelQuotas.isActive, true))
                    .execute(),
            ]).catch((error) => {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ModelMap.refresh:populateCaches-query',
                });
            });
            const now = new Date(Date.now());
            const loaded = (await Promise.all([
                (async () => {
                    Array.from(modelsWithProviders ?? []).forEach((row) => {
                        const record = {
                            id: row.modelId,
                            providerId: row.providerId,
                            providerName: row.providerName,
                            modelName: row.modelName,
                            displayName: row.displayName || undefined,
                            description: row.description || undefined,
                            isActive: row.isActive,
                            createdAt: row.createdAt ?? now.toISOString(),
                            updatedAt: row.updatedAt ?? now.toISOString(),
                        };
                        tempProviderModelToRecord.set(`${row.providerId}:${row.modelName}`, record);
                        tempIdToRecord.set(row.modelId, record);
                    });
                    return true;
                })(),
                (async () => {
                    Array.from(quotas ?? []).forEach((quota) => {
                        const quotaRecord = {
                            id: quota.id,
                            modelId: quota.modelId,
                            maxTokensPerMessage: quota.maxTokensPerMessage || undefined,
                            maxTokensPerMinute: quota.maxTokensPerMinute || undefined,
                            maxTokensPerDay: quota.maxTokensPerDay || undefined,
                            isActive: quota.isActive,
                            createdAt: quota.createdAt ?? now.toISOString(),
                            updatedAt: quota.updatedAt ?? now.toISOString(),
                        };
                        tempModelIdToQuota.set(quota.modelId, quotaRecord);
                    });
                    return true;
                })(),
            ]).catch((error) => {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ModelMap.refresh:populateCaches-load',
                });
            })).every(Boolean);
            if (loaded) {
                this.#providerModelToRecord.clear();
                tempProviderModelToRecord.forEach((value, key) => this.#providerModelToRecord.set(key, value));
                this.#idToRecord.clear();
                tempIdToRecord.forEach((value, key) => this.#idToRecord.set(key, value));
                this.#modelIdToQuota.clear();
                tempModelIdToQuota.forEach((value, key) => this.#modelIdToQuota.set(key, value));
                this.#initialized = true;
                this.#lastCacheUpdate = Date.now();
            }
            this.#whenInitialized.resolve(loaded);
            return loaded;
        }
        catch (error) {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to refresh ModelMap from database',
                source: 'ModelMap.refresh',
            });
            this.#whenInitialized.resolve(false);
            throw le;
        }
    }
    get entries() {
        return this.#providerModelToRecord.entries();
    }
    get allIds() {
        return Array.from(this.#idToRecord.keys());
    }
    get allProviderModelKeys() {
        return Array.from(this.#providerModelToRecord.keys());
    }
    get initialized() {
        return this.#initialized;
    }
    get whenInitialized() {
        return this.#whenInitialized.promise;
    }
    async normalizeProviderModel(providerOrModel, modelName) {
        if (typeof providerOrModel === 'object' && providerOrModel) {
            return await this.normalizeProviderModel(providerOrModel.provider, providerOrModel.modelId);
        }
        let provider;
        let parsedModelName;
        if (providerOrModel.includes(':')) {
            const [providerPart, modelPart] = providerOrModel.split(':', 2);
            provider = providerPart.trim();
            parsedModelName = modelPart.trim() || (modelName?.trim() ?? '');
        }
        else {
            provider = providerOrModel?.trim() ?? '';
            parsedModelName = modelName?.trim() ?? '';
            if (!parsedModelName) {
                if (['gemini-', 'google-'].some((prefix) => provider.startsWith(prefix))) {
                    parsedModelName = provider;
                    provider = 'google';
                }
                else {
                    parsedModelName = provider;
                    provider = 'azure';
                }
            }
        }
        try {
            const [providerMap] = await Promise.all([
                ProviderMap.getInstance(),
                this.whenInitialized,
            ]);
            const providerId = providerMap.id(provider);
            const providerCanonicalName = providerId
                ? isKeyOf(provider, ProviderPrimaryNameTypeValues)
                    ? provider
                    : providerMap.name(providerId)
                : undefined;
            const record = providerId
                ? this.#providerModelToRecord.get(`${providerId}:${parsedModelName}`)
                : undefined;
            const modelId = record?.id;
            return {
                provider: providerCanonicalName,
                modelName: parsedModelName,
                modelId: modelId,
                providerId: providerId,
                get classification() {
                    if (!modelId) {
                        return undefined;
                    }
                    if (modelId.includes('hifi') ||
                        modelId.includes('gpt-4') ||
                        (modelId.includes('gemini') && modelId.includes('pro'))) {
                        return 'hifi';
                    }
                    if (modelId.includes('lofi') ||
                        modelId.includes('gpt-3.5') ||
                        (modelId.includes('gpt-') && modelId.includes('mini')) ||
                        (modelId.includes('gemini') && modelId.includes('flash'))) {
                        return 'lofi';
                    }
                    if (modelId.includes('embedding')) {
                        return 'embedding';
                    }
                    if (modelId.includes('completions')) {
                        return 'completions';
                    }
                    return 'hifi';
                },
                rethrow: () => {
                    if (!providerId) {
                        throw new ResourceNotFoundError({
                            resourceType: 'provider',
                            normalized: provider,
                            inputRaw: providerOrModel,
                            message: `Provider not found: ${provider}`,
                        });
                    }
                    if (!modelId) {
                        throw new ResourceNotFoundError({
                            resourceType: 'model',
                            normalized: `${providerId}:${parsedModelName}`,
                            inputRaw: { providerOrModel, modelName },
                            message: `Model not found for provider ${provider}: ${parsedModelName}`,
                        });
                    }
                },
            };
        }
        catch (error) {
            const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error normalizing provider/model',
                extra: { providerOrModel, modelName },
                source: 'ModelMap.normalizeProviderModel',
            });
            return {
                provider,
                modelId: undefined,
                modelName: parsedModelName,
                providerId: undefined,
                classification: undefined,
                rethrow: () => {
                    throw loggedError;
                },
            };
        }
    }
    async normalizeProviderModelOrThrow(providerOrModel, modelName) {
        const norm = await this.normalizeProviderModel(providerOrModel, modelName);
        norm.rethrow();
        return {
            provider: norm.provider,
            modelName: norm.modelName,
            providerId: norm.providerId,
            modelId: norm.modelId,
        };
    }
    async getModelByProviderAndName(provider, modelName) {
        await this.#ensureFreshCache();
        const { modelName: normalizedModelName, rethrow, providerId: normalizedProviderId, } = await this.normalizeProviderModel(provider, modelName);
        try {
            rethrow();
            const key = `${normalizedProviderId}:${normalizedModelName}`;
            return this.#providerModelToRecord.get(key) || null;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error getting model by provider and name',
                extra: { provider, modelName },
                source: 'ModelMap.getModelByProviderAndName',
            });
            return null;
        }
    }
    async getModelById(modelId) {
        try {
            if (!modelId) {
                throw new TypeError('modelId is required to get model by ID.');
            }
            await this.#ensureFreshCache();
            return this.#idToRecord.get(modelId) || null;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ModelMap.getModelById',
                data: { modelId },
            });
        }
        return null;
    }
    async getQuotaByModelId(modelId) {
        try {
            await this.#ensureFreshCache();
            return this.#modelIdToQuota.get(modelId) || null;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ModelMap.getQuotaByModelId',
                data: { modelId },
            });
        }
        return null;
    }
    async addQuotaToModel(record) {
        if (!record.modelId) {
            throw new TypeError('modelId is required when adding a quota record.');
        }
        await this.#ensureFreshCache();
        let current = this.#modelIdToQuota.get(record.modelId);
        const now = new Date().toISOString();
        if (current) {
            current.maxTokensPerDay = record.maxTokensPerDay;
            current.maxTokensPerMinute = record.maxTokensPerMinute;
            current.maxTokensPerMessage = record.maxTokensPerMessage;
            current.isActive = record.isActive ?? true;
            current.updatedAt = now;
        }
        else {
            current = {
                ...record,
                id: record.id ?? newUuid(),
                createdAt: now,
                updatedAt: now,
                isActive: record.isActive ?? true,
            };
        }
        this.#modelIdToQuota.set(record.modelId, current);
        return current;
    }
    async getQuotaByModel(model) {
        return this.getQuotaByModelId(model.id);
    }
    async getModelWithQuota(provider, modelName) {
        const model = await this.getModelByProviderAndName(provider, modelName);
        if (!model)
            return null;
        const quota = await this.getQuotaByModelId(model.id);
        return {
            ...model,
            quota: quota || undefined,
        };
    }
    async getModelFromLanguageModel(languageModel) {
        try {
            const provider = languageModel.provider;
            const modelId = languageModel.modelId;
            if (!provider || !modelId) {
                LoggedError.isTurtlesAllTheWayDownBaby(new Error('Missing provider or modelId in LanguageModelV1 instance'), {
                    log: true,
                    message: 'Unable to extract provider/model from LanguageModelV1',
                    extra: {
                        hasProvider: !!provider,
                        hasModelId: !!modelId,
                        keys: Object.keys(languageModel),
                    },
                    source: 'ModelMap.getModelFromLanguageModelV1',
                });
                return null;
            }
            let normalizedModelName = modelId;
            if (provider.includes('azure') && normalizedModelName.includes(':')) {
                normalizedModelName =
                    normalizedModelName.split(':').pop() || normalizedModelName;
            }
            if (provider.includes('google') &&
                normalizedModelName.startsWith('models/')) {
                normalizedModelName = normalizedModelName.replace('models/', '');
            }
            return await this.getModelWithQuota(provider, normalizedModelName);
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error getting model from LanguageModelV1',
                extra: {
                    languageModelType: typeof languageModel,
                    languageModelKeys: Object.keys(languageModel || {}),
                },
                source: 'ModelMap.getModelFromLanguageModelV1',
            });
            return null;
        }
    }
    async loadQuotaFromDatabase(provider, modelName) {
        try {
            return await drizDbWithInit(async (db) => {
                const row = await db
                    .select({
                    id: schema.modelQuotas.id,
                    modelId: schema.modelQuotas.modelId,
                    maxTokensPerMessage: schema.modelQuotas.maxTokensPerMessage,
                    maxTokensPerMinute: schema.modelQuotas.maxTokensPerMinute,
                    maxTokensPerDay: schema.modelQuotas.maxTokensPerDay,
                    isActive: schema.modelQuotas.isActive,
                    createdAt: schema.modelQuotas.createdAt,
                    updatedAt: schema.modelQuotas.updatedAt,
                })
                    .from(schema.modelQuotas)
                    .innerJoin(schema.models, eq(schema.modelQuotas.modelId, schema.models.id))
                    .where(and(eq(schema.models.providerId, provider), eq(schema.models.modelName, modelName), eq(schema.modelQuotas.isActive, true)))
                    .limit(1)
                    .execute()
                    .then((r) => r.at(0));
                if (!row) {
                    return null;
                }
                const now = row.createdAt ?? row.updatedAt ?? new Date(Date.now()).toISOString();
                return {
                    id: row.id,
                    modelId: row.modelId,
                    maxTokensPerMessage: row.maxTokensPerMessage || undefined,
                    maxTokensPerMinute: row.maxTokensPerMinute || undefined,
                    maxTokensPerDay: row.maxTokensPerDay || undefined,
                    isActive: row.isActive,
                    createdAt: now,
                    updatedAt: now,
                };
            });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error loading quota from database',
                extra: { provider, modelName },
                source: 'ModelMap.loadQuotaFromDatabase',
            });
            try {
                const { modelId } = await this.normalizeProviderModelOrThrow(provider, modelName);
                return modelId ? this.#modelIdToQuota.get(modelId) ?? null : null;
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    extra: { provider, modelName },
                    source: 'ModelMap.loadQuotaFromDatabase',
                });
            }
            return null;
        }
    }
    async #ensureFreshCache() {
        const isInitialized = this.#initialized;
        const isFresh = Date.now() - this.#lastCacheUpdate < this.#CACHE_TTL;
        if (!(isInitialized && isFresh)) {
            try {
                await this.refresh();
            }
            catch (error) {
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ModelMap.#ensureFreshCache',
                });
                if (!isInitialized) {
                    throw le;
                }
            }
        }
    }
    async id(provider, modelName) {
        const model = await this.getModelByProviderAndName(provider, modelName);
        return model?.id;
    }
    async modelName(modelId) {
        const model = await this.getModelById(modelId);
        return model?.modelName;
    }
    async providerId(modelId) {
        const model = await this.getModelById(modelId);
        return model?.providerId;
    }
    async providerName(modelId) {
        const model = await this.getModelById(modelId);
        return model?.providerName;
    }
    async record(provider, modelName) {
        const model = await this.getModelByProviderAndName(provider, modelName);
        return model || undefined;
    }
    async contains(provider, modelName) {
        const model = await this.getModelByProviderAndName(provider, modelName);
        return model !== null;
    }
    async getModelsForProvider(provider) {
        await this.#ensureFreshCache();
        const { providerId, rethrow } = await this.normalizeProviderModel(provider, '');
        try {
            rethrow();
            const models = [];
            for (const [key, record] of this.#providerModelToRecord.entries()) {
                if (key.startsWith(`${providerId}:`)) {
                    models.push(record);
                }
            }
            return models;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Error getting models for provider',
                extra: { provider },
                source: 'ModelMap.getModelsForProvider',
            });
            return [];
        }
    }
}
//# sourceMappingURL=model-map.js.map