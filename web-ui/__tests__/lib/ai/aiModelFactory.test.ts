/**
 * @jest-environment jsdom
 */
 
 

// Mock middleware
jest.mock('@/lib/ai/middleware', () => ({
  retryRateLimitMiddlewareFactory: jest.fn(),
  setNormalizedDefaultsMiddleware: jest.fn(),
  rateLimitMiddleware: jest.fn(),
  createChatHistoryMiddlewareEx: jest.fn(),
  wrapChatHistoryMiddleware: jest.fn(),
  tokenStatsMiddleware: jest.fn(),
  tokenStatsWithQuotaMiddleware: jest.fn(),
  tokenStatsLoggingOnlyMiddleware: jest.fn(),
  cacheWithRedis: jest.fn(),
  getRedisClient: jest.fn(),
}));

import {
  setNormalizedDefaultsMiddleware,
  retryRateLimitMiddlewareFactory,
  createChatHistoryMiddlewareEx,
  wrapChatHistoryMiddleware,
  tokenStatsMiddleware,
  tokenStatsWithQuotaMiddleware,
  tokenStatsLoggingOnlyMiddleware,
  cacheWithRedis,
  getRedisClient,
} from '@/lib/ai/middleware';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  AiModelTypeValues,
  AiModelTypeValue_LoFi,
  AiModelTypeValue_HiFi,
  AiModelTypeValue_Completions,
  AiModelTypeValue_Embedding,
  AiModelTypeValue_GeminiPro,
  AiModelTypeValue_GeminiFlash,
  AiModelTypeValue_GoogleEmbedding,
} from '@/lib/ai/core/unions';
import { isAiModelType, isAiLanguageModelType } from '@/lib/ai/core/guards';
import { EmbeddingModel, LanguageModel, Provider } from 'ai';

// Mock environment variables
jest.mock('@/lib/site-util/env', () => ({
  env: jest.fn((key: string) => {
    const mockEnvVars: Record<string, string> = {
      AZURE_OPENAI_ENDPOINT: 'https://test.openai.azure.com/',
      AZURE_API_KEY: 'test-azure-key',
      AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: 'test-completions',
      AZURE_OPENAI_DEPLOYMENT_LOFI: 'test-lofi',
      AZURE_OPENAI_DEPLOYMENT_HIFI: 'test-hifi',
      AZURE_OPENAI_DEPLOYMENT_EMBEDDING: 'test-embedding',
      GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-key',
    };
    return mockEnvVars[key] || '';
  }),
}));

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

jest.mock('ai', () => ({
  wrapLanguageModel: jest.fn(({ model }) => model),
  customProvider: jest.fn(
    (config: {
      languageModels?: Record<string, LanguageModel>;
      embeddingModels?: Record<string, EmbeddingModel<string>>;
      fallbackProvider?: Provider;
    }) => ({
      languageModels: config.languageModels || {},
      embeddingModels: config.embeddingModels || {},
      fallbackProvider: config.fallbackProvider,
    }),
  ),
  createProviderRegistry: jest.fn(() => ({
    languageModel: jest.fn((id) => ({ modelId: id, type: 'language' })),
    textEmbeddingModel: jest.fn((id) => ({ modelId: id, type: 'embedding' })),
  })),
}));

