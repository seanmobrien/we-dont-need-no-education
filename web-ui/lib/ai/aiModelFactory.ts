import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '@/lib/site-util/env';
import { EmbeddingModelV1, LanguageModelV1 } from '@ai-sdk/provider';
import { ChatOptions, EmbeddingOptions } from './types';
import { isAiModelType, AiModelType } from '@/lib/ai/core';
import { AiModelTypeValue_Embedding, AiModelTypeValue_GoogleEmbedding } from '@/lib/ai/core/unions';

import { 
  customProvider, 
  createProviderRegistry, 
  wrapLanguageModel,
  type LanguageModel 
} from 'ai';
import { cacheWithRedis } from './middleware';

/**
 * Setup middleware for language models with caching and retry logic
 */
const setupMiddleware = (model: LanguageModelV1): LanguageModelV1 => {
  return wrapLanguageModel({
    model,
    middleware: cacheWithRedis,
  }) as LanguageModelV1;
};

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
      }).chat(env('AZURE_OPENAI_DEPLOYMENT_HIFI'))
    ),
    lofi: setupMiddleware(
      createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      }).chat(env('AZURE_OPENAI_DEPLOYMENT_LOFI'))
    ),
    completions: setupMiddleware(
      createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      }).completion(env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS'))
    ),
  },
  embeddingModels: {
    embedding: createAzure({
      baseURL: env('AZURE_OPENAI_ENDPOINT'),
      apiKey: env('AZURE_API_KEY'),
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
      }).chat('gemini-1.5-pro')  // High-quality model equivalent to Azure hifi
    ),
    lofi: setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-1.5-flash')  // Fast model equivalent to Azure lofi
    ),
    // Google-specific model aliases
    'gemini-pro': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-1.5-pro')
    ),
    'gemini-flash': setupMiddleware(
      createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      }).chat('gemini-1.5-flash')
    ),
  },
  embeddingModels: {
    embedding: createGoogleGenerativeAI({
      apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
    }).textEmbeddingModel('text-embedding-004'),  // Google embedding equivalent to Azure embedding
    'google-embedding': createGoogleGenerativeAI({
      apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
    }).textEmbeddingModel('text-embedding-004'),
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
 * while using the new provider registry internally
 */
export const aiModelFactory: GetAiModelProviderOverloads = (
  modelType?: AiModelType,
  options?: ChatOptions | EmbeddingOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (typeof modelType === 'undefined') {
    return azureProvider;
  }
  
  if (isAiModelType(modelType)) {
    switch (modelType) {
      case 'completions':
      case 'lofi':
      case 'hifi':
        // Try Azure first, fallback to Google if Azure model not available
        try {
          return providerRegistry.languageModel(`azure:${modelType}`);
        } catch {
          return providerRegistry.languageModel(`google:${modelType}`);
        }
      
      case 'gemini-pro':
      case 'gemini-flash':
        // Google-specific models
        return providerRegistry.languageModel(`google:${modelType}`);
      
      case 'embedding':
        // Try Azure first, fallback to Google
        try {
          return providerRegistry.textEmbeddingModel('azure:embedding');
        } catch {
          return providerRegistry.textEmbeddingModel('google:embedding');
        }
      
      case 'google-embedding':
        // Google-specific embedding
        return providerRegistry.textEmbeddingModel('google:google-embedding');
      
      default:
        throw new Error('Invalid AiModelType provided: ' + modelType);
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
