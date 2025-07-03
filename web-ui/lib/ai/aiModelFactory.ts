import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '@/lib/site-util/env';
import { EmbeddingModelV1, LanguageModelV1 } from '@ai-sdk/provider';
import { ChatOptions, EmbeddingOptions } from './types';
import {
  isAiModelType,
  AiModelType,
  isAiLanguageModelType,
} from '@/lib/ai/core';
import {
  AiModelTypeValue_Embedding,
  AiModelTypeValue_GoogleEmbedding,
} from '@/lib/ai/core/unions';

import { customProvider, createProviderRegistry, wrapLanguageModel } from 'ai';
import { cacheWithRedis, setNormalizedDefaultsMiddleware } from './middleware';

/**
 * Model availability manager for programmatic control of model enabling/disabling
 */
class ModelAvailabilityManager {
  private availabilityMap = new Map<string, boolean>();
  private static instance: ModelAvailabilityManager;

  private constructor() {
    // Initialize all models as available by default
    this.resetToDefaults();
  }

  static getInstance(): ModelAvailabilityManager {
    if (!ModelAvailabilityManager.instance) {
      ModelAvailabilityManager.instance = new ModelAvailabilityManager();
    }
    return ModelAvailabilityManager.instance;
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelKey: string): boolean {
    return this.availabilityMap.get(modelKey) ?? true;
  }

  /**
   * Check if a provider is available (checks if any model for that provider is available)
   */
  isProviderAvailable(provider: 'azure' | 'google'): boolean {
    const providerModels = Array.from(this.availabilityMap.keys()).filter(
      (key) => key.startsWith(`${provider}:`),
    );

    if (providerModels.length === 0) return true; // No explicit settings, assume available

    return providerModels.some((key) => this.availabilityMap.get(key) === true);
  }

  /**
   * Disable a specific model
   */
  disableModel(modelKey: string): void {
    this.availabilityMap.set(modelKey, false);
  }

  /**
   * Enable a specific model
   */
  enableModel(modelKey: string): void {
    this.availabilityMap.set(modelKey, true);
  }

  /**
   * Disable all models for a provider
   */
  disableProvider(provider: 'azure' | 'google'): void {
    const modelTypes = ['hifi', 'lofi', 'completions', 'embedding'];
    const googleSpecificModels = [
      'gemini-pro',
      'gemini-flash',
      'google-embedding',
    ];

    if (provider === 'azure') {
      modelTypes.forEach((model) => this.disableModel(`azure:${model}`));
    } else if (provider === 'google') {
      [...modelTypes, ...googleSpecificModels].forEach((model) =>
        this.disableModel(`google:${model}`),
      );
    }
  }

  /**
   * Enable all models for a provider
   */
  enableProvider(provider: 'azure' | 'google'): void {
    const modelTypes = ['hifi', 'lofi', 'completions', 'embedding'];
    const googleSpecificModels = [
      'gemini-pro',
      'gemini-flash',
      'google-embedding',
    ];

    if (provider === 'azure') {
      modelTypes.forEach((model) => this.enableModel(`azure:${model}`));
    } else if (provider === 'google') {
      [...modelTypes, ...googleSpecificModels].forEach((model) =>
        this.enableModel(`google:${model}`),
      );
    }
  }

  /**
   * Temporarily disable a model for a specified duration (in milliseconds)
   */
  temporarilyDisableModel(modelKey: string, durationMs: number): void {
    this.disableModel(modelKey);
    setTimeout(() => {
      this.enableModel(modelKey);
    }, durationMs);
  }

  /**
   * Reset all models to default available state
   */
  resetToDefaults(): void {
    this.availabilityMap.clear();
    // All models are available by default (no explicit entries needed)
  }

  /**
   * Get current availability status for debugging
   */
  getAvailabilityStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [key, value] of this.availabilityMap.entries()) {
      status[key] = value;
    }
    return status;
  }
}

const modelAvailabilityManager = ModelAvailabilityManager.getInstance();

/**
 * Setup middleware for language models with caching and retry logic
 */
const setupMiddleware = (model: LanguageModelV1): LanguageModelV1 => {
  return wrapLanguageModel({
    model: wrapLanguageModel({
      model,
      middleware: cacheWithRedis,
    }),
    middleware: setNormalizedDefaultsMiddleware,
  });
};

