import { ResourceNotFoundError } from '/lib/ai/services/chat/errors/resource-not-found-error';
/**
 * @module lib/ai/services/model-stats/model-map
 * @fileoverview
 * ModelMap provides centralized management of model configurations, quotas, and metadata.
 * It follows the singleton pattern with local caching and database persistence.
 * Supports normalization of provider/model names and direct lookup from LanguageModelV1 instances.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-08-23
 */

import { drizDbWithInit, type DbDatabaseType } from '/lib/drizzle-db';
import { schema } from '/lib/drizzle-db/schema';
import { eq, and } from 'drizzle-orm';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import {
  ProviderMap,
  ProviderPrimaryNameType,
  ProviderPrimaryNameTypeValues,
} from './provider-map';
import { log } from '/lib/logger';
import { LanguageModel } from 'ai';
import { ModelClassification } from '../../middleware/key-rate-limiter/types';
import { isKeyOf, newUuid } from '/lib/typescript';

/**
 * Type representing a complete model record with provider information.
 */
export type ModelRecord = {
  id: string;
  providerId: string;
  providerName?: string;
  modelName: string;
  displayName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Type representing optional fields when creating or updating a model quota.
 */
type UpdateOptionalQuotaFields = 'id' | 'createdAt' | 'updatedAt' | 'isActive';

/**
 * Type representing a model quota configuration.
 */
export type ModelQuotaRecord = {
  id: string;
  modelId: string;
  maxTokensPerMessage?: number;
  maxTokensPerMinute?: number;
  maxTokensPerDay?: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * Type representing a complete model with its quota configuration.
 */
export type ModelWithQuota = ModelRecord & {
  quota?: ModelQuotaRecord;
};

/**
 * Type for provider/model name normalization results.
 */
export type ProviderModelNormalization = {
  provider: string;
  modelName: string;
  modelId: string;
  providerId: string;
  rethrow: () => void;
  get classification(): ModelClassification;
};

/**
 * List of aliased model names.
 */
export const ModelAliasNameValues = ['hifi', 'lofi', 'embedding'] as const;

export type ModelAliasNameType = (typeof ModelAliasNameValues)[number];

/**
 * Maps alias names to environment variables per provider.
 */
export const EnvironmentAliasMap: Record<
  ProviderPrimaryNameType,
  Record<ModelAliasNameType, string>
> = {
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
} as const;

/**
 * Apparently I was just waiting for typescript to catch up?
 * keeping around in case we wind up needing it
type ModelRowExt = {
  modelId: string;
  providerId: string;
  modelName: string;
  displayName: string;
  description: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
  providerName: string;
};
 */

/**
 * ModelMap provides centralized management of AI model configurations and quotas.
 * Uses singleton pattern with local caching and database persistence.
 *
 * Key features:
 * - Singleton instance with lazy initialization
 * - Local caching with TTL for performance
 * - Provider/model name normalization
 * - Direct lookup from LanguageModelV1 instances
 * - Comprehensive quota management
 *
 * @example
 * ```typescript
 * const modelMap = await ModelMap.getInstance();
 * const model = await modelMap.getModelByProviderAndName('azure-openai.chat', 'gpt-4');
 * const quota = await modelMap.getQuotaByModel(model);
 * ```
 */
export class ModelMap {
  /** Global symbol key to access init resolvers across module copies/HMR. */
  static readonly #INIT_KEY = Symbol.for(
    '@noeducation/model-stats:ModelMap:init',
  );
  /** Symbol-based global registry key for ModelMap singleton. */
  static readonly #REGISTRY_KEY = Symbol.for(
    '@noeducation/model-stats:ModelMap',
  );
  /** Local cached reference to the global singleton via global symbol registry. */
  static get #instance(): ModelMap | undefined {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    return g[this.#REGISTRY_KEY];
  }
  static set #instance(value: ModelMap | undefined) {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = value;
  }

  /** In-memory cache for model records, keyed by `${providerId}:${modelName}`. */
  readonly #providerModelToRecord: Map<string, ModelRecord>;

  /** In-memory cache for model records, keyed by model ID. */
  readonly #idToRecord: Map<string, ModelRecord>;

  /** In-memory cache for quota records, keyed by model ID. */
  readonly #modelIdToQuota: Map<string, ModelQuotaRecord>;

  /** Promise that resolves when the instance is initialized. */
  #whenInitialized: PromiseWithResolvers<boolean>;

  /** Whether the instance has been initialized. */
  #initialized: boolean = false;

  /** Timestamp of last cache update (ms since epoch). */
  #lastCacheUpdate = 0;

  /** Cache time-to-live in milliseconds (default: 5 minutes). */
  readonly #CACHE_TTL = 5 * 60 * 1000;

  /**
   * Private constructor for singleton pattern.
   * @param {(readonly [string, ModelRecord])[] | DbDatabaseType} [modelsOrDb] - Initial models or database instance.
   */
  private constructor(
    modelsOrDb?: (readonly [string, ModelRecord])[] | DbDatabaseType,
  ) {
    this.#providerModelToRecord = new Map();
    this.#idToRecord = new Map();
    this.#modelIdToQuota = new Map();
    this.#initialized = false;
    this.#whenInitialized = Promise.withResolvers<boolean>();
    (this as unknown as Record<symbol, PromiseWithResolvers<boolean>>)[
      ModelMap.#INIT_KEY
    ] = this.#whenInitialized;
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

  /**
   * Get the singleton instance of ModelMap.
   * @returns {ModelMap} The singleton instance.
   */
  static get Instance(): ModelMap {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    if (!g[this.#REGISTRY_KEY]) {
      // Create without DB here; callers who need DB-backed init should call getInstance(db)
      g[this.#REGISTRY_KEY] = new ModelMap();
    }
    this.#instance = g[this.#REGISTRY_KEY]!;
    return this.#instance;
  }

  /**
   * Get the singleton instance with initialization guarantee.
   * @param {DbDatabaseType} [db] - Optional database instance.
   * @returns {Promise<ModelMap>} Promise that resolves to the initialized instance.
   */
  static async getInstance(db?: DbDatabaseType): Promise<ModelMap> {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    let inst = g[this.#REGISTRY_KEY];
    if (!inst) {
      inst = new ModelMap(db);
      g[this.#REGISTRY_KEY] = inst;
      this.#instance = inst;
      const init = (
        inst as unknown as Record<
          symbol,
          PromiseWithResolvers<boolean> | undefined
        >
      )[ModelMap.#INIT_KEY];
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
    const init2 = (
      inst as unknown as Record<
        symbol,
        PromiseWithResolvers<boolean> | undefined
      >
    )[ModelMap.#INIT_KEY];
    await (init2?.promise ?? Promise.resolve(true)).catch(() => {});
    return inst;
  }

  /**
   * Setup a mock instance of ModelMap for testing.
   * @param records - The model records to initialize the map with.
   * @returns The initialized ModelMap instance.
   */
  static setupMockInstance(
    records: (readonly [string, ModelRecord])[],
    quotas: (readonly [string, ModelQuotaRecord])[],
  ): ModelMap {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = new ModelMap(records);
    this.#instance = g[this.#REGISTRY_KEY]!;
    for (const [key, record] of quotas) {
      this.#instance.#modelIdToQuota.set(key, record);
    }
    return this.#instance;
  }

  /**
   * Reset the singleton instance (for testing or reinitialization).
   */
  static reset(): void {
    type GlobalReg = { [k: symbol]: ModelMap | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = undefined;
    ModelMap.#instance = undefined;
  }

  /**
   * Refresh the model and quota data from the database.
   *
   * @param {DbDatabaseType} [db] - Optional database instance.
   * @returns {Promise<boolean>} Promise that resolves to true when refresh is complete.
   */
  async refresh(db?: DbDatabaseType): Promise<boolean> {
    this.#providerModelToRecord.clear();
    this.#idToRecord.clear();
    this.#modelIdToQuota.clear();
    if (this.#initialized) {
      this.#initialized = false;
      this.#whenInitialized = Promise.withResolvers<boolean>();
    }

    try {
      const database = db || (await drizDbWithInit());
      // Load models with provider information
      const modelsWithProviders = database
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
        .innerJoin(
          schema.providers,
          eq(schema.models.providerId, schema.providers.id),
        )
        .where(eq(schema.models.isActive, true))
        .execute();

      // Load all quotas
      const quotas = database
        .select()
        .from(schema.modelQuotas)
        .where(eq(schema.modelQuotas.isActive, true))
        .execute();

      // Populate model caches - ensure we have an array to iterate over
      const now = new Date(Date.now());
      Array.from((await modelsWithProviders) ?? []).forEach((row) => {
        const record: ModelRecord = {
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
        this.#providerModelToRecord.set(
          `${row.providerId}:${row.modelName}`,
          record,
        );
        this.#idToRecord.set(row.modelId, record);
      });

      // Populate quota cache - ensure we have an array to iterate over
      Array.from((await quotas) ?? []).forEach((quota) => {
        const quotaRecord: ModelQuotaRecord = {
          id: quota.id,
          modelId: quota.modelId,
          maxTokensPerMessage: quota.maxTokensPerMessage || undefined,
          maxTokensPerMinute: quota.maxTokensPerMinute || undefined,
          maxTokensPerDay: quota.maxTokensPerDay || undefined,
          isActive: quota.isActive,
          createdAt: quota.createdAt ?? now.toISOString(),
          updatedAt: quota.updatedAt ?? now.toISOString(),
        };
        this.#modelIdToQuota.set(quota.modelId, quotaRecord);
      });
      this.#initialized = true;
      this.#lastCacheUpdate = Date.now();
      this.#whenInitialized.resolve(true);
      return true;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to refresh ModelMap from database',
        source: 'ModelMap.refresh',
      });
      this.#whenInitialized.reject(error);
      throw error;
    }
  }

  /**
   * Get all model records as an iterable.
   * @returns {IterableIterator<[string, ModelRecord]>} Iterator over provider:model key-value pairs.
   */
  get entries(): IterableIterator<[string, ModelRecord]> {
    return this.#providerModelToRecord.entries();
  }

  /**
   * Get all model IDs.
   * @returns {string[]} Array of all model IDs.
   */
  get allIds(): string[] {
    return Array.from(this.#idToRecord.keys());
  }

  /**
   * Get all provider:model keys.
   * @returns {string[]} Array of all provider:model combinations.
   */
  get allProviderModelKeys(): string[] {
    return Array.from(this.#providerModelToRecord.keys());
  }

  /**
   * Check if the instance is initialized.
   * @returns {boolean} True if initialized.
   */
  get initialized(): boolean {
    return this.#initialized;
  }

  /**
   * Get a promise that resolves when the instance is initialized.
   * @returns {Promise<boolean>} Promise that resolves to true when initialized.
   */
  get whenInitialized(): Promise<boolean> {
    return this.#whenInitialized.promise;
  }

  /**
   * Normalize provider and model names for consistent storage and lookup.
   * Handles both separate and 'provider:model' formats.
   *
   * @param {string} providerOrModel - Provider name or 'provider:model' string.
   * @param {string} [modelName] - Optional model name.
   * @returns {Promise<ProviderModelNormalization>} Normalized provider and model information.
   *
   * @example
   * ```typescript
   * const norm1 = await modelMap.normalizeProviderModel('azure-openai.chat', 'gpt-4');
   * const norm2 = await modelMap.normalizeProviderModel('azure-openai.chat:gpt-4');
   * ```
   */
  async normalizeProviderModel(
    providerOrModel: LanguageModel,
    modelName?: string,
  ): Promise<ProviderModelNormalization> {
    if (typeof providerOrModel === 'object' && providerOrModel) {
      return await this.normalizeProviderModel(
        providerOrModel.provider,
        providerOrModel.modelId,
      );
    }
    // Parse provider:model format if present
    let provider: string;
    let parsedModelName: string;

    if (providerOrModel.includes(':')) {
      const [providerPart, modelPart] = providerOrModel.split(':', 2);
      provider = providerPart.trim();
      parsedModelName = modelPart.trim() || (modelName?.trim() ?? '');
    } else {
      provider = providerOrModel?.trim() ?? '';
      parsedModelName = modelName?.trim() ?? '';
      if (!parsedModelName) {
        // Sometimes we get the model name and only the model name - usually when dealing with an alias (eg 'hifi') or unique model name.
        // Apply common-sense provider detection rules to try and flesh this out.
        // If it has 'gemini' or 'google' as a prefix it's a google model
        if (
          ['gemini-', 'google-'].some((prefix) => provider.startsWith(prefix))
        ) {
          parsedModelName = provider;
          provider = 'google';
        } else {
          // Everything else defaults to azure
          parsedModelName = provider;
          provider = 'azure';
        }
      }
    }
    // Get provider ID from ProviderMap
    try {
      // Give maps a chance to finish initialization
      const [providerMap] = await Promise.all([
        ProviderMap.getInstance(),
        this.whenInitialized,
      ]);
      // Get provider ID from ProviderMap - note providermap.id is a synchronous function, so no await is necessary.
      const providerId = providerMap.id(provider);
      const providerCanonicalName = providerId
        ? isKeyOf(provider, ProviderPrimaryNameTypeValues)
          ? provider
          : providerMap.name(providerId)!
        : undefined;
      // If provider ID was found then use it pull the model, otherwise set id to undefined
      const record = providerId
        ? this.#providerModelToRecord.get(`${providerId}:${parsedModelName}`)
        : undefined;
      const modelId = record?.id;
      // Return normalized results with an error rethrow callback
      return {
        provider: providerCanonicalName!,
        modelName: parsedModelName,
        modelId: modelId!,
        providerId: providerId!,
        get classification(): ModelClassification {
          if (!modelId) {
            // HACK: undefined does not a modelclassification make,
            // however I should never have a null /undefined modelId
            // either, so good for the goose good for the gander.
            return undefined as unknown as ModelClassification;
          }
          if (
            modelId.includes('hifi') ||
            modelId.includes('gpt-4') ||
            (modelId.includes('gemini') && modelId.includes('pro'))
          ) {
            return 'hifi';
          }
          if (
            modelId.includes('lofi') ||
            modelId.includes('gpt-3.5') ||
            (modelId.includes('gemini') && modelId.includes('flash'))
          ) {
            return 'lofi';
          }
          if (modelId.includes('embedding')) {
            return 'embedding';
          }
          if (modelId.includes('completions')) {
            return 'completions';
          }

          return 'hifi'; // default fallback
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
    } catch (error) {
      // Log the failure
      const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error normalizing provider/model',
        extra: { providerOrModel, modelName },
        source: 'ModelMap.normalizeProviderModel',
      });
      // Yeah, i know...undefined as unknown as string is evil...but thats
      // what the rethrow callback is for ;)
      return {
        provider,
        modelId: undefined as unknown as string,
        modelName: parsedModelName,
        providerId: undefined as unknown as string,
        classification: undefined as unknown as ModelClassification,
        rethrow: () => {
          throw loggedError;
        },
      };
    }
  }

  /** Helper that throws ResourceNotFoundError when provider/model can’t be normalized */
  async normalizeProviderModelOrThrow(
    providerOrModel: string,
    modelName?: string,
  ): Promise<
    Required<
      Pick<
        ProviderModelNormalization,
        'provider' | 'modelName' | 'providerId' | 'modelId'
      >
    >
  > {
    const norm = await this.normalizeProviderModel(providerOrModel, modelName);
    norm.rethrow();
    return {
      provider: norm.provider,
      modelName: norm.modelName,
      providerId: norm.providerId!,
      modelId: norm.modelId!,
    };
  }

  /**
   * Get a model record by provider and model name.
   *
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<ModelRecord | null>} Model record or null if not found.
   *
   * @example
   * ```typescript
   * const model = await modelMap.getModelByProviderAndName('azure-openai.chat', 'gpt-4');
   * ```
   */
  async getModelByProviderAndName(
    provider: LanguageModel,
    modelName: string,
  ): Promise<ModelRecord | null> {
    await this.#ensureFreshCache();

    const {
      modelName: normalizedModelName,
      rethrow,
      providerId: normalizedProviderId,
    } = await this.normalizeProviderModel(provider, modelName);

    try {
      rethrow();
      const key = `${normalizedProviderId}:${normalizedModelName}`;
      return this.#providerModelToRecord.get(key) || null;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error getting model by provider and name',
        extra: { provider, modelName },
        source: 'ModelMap.getModelByProviderAndName',
      });
      return null;
    }
  }

  /**
   * Get a model record by model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<ModelRecord | null>} Model record or null if not found.
   */
  async getModelById(modelId: string): Promise<ModelRecord | null> {
    await this.#ensureFreshCache();
    return this.#idToRecord.get(modelId) || null;
  }

  /**
   * Get a quota record by model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<ModelQuotaRecord | null>} Quota record or null if not found.
   */
  async getQuotaByModelId(modelId: string): Promise<ModelQuotaRecord | null> {
    await this.#ensureFreshCache();
    return this.#modelIdToQuota.get(modelId) || null;
  }
  /**
   * Get a quota record by model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<ModelQuotaRecord | null>} Quota record or null if not found.
   */
  async addQuotaToModel(
    record: Omit<ModelQuotaRecord, UpdateOptionalQuotaFields> &
      Partial<Pick<ModelQuotaRecord, UpdateOptionalQuotaFields>>,
  ): Promise<ModelQuotaRecord> {
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
    } else {
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

  /**
   * Get a quota record by model record.
   *
   * @param {ModelRecord} model - Model record.
   * @returns {Promise<ModelQuotaRecord | null>} Quota record or null if not found.
   */
  async getQuotaByModel(model: ModelRecord): Promise<ModelQuotaRecord | null> {
    return this.getQuotaByModelId(model.id);
  }

  /**
   * Get a complete model with quota by provider and model name.
   *
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<ModelWithQuota | null>} Model with quota or null if not found.
   */
  async getModelWithQuota(
    provider: string,
    modelName: string,
  ): Promise<ModelWithQuota | null> {
    const model = await this.getModelByProviderAndName(provider, modelName);
    if (!model) return null;

    const quota = await this.getQuotaByModelId(model.id);
    return {
      ...model,
      quota: quota || undefined,
    };
  }

  /**
   * Get model and quota information from a LanguageModelV1 instance.
   * This method extracts provider and model information from the model's metadata
   * and performs a lookup in the ModelMap.
   *
   * @param {LanguageModelV1} languageModel - The LanguageModelV1 instance.
   * @returns {Promise<ModelWithQuota | null>} Model with quota or null if not found.
   *
   * @example
   * ```typescript
   * const model = aiModelFactory('hifi');
   * const modelInfo = await modelMap.getModelFromLanguageModelV1(model);
   * ```
   */
  async getModelFromLanguageModel(
    languageModel: LanguageModel,
  ): Promise<ModelWithQuota | null> {
    try {
      // Extract provider and model information from the LanguageModelV1 instance
      // LanguageModelV1 instances have provider and modelId properties
      const provider = (languageModel as { provider?: string }).provider;
      const modelId = (languageModel as { modelId?: string }).modelId;

      if (!provider || !modelId) {
        LoggedError.isTurtlesAllTheWayDownBaby(
          new Error('Missing provider or modelId in LanguageModelV1 instance'),
          {
            log: true,
            message: 'Unable to extract provider/model from LanguageModelV1',
            extra: {
              hasProvider: !!provider,
              hasModelId: !!modelId,
              keys: Object.keys(languageModel),
            },
            source: 'ModelMap.getModelFromLanguageModelV1',
          },
        );
        return null;
      }

      // Some models may have provider prefixes in the modelId, normalize them
      let normalizedModelName = modelId;

      // Handle Azure OpenAI format (e.g., "gpt-4" or "azure:gpt-4")
      if (provider.includes('azure') && normalizedModelName.includes(':')) {
        normalizedModelName =
          normalizedModelName.split(':').pop() || normalizedModelName;
      }

      // Handle Google format (e.g., "models/gemini-pro")
      if (
        provider.includes('google') &&
        normalizedModelName.startsWith('models/')
      ) {
        normalizedModelName = normalizedModelName.replace('models/', '');
      }

      return await this.getModelWithQuota(provider, normalizedModelName);
    } catch (error) {
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

  /**
   * Load quota configuration from PostgreSQL database.
   * This method is extracted from TokenStatsService to centralize model/quota management.
   *
   * @param {string} provider - Provider ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<ModelQuotaRecord | null>} Quota configuration or null if not found.
   *
   * @example
   * ```typescript
   * const quota = await modelMap.loadQuotaFromDatabase('azure-provider-id', 'gpt-4');
   * ```
   */
  async loadQuotaFromDatabase(
    provider: string,
    modelName: string,
  ): Promise<ModelQuotaRecord | null> {
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
          .innerJoin(
            schema.models,
            eq(schema.modelQuotas.modelId, schema.models.id),
          )
          .where(
            and(
              eq(schema.models.providerId, provider),
              eq(schema.models.modelName, modelName),
              eq(schema.modelQuotas.isActive, true),
            ),
          )
          .limit(1)
          .execute()
          .then((r) => r.at(0));

        if (!row) {
          return null;
        }
        const now =
          row.createdAt ?? row.updatedAt ?? new Date(Date.now()).toISOString();
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
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error loading quota from database',
        extra: { provider, modelName },
        source: 'ModelMap.loadQuotaFromDatabase',
      });
      return null;
    }
  }

  /**
   * Check if the cache needs to be refreshed and refresh if necessary.
   * @private
   */
  async #ensureFreshCache(): Promise<void> {
    if (
      !this.#initialized ||
      Date.now() - this.#lastCacheUpdate > this.#CACHE_TTL
    ) {
      await this.refresh();
    }
  }

  /**
   * Get the model ID for a given provider and model name.
   * Similar to ProviderMap.id() but requires both provider and model name.
   *
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<string | undefined>} Model ID or undefined if not found.
   *
   * @example
   * ```typescript
   * const modelId = await modelMap.id('azure-openai.chat', 'gpt-4');
   * ```
   */
  async id(provider: string, modelName: string): Promise<string | undefined> {
    const model = await this.getModelByProviderAndName(provider, modelName);
    return model?.id;
  }

  /**
   * Get the model name for a given model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<string | undefined>} Model name or undefined if not found.
   */
  async modelName(modelId: string): Promise<string | undefined> {
    const model = await this.getModelById(modelId);
    return model?.modelName;
  }

  /**
   * Get the provider ID for a given model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<string | undefined>} Provider ID or undefined if not found.
   */
  async providerId(modelId: string): Promise<string | undefined> {
    const model = await this.getModelById(modelId);
    return model?.providerId;
  }

  /**
   * Get the provider name for a given model ID.
   *
   * @param {string} modelId - Model ID.
   * @returns {Promise<string | undefined>} Provider name or undefined if not found.
   */
  async providerName(modelId: string): Promise<string | undefined> {
    const model = await this.getModelById(modelId);
    return model?.providerName;
  }

  /**
   * Get a model record by provider and model name or IDs.
   * Similar to ProviderMap.record() but requires both provider and model identifiers.
   *
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name or ID.
   * @returns {Promise<ModelRecord | undefined>} Model record or undefined if not found.
   */
  async record(
    provider: string,
    modelName: string,
  ): Promise<ModelRecord | undefined> {
    const model = await this.getModelByProviderAndName(provider, modelName);
    return model || undefined;
  }

  /**
   * Check if the ModelMap contains a model with the given provider and name.
   *
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<boolean>} True if the model exists.
   */
  async contains(provider: string, modelName: string): Promise<boolean> {
    const model = await this.getModelByProviderAndName(provider, modelName);
    return model !== null;
  }

  /**
   * Get all active models for a specific provider.
   *
   * @param {string} provider - Provider name or ID.
   * @returns {Promise<ModelRecord[]>} Array of model records for the provider.
   */
  async getModelsForProvider(provider: string): Promise<ModelRecord[]> {
    await this.#ensureFreshCache();

    const { providerId, rethrow } = await this.normalizeProviderModel(
      provider,
      '',
    );

    try {
      rethrow();
      const models: ModelRecord[] = [];

      for (const [key, record] of this.#providerModelToRecord.entries()) {
        if (key.startsWith(`${providerId}:`)) {
          models.push(record);
        }
      }

      return models;
    } catch (error) {
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
