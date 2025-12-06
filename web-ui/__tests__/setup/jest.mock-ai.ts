import { jest } from '@jest/globals';
import { LanguageModel, EmbeddingModel, Provider } from 'ai';

// Mock Azure SDK
jest.mock('@ai-sdk/azure', () => ({
  createAzure: jest.fn(() => ({
    completion: jest.fn(() => ({ modelType: 'azure-completions' })),
    chat: jest.fn(() => ({ modelType: 'azure-chat' })),
    textEmbeddingModel: jest.fn(() => ({ modelType: 'azure-embedding' })),
  })),
  AzureOpenAIProvider: jest.fn(),
}));

// Mock Google SDK
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => ({
    chat: jest.fn(() => ({ modelType: 'google-chat' })),
    textEmbeddingModel: jest.fn(() => ({ modelType: 'google-embedding' })),
  })),
  GoogleGenerativeAIProvider: jest.fn(),
}));

// Mock AI Core
jest.mock('ai', () => {
  const actual = jest.requireActual('ai') as any;
  return {
    ...actual,
    customProvider: jest.fn(
      (config: {
        languageModels?: Record<string, any>;
        embeddingModels?: Record<string, any>;
        fallbackProvider?: any;
      }) => ({
        languageModels: config.languageModels || {},
        embeddingModels: config.embeddingModels || {},
        fallbackProvider: config.fallbackProvider,
      }),
    ),
    createProviderRegistry: jest.fn(() => ({
      languageModel: jest.fn((id: string) => ({ modelId: id, type: 'language' })),
      textEmbeddingModel: jest.fn((id: string) => ({ modelId: id, type: 'embedding' })),
    })),
  };
});