const wrapProvider = (
  provider: ReturnType<typeof customProvider>,
): ReturnType<typeof customProvider> => {};

/**
 * Azure custom provider with model aliases for our existing model names
 * Maps hifi, lofi, embedding to Azure-hosted models
 */
const azureProvider = customProvider({
  languageModels: {
    // Custom aliases for Azure models
    hifi: setupMiddleware(
      createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      }).chat(env('AZURE_OPENAI_DEPLOYMENT_HIFI')),
    ),
    lofi: setupMiddleware(
      createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      }).chat(env('AZURE_OPENAI_DEPLOYMENT_LOFI')),
    ),
    completions: setupMiddleware(
      createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      }).completion(env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS')),
    ),
  },
  textEmbeddingModels: {
    embedding: createAzure({
      baseURL: env('AZURE_OPENAI_ENDPOINT_EMBEDDING'),
      apiKey: env('AZURE_OPENAI_KEY_EMBEDDING'),
    }).textEmbeddingModel(env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING')),
  },
  // Fallback to the raw Azure provider for any models not explicitly defined
  fallbackProvider: createAzure({
    baseURL: env('AZURE_OPENAI_ENDPOINT'),
    apiKey: env('AZURE_API_KEY'),
  }),
});

/**
 * Google custom provider with model aliases matching Azure as much as possible
 * Maps hifi, lofi, embedding to Google-hosted models
 */
const googleProvider = customProvider({
  languageModels: {
    // Match Azure aliases with equivalent Google models
    hifi: setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-2.0-pro'), // High-quality model equivalent to Azure hifi
    ),
    lofi: setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-2.0-flash'), // Fast model equivalent to Azure lofi
    ),
    // Google-specific model aliases
    'gemini-pro': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-2.0-pro'),
    ),
    'gemini-flash': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-1.5-flash'),
    ),
    'gemini-2.5-pro': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-2.5-pro'),
    ),
    'gemini-2.5-flash': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-2.5-flash'),
    ),
  },
  textEmbeddingModels: {
    embedding: createGoogleGenerativeAI({
      apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
    }).textEmbeddingModel('text-embedding-004'), // Google embedding equivalent to Azure embedding
  },
  // Fallback to the raw Google provider for any models not explicitly defined
  fallbackProvider: createGoogleGenerativeAI({
    apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
  }),
});

/**
 * Provider registry with Azure as default and Google as fallback
 * Supports creating models by alias with Azure as primary, falling back to Google
 */
export const providerRegistry = createProviderRegistry({
  // Azure is primary provider
  azure: azureProvider,
  // Google is fallback provider
  google: googleProvider,
});

interface GetAiModelProviderOverloads {
  (): typeof azureProvider;
  (
    deploymentId: 'embedding',
    options?: EmbeddingOptions,
  ): EmbeddingModelV1<string>;
  (
    deploymentId: 'google-embedding',
    options?: EmbeddingOptions,
  ): EmbeddingModelV1<string>;
  (
    deploymentId: Exclude<AiModelType, 'embedding' | 'google-embedding'>,
    options?: ChatOptions,
  ): LanguageModelV1;
}

/**
 * Main factory function that provides backward compatibility with existing usage
 * while using the new provider registry internally with availability control
 */
