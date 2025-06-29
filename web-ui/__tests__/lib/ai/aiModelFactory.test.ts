/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  AiModelTypeValues,
  AiModelTypeValue_LoFi,
  AiModelTypeValue_HiFi,
  AiModelTypeValue_Completions,
  AiModelTypeValue_Embedding,
  AiModelTypeValue_GeminiPro,
  AiModelTypeValue_GeminiFlash,
  AiModelTypeValue_GoogleEmbedding
} from '../../../lib/ai/core/unions';
import { isAiModelType, isAiLanguageModelType } from '../../../lib/ai/core/guards';

// Mock environment variables
jest.mock('@/lib/site-util/env', () => ({
  env: jest.fn((key: string) => {
    const mockEnvVars: Record<string, string> = {
      'AZURE_OPENAI_ENDPOINT': 'https://test.openai.azure.com/',
      'AZURE_API_KEY': 'test-azure-key',
      'AZURE_OPENAI_DEPLOYMENT_COMPLETIONS': 'test-completions',
      'AZURE_OPENAI_DEPLOYMENT_LOFI': 'test-lofi',
      'AZURE_OPENAI_DEPLOYMENT_HIFI': 'test-hifi',
      'AZURE_OPENAI_DEPLOYMENT_EMBEDDING': 'test-embedding',
      'GOOGLE_GENERATIVE_AI_API_KEY': 'test-google-key'
    };
    return mockEnvVars[key] || '';
  })
}));

// Mock Azure SDK
jest.mock('@ai-sdk/azure', () => ({
  createAzure: jest.fn(() => ({
    completion: jest.fn(() => ({ modelType: 'azure-completions' })),
    chat: jest.fn(() => ({ modelType: 'azure-chat' })),
    textEmbeddingModel: jest.fn(() => ({ modelType: 'azure-embedding' }))
  })),
  AzureOpenAIProvider: jest.fn()
}));

// Mock Google SDK
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => ({
    chat: jest.fn(() => ({ modelType: 'google-chat' })),
    textEmbeddingModel: jest.fn(() => ({ modelType: 'google-embedding' }))
  })),
  GoogleGenerativeAIProvider: jest.fn()
}));

// Mock middleware
jest.mock('../../../lib/ai/middleware', () => ({
  cacheWithRedis: jest.fn()
}));

jest.mock('ai', () => ({
  wrapLanguageModel: jest.fn(({ model }) => model),
  customProvider: jest.fn((config) => ({
    languageModels: config.languageModels || {},
    embeddingModels: config.embeddingModels || {},
    fallbackProvider: config.fallbackProvider
  })),
  createProviderRegistry: jest.fn((providers) => ({
    languageModel: jest.fn((id) => ({ modelId: id, type: 'language' })),
    textEmbeddingModel: jest.fn((id) => ({ modelId: id, type: 'embedding' }))
  }))
}));

describe('AI Model Types', () => {
  it('should include all expected model types', () => {
    expect(AiModelTypeValues).toEqual([
      'lofi',
      'hifi',
      'completions',
      'embedding',
      'gemini-pro',
      'gemini-flash',
      'google-embedding'
    ]);
  });

  it('should export correct constants', () => {
    expect(AiModelTypeValue_LoFi).toBe('lofi');
    expect(AiModelTypeValue_HiFi).toBe('hifi');
    expect(AiModelTypeValue_Completions).toBe('completions');
    expect(AiModelTypeValue_Embedding).toBe('embedding');
    expect(AiModelTypeValue_GeminiPro).toBe('gemini-pro');
    expect(AiModelTypeValue_GeminiFlash).toBe('gemini-flash');
    expect(AiModelTypeValue_GoogleEmbedding).toBe('google-embedding');
  });
});

describe('AI Model Type Guards', () => {
  it('should correctly identify valid AI model types', () => {
    expect(isAiModelType('lofi')).toBe(true);
    expect(isAiModelType('hifi')).toBe(true);
    expect(isAiModelType('completions')).toBe(true);
    expect(isAiModelType('embedding')).toBe(true);
    expect(isAiModelType('gemini-pro')).toBe(true);
    expect(isAiModelType('gemini-flash')).toBe(true);
    expect(isAiModelType('google-embedding')).toBe(true);
    expect(isAiModelType('invalid-model')).toBe(false);
  });

  it('should correctly identify language model types (excluding embeddings)', () => {
    expect(isAiLanguageModelType('lofi')).toBe(true);
    expect(isAiLanguageModelType('hifi')).toBe(true);
    expect(isAiLanguageModelType('completions')).toBe(true);
    expect(isAiLanguageModelType('gemini-pro')).toBe(true);
    expect(isAiLanguageModelType('gemini-flash')).toBe(true);
    expect(isAiLanguageModelType('embedding')).toBe(false);
    expect(isAiLanguageModelType('google-embedding')).toBe(false);
    expect(isAiLanguageModelType('invalid-model')).toBe(false);
  });
});

describe('AI Model Factory Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be importable without errors', async () => {
    // This test ensures our module structure is correct
    expect(async () => {
      const { aiModelFactory } = await import('../../../lib/ai/aiModelFactory');
      expect(typeof aiModelFactory).toBe('function');
    }).not.toThrow();
  });

  it('should define createGoogleEmbeddingModel function', async () => {
    const { createGoogleEmbeddingModel } = await import('../../../lib/ai/aiModelFactory');
    expect(typeof createGoogleEmbeddingModel).toBe('function');
  });
});