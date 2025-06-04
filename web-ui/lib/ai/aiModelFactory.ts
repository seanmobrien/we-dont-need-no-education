import { AzureOpenAIProvider, createAzure } from '@ai-sdk/azure';
import { env } from '@/lib/site-util/env';
import { EmbeddingModelV1, LanguageModelV1 } from '@ai-sdk/provider';
import { AiModelType, AiModelTypeValue_Embedding } from './unions';
import { ChatOptions, EmbeddingOptions } from './types';
import { isAiModelType } from './guards';

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
    switch (modelType) {
      case 'completions':
        return azureProjectProvider.completion(
          env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS'),
          options as ChatOptions,
        );
      case 'lofi':
        return azureProjectProvider.chat(
          env('AZURE_OPENAI_DEPLOYMENT_LOFI'),
          options as ChatOptions,
        );
      case 'hifi':
        return azureProjectProvider.chat(env('AZURE_OPENAI_DEPLOYMENT_HIFI'), {
          ...options,
        });
      case 'embedding':
        return azureProjectProvider.textEmbeddingModel(
          env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING'),
          options as EmbeddingOptions,
        );
      default:
        throw new Error('Invalid AiModelType provided: ' + modelType);
    }
  }
};

export const createEmbeddingModel = (
  options?: EmbeddingOptions,
): EmbeddingModelV1<string> =>
  aiModelFactory(AiModelTypeValue_Embedding, options);