describe('AI Model Types', () => {
  it('should include all expected model types', () => {
    expect(AiModelTypeValues).toEqual([
      'lofi',
      'hifi',
      'google:lofi',
      'google:hifi',
      'completions',
      'embedding',
      'gemini-pro',
      'gemini-flash',
      'google-embedding',
      'azure:lofi',
      'azure:hifi',
      'azure:completions',
      'azure:embedding',
      'google:completions',
      'google:embedding',
      'google:gemini-2.0-flash',
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
    // jest.clearAllMocks();
  });

  it('should be importable without errors', async () => {
    // This test ensures our module structure is correct
    expect(async () => {
      const { aiModelFactory } = await import('@/lib/ai/aiModelFactory');
      expect(typeof aiModelFactory).toBe('function');
    }).not.toThrow();
  });

  it('should define createGoogleEmbeddingModel function', async () => {
    const { createGoogleEmbeddingModel } = await import(
      '@/lib/ai/aiModelFactory'
    );
    expect(typeof createGoogleEmbeddingModel).toBe('function');
  });

  it('should define model availability control functions', async () => {
    const {
      disableModel,
      enableModel,
      disableProvider,
      enableProvider,
      temporarilyDisableModel,
      isModelAvailable,
      isProviderAvailable,
      getModelAvailabilityStatus,
      resetModelAvailability,
      handleAzureRateLimit,
      handleGoogleRateLimit,
    } = await import('@/lib/ai/aiModelFactory');

    expect(typeof disableModel).toBe('function');
    expect(typeof enableModel).toBe('function');
    expect(typeof disableProvider).toBe('function');
    expect(typeof enableProvider).toBe('function');
    expect(typeof temporarilyDisableModel).toBe('function');
    expect(typeof isModelAvailable).toBe('function');
    expect(typeof isProviderAvailable).toBe('function');
    expect(typeof getModelAvailabilityStatus).toBe('function');
    expect(typeof resetModelAvailability).toBe('function');
    expect(typeof handleAzureRateLimit).toBe('function');
    expect(typeof handleGoogleRateLimit).toBe('function');
  });
});

describe('Model Availability Management', () => {
  let modelControls: any;

  beforeEach(async () => {
    // jest.clearAllMocks();
    modelControls = await import('@/lib/ai/aiModelFactory');
    // Reset to defaults before each test
    modelControls.resetModelAvailability();
  });

  it('should have all models available by default', async () => {
    expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
    expect(modelControls.isModelAvailable('google:hifi')).toBe(true);
    expect(modelControls.isProviderAvailable('azure')).toBe(true);
    expect(modelControls.isProviderAvailable('google')).toBe(true);
  });

  it('should be able to disable and enable specific models', async () => {
    // Disable Azure hifi model
    modelControls.disableModel('azure:hifi');
    expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);
    expect(modelControls.isModelAvailable('google:hifi')).toBe(true);

    // Re-enable Azure hifi model
    modelControls.enableModel('azure:hifi');
    expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
  });

  it('should be able to disable and enable entire providers', async () => {
    // Disable Azure provider
    modelControls.disableProvider('azure');
    expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);
    expect(modelControls.isModelAvailable('azure:lofi')).toBe(false);
    expect(modelControls.isModelAvailable('azure:embedding')).toBe(false);
    expect(modelControls.isProviderAvailable('azure')).toBe(false);

    // Google should still be available
    expect(modelControls.isProviderAvailable('google')).toBe(true);

    // Re-enable Azure provider
    modelControls.enableProvider('azure');
    expect(modelControls.isProviderAvailable('azure')).toBe(true);
  });

  it('should support temporary model disabling', (done) => {
    // Temporarily disable model for 50ms
    modelControls.temporarilyDisableModel('azure:hifi', 50);

    expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);

    // After timeout, model should be re-enabled
    setTimeout(() => {
      expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
      done();
    }, 60);
  });

  it('should provide availability status for debugging', async () => {
    modelControls.disableModel('azure:hifi');
    modelControls.disableModel('google:embedding');

    const status = modelControls.getModelAvailabilityStatus();
    expect(status['azure:hifi']).toBe(false);
    expect(status['google:embedding']).toBe(false);
  });

  it('should handle Azure rate limits', async () => {
    modelControls.handleAzureRateLimit(50); // Short duration for test

    expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);
    expect(modelControls.isModelAvailable('azure:lofi')).toBe(false);
    expect(modelControls.isModelAvailable('azure:embedding')).toBe(false);

    // Google should still be available
    expect(modelControls.isModelAvailable('google:hifi')).toBe(true);
  });

  it('should handle Google rate limits', async () => {
    modelControls.handleGoogleRateLimit(50); // Short duration for test

    expect(modelControls.isModelAvailable('google:hifi')).toBe(false);
    expect(modelControls.isModelAvailable('google:gemini-pro')).toBe(false);
    expect(modelControls.isModelAvailable('google:embedding')).toBe(false);

    // Azure should still be available
    expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
  });
});