export const aiModelFactory: GetAiModelProviderOverloads = (
  modelType?: AiModelType,
  options?: ChatOptions | EmbeddingOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (typeof modelType === 'undefined') {
    return azureProvider;
  }
  if (isAiLanguageModelType(modelType)) {
    switch (modelType) {
      case 'completions':
      case 'lofi':
      case 'hifi': {
        // Check availability and try Azure first if available, fallback to Google
        const azureModelKey: string = `azure:${modelType}`;
        const googleModelKey: string = `google:${modelType}`;
        if (modelAvailabilityManager.isModelAvailable(azureModelKey)) {
          try {
            return providerRegistry.languageModel(azureModelKey);
          } catch (error) {
            // If Azure fails, temporarily disable it and try Google
            modelAvailabilityManager.temporarilyDisableModel(
              azureModelKey,
              60000,
            ); // 1 minute
            console.warn(
              `Azure model ${modelType} failed, temporarily disabled:`,
              error,
            );
          }
        }

        if (modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          return providerRegistry.languageModel(googleModelKey);
        }

        throw new Error(`No available providers for model type: ${modelType}`);
      }

      case 'gemini-pro':
      case 'gemini-flash': {
        // Google-specific models
        const googleModelKey = `google:${modelType}`;

        if (!modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          throw new Error(`Google model ${modelType} is currently disabled`);
        }

        return providerRegistry.languageModel(googleModelKey);
      }

      default:
        if (modelAvailabilityManager.isModelAvailable(modelType)) {
          if (modelType.toString().indexOf('embed') == -1) {
            const chat = providerRegistry.languageModel(modelType);
            if (chat == null) {
              throw new Error('Invalid AiModelType provided: ' + modelType);
            }
            return chat;
          }
          const embed = providerRegistry.textEmbeddingModel(modelType);
          if (embed == null) {
            throw new Error('Invalid AiModelType provided: ' + modelType);
          }
          return embed;
        }
    }
  } else {
  }
  if (isAiModelType(modelType)) {
    switch (modelType) {
      case 'completions':
      case 'lofi':
      case 'hifi': {
        // Check availability and try Azure first if available, fallback to Google
        const azureModelKey = `azure:${modelType}`;
        const googleModelKey = `google:${modelType}`;

        if (modelAvailabilityManager.isModelAvailable(azureModelKey)) {
          try {
            return providerRegistry.languageModel(azureModelKey);
          } catch (error) {
            // If Azure fails, temporarily disable it and try Google
            modelAvailabilityManager.temporarilyDisableModel(
              azureModelKey,
              60000,
            ); // 1 minute
            console.warn(
              `Azure model ${modelType} failed, temporarily disabled:`,
              error,
            );
          }
        }

        if (modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          return providerRegistry.languageModel(googleModelKey);
        }

        throw new Error(`No available providers for model type: ${modelType}`);
      }

      case 'gemini-pro':
      case 'gemini-flash': {
        // Google-specific models
        const googleModelKey = `google:${modelType}`;

        if (!modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          throw new Error(`Google model ${modelType} is currently disabled`);
        }

        return providerRegistry.languageModel(googleModelKey);
      }

      case 'embedding': {
        // Try Azure first if available, fallback to Google
        const azureModelKey = 'azure:embedding';
        const googleModelKey = 'google:embedding';

        if (modelAvailabilityManager.isModelAvailable(azureModelKey)) {
          try {
            return providerRegistry.textEmbeddingModel(azureModelKey);
          } catch (error) {
            // If Azure fails, temporarily disable it and try Google
            modelAvailabilityManager.temporarilyDisableModel(
              azureModelKey,
              60000,
            ); // 1 minute
            console.warn(
              `Azure embedding model failed, temporarily disabled:`,
              error,
            );
          }
        }

        if (modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          return providerRegistry.textEmbeddingModel(googleModelKey);
        }

        throw new Error(`No available providers for embedding model`);
      }

      case 'google-embedding': {
        // Google-specific embedding
        const googleModelKey = 'google:google-embedding';

        if (!modelAvailabilityManager.isModelAvailable(googleModelKey)) {
          throw new Error(`Google embedding model is currently disabled`);
        }

        return providerRegistry.textEmbeddingModel(googleModelKey);
      }

      default:
        if (modelAvailabilityManager.isModelAvailable(modelType)) {
          if (modelType.toString().indexOf('embed') == -1) {
            const chat = providerRegistry.languageModel(modelType);
            if (chat == null) {
              throw new Error('Invalid AiModelType provided: ' + modelType);
            }
            return chat;
          }
          const embed = providerRegistry.textEmbeddingModel(modelType);
          if (embed == null) {
            throw new Error('Invalid AiModelType provided: ' + modelType);
          }
          return embed;
        }
    }
  }

  throw new Error('Invalid model type provided');
};

/**
 * Convenience function to create Azure embedding model
 */
export const createEmbeddingModel = (
  options?: EmbeddingOptions,
): EmbeddingModelV1<string> =>
  aiModelFactory(AiModelTypeValue_Embedding, options);

