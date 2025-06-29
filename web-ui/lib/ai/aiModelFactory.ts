import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { env } from '@/lib/site-util/env';
import { EmbeddingModelV1, LanguageModelV1 } from '@ai-sdk/provider';
import { ChatOptions, EmbeddingOptions } from './types';
import { isAiModelType, AiModelType } from '@/lib/ai/core';
import { AiModelTypeValue_Embedding, AiModelTypeValue_GoogleEmbedding } from '@/lib/ai/core/unions';

import { wrapLanguageModel } from 'ai';
import { cacheWithRedis } from './middleware';

let azureProjectProvider: AzureOpenAIProvider | undefined;
let googleProvider: GoogleGenerativeAIProvider | undefined;

/**
 * Provider registry to manage multiple AI providers
 */
class ProviderRegistry {
  private static instance: ProviderRegistry;

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  getAzureProvider(): AzureOpenAIProvider {
    if (!azureProjectProvider) {
      azureProjectProvider = createAzure({
        baseURL: env('AZURE_OPENAI_ENDPOINT'),
        apiKey: env('AZURE_API_KEY'),
      });
    }
    if (!azureProjectProvider) {
      throw new Error('Azure OpenAI client is not initialized.');
    }
    return azureProjectProvider;
  }

  getGoogleProvider(): GoogleGenerativeAIProvider {
    if (!googleProvider) {
      googleProvider = createGoogleGenerativeAI({
        apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
      });
    }
    if (!googleProvider) {
      throw new Error('Google Generative AI client is not initialized.');
    }
    return googleProvider;
  }
}

interface GetAiModelProviderOverloads {
  (): AzureOpenAIProvider;
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

const setupMiddleware = (model: LanguageModelV1): LanguageModelV1 => {
  return wrapLanguageModel({
    model,
    middleware: cacheWithRedis,
  }) as LanguageModelV1;
};

export const aiModelFactory: GetAiModelProviderOverloads = (
  modelType?: AiModelType,
  options?: ChatOptions | EmbeddingOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const registry = ProviderRegistry.getInstance();
  
  if (typeof modelType === 'undefined') {
    return registry.getAzureProvider();
  }
  
  if (isAiModelType(modelType)) {
    let model: LanguageModelV1;
    switch (modelType) {
      case 'completions':
        model = registry.getAzureProvider().completion(
          env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS'),
          options as ChatOptions,
        ) as LanguageModelV1;
        break;
      case 'lofi':
        model = registry.getAzureProvider().chat(
          env('AZURE_OPENAI_DEPLOYMENT_LOFI'),
          options as ChatOptions,
        ) as LanguageModelV1;
        break;
      case 'hifi':
        model = registry.getAzureProvider().chat(env('AZURE_OPENAI_DEPLOYMENT_HIFI'), {
          ...options,
        }) as LanguageModelV1;
        break;
      case 'gemini-pro':
        model = registry.getGoogleProvider().chat('gemini-1.5-pro') as LanguageModelV1;
        break;
      case 'gemini-flash':
        model = registry.getGoogleProvider().chat('gemini-1.5-flash') as LanguageModelV1;
        break;
      case 'embedding':
        return registry.getAzureProvider().textEmbeddingModel(
          env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING'),
          options as EmbeddingOptions,
        );
      case 'google-embedding':
        return registry.getGoogleProvider().textEmbeddingModel('text-embedding-004');
      default:
        throw new Error('Invalid AiModelType provided: ' + modelType);
    }
    return setupMiddleware(model);
  }
};

export const createEmbeddingModel = (
  options?: EmbeddingOptions,
): EmbeddingModelV1<string> =>
  aiModelFactory(AiModelTypeValue_Embedding, options);

export const createGoogleEmbeddingModel = (
  options?: EmbeddingOptions,
): EmbeddingModelV1<string> =>
  aiModelFactory(AiModelTypeValue_GoogleEmbedding, options);
