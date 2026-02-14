/**
 * @fileoverview ModelMap module definition.
 *
 * This module provides the type definitions and documentation for the ModelMap class
 * and related types. ModelMap provides centralized management of model configurations,
 * quotas, and metadata.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-08-23
 */

import { type DbDatabaseType } from '@compliance-theater/database/orm';
import { LanguageModel } from 'ai';
import { ModelClassification } from '../../middleware/key-rate-limiter/types';
import { ProviderPrimaryNameType } from './provider-map';

declare module '@/lib/ai/services/model-stats/model-map' {
  /**
   * Type representing a complete model record with provider information.
   */
  export type ModelRecord = {
    /** Unique identifier for the model. */
    id: string;
    /** ID of the provider this model belongs to. */
    providerId: string;
    /** Name of the provider (e.g., 'azure', 'google'). */
    providerName?: string;
    /** Name of the model (e.g., 'gpt-4', 'gemini-pro'). */
    modelName: string;
    /** Human-readable display name for the model. */
    displayName?: string;
    /** Description of the model's capabilities. */
    description?: string;
    /** Whether the model is currently active and available for use. */
    isActive: boolean;
    /** Timestamp when the record was created (ISO string). */
    createdAt: string;
    /** Timestamp when the record was last updated (ISO string). */
    updatedAt: string;
  };

  /**
   * Type representing a model quota configuration.
   */
  export type ModelQuotaRecord = {
    /** Unique identifier for the quota record. */
    id: string;
    /** ID of the model this quota applies to. */
    modelId: string;
    /** Maximum tokens allowed per single message/request. */
    maxTokensPerMessage?: number;
    /** Maximum tokens allowed per minute (rate limit). */
    maxTokensPerMinute?: number;
    /** Maximum tokens allowed per day (daily quota). */
    maxTokensPerDay?: number;
    /** Whether this quota configuration is active. */
    isActive: boolean;
    /** Timestamp when the record was created (ISO string). */
    createdAt: string | null;
    /** Timestamp when the record was last updated (ISO string). */
    updatedAt: string | null;
  };

  /**
   * Type representing a complete model with its quota configuration.
   */
  export type ModelWithQuota = ModelRecord & {
    /** Optional quota configuration for this model. */
    quota?: ModelQuotaRecord;
  };

  /**
   * Type for provider/model name normalization results.
   */
  /**
   * Type for provider/model name normalization results.
   */
  export type ProviderModelNormalization = {
    /** The normalized provider name (e.g., 'azure-openai.chat'). */
    provider: string;
    /** The normalized model name (e.g., 'gpt-4'). */
    modelName: string;
    /** The unique model ID if found, otherwise empty string. */
    modelId: string;
    /** The unique provider ID if found, otherwise empty string. */
    providerId: string;
    /**
     * Function to rethrow any errors encountered during normalization.
     * Use this to propagate errors after awaiting the normalization result.
     */
    rethrow: () => void;
    /**
     * The classification of the model (e.g., 'embedding', 'image', 'text').
     * Derived from the model name or provider capabilities.
     */
    get classification(): ModelClassification;
  };

  /**
   * List of aliased model names used for configuration.
   * These correspond to abstract model roles like 'high-fidelity', 'low-fidelity', and 'embedding'.
   */
  export const ModelAliasNameValues: readonly ['hifi', 'lofi', 'embedding'];

  /**
   * Type representing one of the supported model alias names.
   */
  export type ModelAliasNameType = (typeof ModelAliasNameValues)[number];

  /**
   * Maps alias names to environment variables per provider.
   * Structure: `Record<ProviderName, Record<ModelAlias, EnvVarName>>`
   *
   * Example:
   * ```ts
   * {
   *   'azure': { 'hifi': 'AZURE_OPENAI_HIFI_DEPLOYMENT' },
   *   'google': { 'hifi': 'GOOGLE_HIFI_MODEL' }
   * }
   * ```
   */
  export const EnvironmentAliasMap: Record<
    ProviderPrimaryNameType,
    Record<ModelAliasNameType, string>
  >;

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
    /**
     * Get the singleton instance of ModelMap.
     * @returns {ModelMap} The singleton instance.
     */
    static get Instance(): ModelMap;

    /**
     * Get the singleton instance with initialization guarantee.
     * @param {DbDatabaseType} [db] - Optional database instance.
     * @returns {Promise<ModelMap>} Promise that resolves to the initialized instance.
     */
    static getInstance(db?: DbDatabaseType): Promise<ModelMap>;

    /**
     * Setup a mock instance of ModelMap for testing.
     * @param records - The model records to initialize the map with.
     * @param quotas - The quota records to initialize the map with.
     * @returns The initialized ModelMap instance.
     */
    static setupMockInstance(
      records: (readonly [string, ModelRecord])[],
      quotas: (readonly [string, ModelQuotaRecord])[],
    ): ModelMap;

    /**
     * Reset the singleton instance (for testing or reinitialization).
     */
    static reset(): void;