/**
 * Convenience function to create Google embedding model
 */
export const createGoogleEmbeddingModel = (
  options?: EmbeddingOptions,
): EmbeddingModelV1<string> =>
  aiModelFactory(AiModelTypeValue_GoogleEmbedding, options);

/**
 * Model availability control functions
 */

/**
 * Disable a specific model (e.g., 'azure:hifi', 'google:embedding')
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 */
export const disableModel = (modelKey: string): void => {
  modelAvailabilityManager.disableModel(modelKey);
};

/**
 * Enable a specific model (e.g., 'azure:hifi', 'google:embedding')
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 */
export const enableModel = (modelKey: string): void => {
  modelAvailabilityManager.enableModel(modelKey);
};

/**
 * Disable all models for a provider
 * @param provider - Either 'azure' or 'google'
 */
export const disableProvider = (provider: 'azure' | 'google'): void => {
  modelAvailabilityManager.disableProvider(provider);
};

/**
 * Enable all models for a provider
 * @param provider - Either 'azure' or 'google'
 */
export const enableProvider = (provider: 'azure' | 'google'): void => {
  modelAvailabilityManager.enableProvider(provider);
};

/**
 * Temporarily disable a model for a specified duration
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 * @param durationMs - Duration in milliseconds to disable the model
 */
export const temporarilyDisableModel = (
  modelKey: string,
  durationMs: number,
): void => {
  modelAvailabilityManager.temporarilyDisableModel(modelKey, durationMs);
};

/**
 * Check if a model is currently available
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 * @returns True if the model is available, false otherwise
 */
export const isModelAvailable = (modelKey: string): boolean => {
  return modelAvailabilityManager.isModelAvailable(modelKey);
};

/**
 * Check if a provider is available
 * @param provider - Either 'azure' or 'google'
 * @returns True if the provider has any available models, false otherwise
 */
export const isProviderAvailable = (provider: 'azure' | 'google'): boolean => {
  return modelAvailabilityManager.isProviderAvailable(provider);
};

/**
 * Get the current availability status of all models (for debugging)
 * @returns Object mapping model keys to their availability status
 */
export const getModelAvailabilityStatus = (): Record<string, boolean> => {
  return modelAvailabilityManager.getAvailabilityStatus();
};

/**
 * Reset all models to their default available state
 */
export const resetModelAvailability = (): void => {
  modelAvailabilityManager.resetToDefaults();
};

/**
 * Convenience functions for common scenarios
 */

/**
 * Handle Azure rate limiting by temporarily disabling Azure models
 * @param durationMs - Duration in milliseconds to disable Azure (default: 5 minutes)
 */
export const handleAzureRateLimit = (durationMs: number = 300000): void => {
  console.warn('Azure rate limit detected, temporarily disabling Azure models');
  modelAvailabilityManager.temporarilyDisableModel('azure:hifi', durationMs);
  modelAvailabilityManager.temporarilyDisableModel('azure:lofi', durationMs);
  modelAvailabilityManager.temporarilyDisableModel(
    'azure:completions',
    durationMs,
  );
  modelAvailabilityManager.temporarilyDisableModel(
    'azure:embedding',
    durationMs,
  );
};

/**
 * Handle Google rate limiting by temporarily disabling Google models
 * @param durationMs - Duration in milliseconds to disable Google (default: 5 minutes)
 */
export const handleGoogleRateLimit = (durationMs: number = 300000): void => {
  console.warn(
    'Google rate limit detected, temporarily disabling Google models',
  );
  modelAvailabilityManager.temporarilyDisableModel('google:hifi', durationMs);
  modelAvailabilityManager.temporarilyDisableModel('google:lofi', durationMs);
  modelAvailabilityManager.temporarilyDisableModel(
    'google:embedding',
    durationMs,
  );
  modelAvailabilityManager.temporarilyDisableModel(
    'google:gemini-pro',
    durationMs,
  );
  modelAvailabilityManager.temporarilyDisableModel(
    'google:gemini-flash',
    durationMs,
  );
  modelAvailabilityManager.temporarilyDisableModel(
    'google:google-embedding',
    durationMs,
  );
};
