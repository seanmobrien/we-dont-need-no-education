import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure';
import { env } from '@/lib/site-util/env';
import { EmbeddingModelV1, LanguageModelV1 } from '@ai-sdk/provider';
import { ChatOptions, EmbeddingOptions } from './types';
import { isAiModelType, AiModelType } from '@/lib/ai/core';
import { AiModelTypeValue_Embedding } from '@/lib/ai/core/unions';

import { wrapLanguageModel } from 'ai';
import { retryRateLimitMiddleware } from './middleware/retryRateLimitMiddleware';

let azureProjectProvider: AzureOpenAIProvider | undefined;

interface GetAzureProjectProviderOverloads {
  (): AzureOpenAIProvider;
  (
    deploymentId: 'embedding',
    options?: EmbeddingOptions,
  ): EmbeddingModelV1<string>;
  (
    deploymentId: Exclude<AiModelType, 'embedding'>,
    options?: ChatOptions,
  ): LanguageModelV1;
}

const setupMiddleware = (model: LanguageModelV1): LanguageModelV1 => {
  return wrapLanguageModel({
    model,
    middleware: retryRateLimitMiddleware,
  });
};

export const aiModelFactory: GetAzureProjectProviderOverloads = (
  modelType?: AiModelType,
  options?: ChatOptions | EmbeddingOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (!azureProjectProvider) {
    azureProjectProvider = createAzure({
      baseURL: env('AZURE_OPENAI_ENDPOINT'),
      apiKey: env('AZURE_API_KEY'),
    });
  }
  if (!azureProjectProvider) {
    throw new Error('Azure  OpenAI client is not initialized.');
  }
  if (typeof modelType === 'undefined') {
    return azureProjectProvider!;
  }
  if (isAiModelType(modelType)) {
    let model: LanguageModelV1;
    switch (modelType) {
      case 'completions':
        model = azureProjectProvider.completion(
          env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS'),
          options as ChatOptions,
        );
        break;
      case 'lofi':
        model = azureProjectProvider.chat(
          env('AZURE_OPENAI_DEPLOYMENT_LOFI'),
          options as ChatOptions,
        );
        break;
      case 'hifi':
        model = azureProjectProvider.chat(env('AZURE_OPENAI_DEPLOYMENT_HIFI'), {
          ...options,
        });
        break;
      case 'embedding':
        return azureProjectProvider.textEmbeddingModel(
          env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING'),
          options as EmbeddingOptions,
        );
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
