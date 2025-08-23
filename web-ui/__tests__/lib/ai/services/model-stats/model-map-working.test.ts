/**
 * @fileoverview Working unit tests for ModelMap class with database mocking
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { LanguageModelV1 } from '@ai-sdk/provider';

// Mock dependencies
jest.mock('@/lib/ai/services/model-stats/provider-map');

describe('ModelMap Working Tests', () => {
  const mockProviderId = 'provider-uuid-123';
  const mockGoogleProviderId = 'google-provider-uuid';

  const mockModelsWithProviders = [
    {
      modelId: 'model-uuid-123',
      providerId: mockProviderId,
      modelName: 'gpt-4',
      displayName: 'GPT-4 Turbo',
      description: 'Latest GPT-4 model',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      providerName: 'azure-openai.chat',
    },
    {
      modelId: 'model-uuid-456',
      providerId: mockGoogleProviderId,
      modelName: 'gemini-pro',
      displayName: 'Gemini Pro',
      description: 'Google Gemini Pro model',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      providerName: 'google',
    },
  ];

  const mockQuotas = [
    {
      id: 'quota-uuid-123',
      modelId: 'model-uuid-123',
      maxTokensPerMessage: 8192,
      maxTokensPerMinute: 40000,
      maxTokensPerDay: 1000000,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'quota-uuid-456',
      modelId: 'model-uuid-456',
      maxTokensPerMessage: 4096,
      maxTokensPerMinute: 20000,
      maxTokensPerDay: 500000,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockProviderMap = {
    id: jest.fn(),
  };

  // Create a mock database that mimics Drizzle ORM query structure
  const createMockDatabase = () => {
    return {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockImplementation(() => {
        // Return different data based on what's being queried
        // This is a simple approach - in reality, you'd want more sophisticated query parsing
        const call = (this as any).select.mock.calls[0];
        if (call && call[0] && call[0].providerName) {
          return Promise.resolve(mockModelsWithProviders);
        } else {
          return Promise.resolve(mockQuotas);
        }
      }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ModelMap.reset();

    // Setup ProviderMap mock
    (ProviderMap.getInstance as jest.Mock).mockResolvedValue(mockProviderMap);
    mockProviderMap.id.mockImplementation((provider: string) => {
      if (provider === 'azure-openai.chat') return mockProviderId;
      if (provider === 'google') return mockGoogleProviderId;
      return null;
    });
  });

  afterEach(() => {
    ModelMap.reset();
  });

  describe('Basic Functionality', () => {
    it('should create singleton instance', () => {
      const instance = ModelMap.Instance;
      expect(instance).toBeInstanceOf(ModelMap);
      expect(instance.initialized).toBe(false); // Not initialized until refresh is called
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = ModelMap.Instance;
      const instance2 = ModelMap.Instance;
      expect(instance1).toBe(instance2);
    });

    it('should reset and create new instance after reset', () => {
      const instance1 = ModelMap.Instance;
      ModelMap.reset();
      const instance2 = ModelMap.Instance;
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Database Operations', () => {
    it('should initialize with mock database', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      
      const result = await instance.refresh(mockDb as any);
      
      expect(result).toBe(true);
      expect(instance.initialized).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should get model by provider and name after initialization', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      
      await instance.refresh(mockDb as any);
      const model = await instance.getModelByProviderAndName('azure-openai.chat', 'gpt-4');
      
      expect(model).toEqual(expect.objectContaining({
        id: 'model-uuid-123',
        providerId: mockProviderId,
        modelName: 'gpt-4',
        displayName: 'GPT-4 Turbo',
      }));
    });

    it('should get quota by model ID', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      
      await instance.refresh(mockDb as any);
      const quota = await instance.getQuotaByModelId('model-uuid-123');
      
      expect(quota).toEqual(expect.objectContaining({
        modelId: 'model-uuid-123',
        maxTokensPerMessage: 8192,
        maxTokensPerMinute: 40000,
        maxTokensPerDay: 1000000,
      }));
    });

    it('should get model with quota', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      
      await instance.refresh(mockDb as any);
      const modelWithQuota = await instance.getModelWithQuota('azure-openai.chat', 'gpt-4');
      
      expect(modelWithQuota).toEqual(expect.objectContaining({
        id: 'model-uuid-123',
        modelName: 'gpt-4',
        quota: expect.objectContaining({
          maxTokensPerMessage: 8192,
        }),
      }));
    });
  });

  describe('LanguageModelV1 Integration', () => {
    it('should extract model info from LanguageModelV1 instance', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      await instance.refresh(mockDb as any);

      const mockLanguageModel: LanguageModelV1 = {
        provider: 'azure-openai.chat',
        modelId: 'gpt-4',
      } as LanguageModelV1;

      const modelInfo = await instance.getModelFromLanguageModelV1(mockLanguageModel);
      
      expect(modelInfo).toEqual(expect.objectContaining({
        modelName: 'gpt-4',
        providerId: mockProviderId,
        quota: expect.objectContaining({
          maxTokensPerMessage: 8192,
        }),
      }));
    });

    it('should handle Google models with prefix stripping', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      await instance.refresh(mockDb as any);

      const mockGoogleModel: LanguageModelV1 = {
        provider: 'google',
        modelId: 'models/gemini-pro',  // Google models have "models/" prefix
      } as LanguageModelV1;

      const modelInfo = await instance.getModelFromLanguageModelV1(mockGoogleModel);
      
      expect(modelInfo).toEqual(expect.objectContaining({
        modelName: 'gemini-pro',  // Prefix should be stripped
        providerId: mockGoogleProviderId,
        quota: expect.objectContaining({
          maxTokensPerMessage: 4096,
        }),
      }));
    });
  });

  describe('Provider/Model Normalization', () => {
    it('should normalize provider:model format correctly', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel('azure-openai.chat:gpt-4');
      
      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe(mockProviderId);
    });

    it('should normalize separate provider and model parameters', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel('azure-openai.chat', 'gpt-4');
      
      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe(mockProviderId);
    });

    it('should handle unknown provider gracefully', async () => {
      mockProviderMap.id.mockReturnValue(null);
      
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel('unknown-provider', 'some-model');
      
      expect(result.provider).toBe('unknown-provider');
      expect(result.modelName).toBe('some-model');
      expect(result.providerId).toBeUndefined();
      expect(() => result.rethrow()).toThrow('Unknown provider: unknown-provider');
    });
  });

  describe('Utility Methods', () => {
    it('should check if model exists', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      await instance.refresh(mockDb as any);

      const exists = await instance.contains('azure-openai.chat', 'gpt-4');
      expect(exists).toBe(true);
      
      const notExists = await instance.contains('azure-openai.chat', 'non-existent');
      expect(notExists).toBe(false);
    });

    it('should get all models for a provider', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      await instance.refresh(mockDb as any);

      const models = await instance.getModelsForProvider('azure-openai.chat');
      
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual(expect.objectContaining({
        modelName: 'gpt-4',
        providerId: mockProviderId,
      }));
    });

    it('should provide correct cache metadata', async () => {
      const instance = ModelMap.Instance;
      const mockDb = createMockDatabase();
      await instance.refresh(mockDb as any);

      expect(instance.allIds).toContain('model-uuid-123');
      expect(instance.allIds).toContain('model-uuid-456');
      expect(instance.allProviderModelKeys).toContain(`${mockProviderId}:gpt-4`);
      expect(instance.allProviderModelKeys).toContain(`${mockGoogleProviderId}:gemini-pro`);
    });
  });
});