    /**
     * Refresh the model and quota data from the database.
     *
     * @param {DbDatabaseType} [db] - Optional database instance.
     * @returns {Promise<boolean>} Promise that resolves to true when refresh is complete.
     */
    refresh(db?: DbDatabaseType): Promise<boolean>;

    /**
     * Get all model records as an iterable.
     * @returns {IterableIterator<[string, ModelRecord]>} Iterator over provider:model key-value pairs.
     */
    get entries(): IterableIterator<[string, ModelRecord]>;

    /**
     * Get all model IDs.
     * @returns {string[]} Array of all model IDs.
     */
    get allIds(): string[];

    /**
     * Get all provider:model keys.
     * @returns {string[]} Array of all provider:model combinations.
     */
    get allProviderModelKeys(): string[];

    /**
     * Check if the instance is initialized.
     * @returns {boolean} True if initialized.
     */
    get initialized(): boolean;

    /**
     * Get a promise that resolves when the instance is initialized.
     * @returns {Promise<boolean>} Promise that resolves to true when initialized.
     */
    get whenInitialized(): Promise<boolean>;

    /**
     * Normalize provider and model names for consistent storage and lookup.
     * Handles both separate and 'provider:model' formats.
     *
     * @param {string | LanguageModel} providerOrModel - Provider name, 'provider:model' string, or LanguageModel instance.
     * @param {string} [modelName] - Optional model name.
     * @returns {Promise<ProviderModelNormalization>} Normalized provider and model information.
     *
     * @example
     * ```typescript
     * const norm1 = await modelMap.normalizeProviderModel('azure-openai.chat', 'gpt-4');
     * const norm2 = await modelMap.normalizeProviderModel('azure-openai.chat:gpt-4');
     * ```
     */
    normalizeProviderModel(
      providerOrModel: string | LanguageModel,
      modelName?: string,
    ): Promise<ProviderModelNormalization>;

    /** Helper that throws ResourceNotFoundError when provider/model can’t be normalized */
    normalizeProviderModelOrThrow(
      providerOrModel: string,
      modelName?: string,
    ): Promise<
      Required<
        Pick<
          ProviderModelNormalization,
          'provider' | 'modelName' | 'providerId' | 'modelId'
        >
      >
    >;

    /**
     * Get a model record by provider and model name.
     *
     * @param {string | LanguageModel} provider - Provider name, ID, or LanguageModel.
     * @param {string} modelName - Model name.
     * @returns {Promise<ModelRecord | null>} Model record or null if not found.
     *
     * @example
     * ```typescript
     * const model = await modelMap.getModelByProviderAndName('azure-openai.chat', 'gpt-4');
     * ```
     */
    getModelByProviderAndName(
      provider: string | LanguageModel,
      modelName: string,
    ): Promise<ModelRecord | null>;

    /**
     * Get a model record by model ID.
     *
     * @param {string} modelId - Model ID.
     * @returns {Promise<ModelRecord | null>} Model record or null if not found.
     */
    getModelById(modelId: string): Promise<ModelRecord | null>;

    /**
     * Get a quota record by model ID.
     *
     * @param {string} modelId - Model ID.
     * @returns {Promise<ModelQuotaRecord | null>} Quota record or null if not found.
     */
    getQuotaByModelId(modelId: string): Promise<ModelQuotaRecord | null>;

    /**
     * Add or update a quota for a model.
     *
     * @param record - The quota record to add or update.
     * @returns {Promise<ModelQuotaRecord>} The added or updated quota record.
     */
    addQuotaToModel(
      record: Omit<ModelQuotaRecord, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> &
        Partial<Pick<ModelQuotaRecord, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>>,
    ): Promise<ModelQuotaRecord>;

    /**
     * Get a quota record by model record.
     *
     * @param {ModelRecord} model - Model record.
     * @returns {Promise<ModelQuotaRecord | null>} Quota record or null if not found.
     */
    getQuotaByModel(model: ModelRecord): Promise<ModelQuotaRecord | null>;

    /**
     * Get a complete model with quota by provider and model name.
     *
     * @param {string} provider - Provider name or ID.
     * @param {string} modelName - Model name.
     * @returns {Promise<ModelWithQuota | null>} Model with quota or null if not found.
     */
    getModelWithQuota(
      provider: string,
      modelName: string,
    ): Promise<ModelWithQuota | null>;

    /**
     * Get model and quota information from a LanguageModelV1 instance.
     * This method extracts provider and model information from the model's metadata
     * and performs a lookup in the ModelMap.
     *
     * @param {LanguageModel} languageModel - The LanguageModel instance.
     * @returns {Promise<ModelWithQuota | null>} Model with quota or null if not found.
     *
     * @example
     * ```typescript
     * const model = aiModelFactory('hifi');
     * const modelInfo = await modelMap.getModelFromLanguageModel(model);
     * ```
     */
    getModelFromLanguageModel(
      languageModel: LanguageModel,
    ): Promise<ModelWithQuota | null>;

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
    loadQuotaFromDatabase(
      provider: string,
      modelName: string,
    ): Promise<ModelQuotaRecord | null>;
  }
}
