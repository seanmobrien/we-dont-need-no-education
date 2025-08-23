/**
 * @fileoverview Unit tests for ModelMap class with comprehensive mocking
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the schema before importing ModelMap
const mockSchema = {
  models: {
    id: { name: 'id' },
    providerId: { name: 'providerId' },
    modelName: { name: 'modelName' },
    displayName: { name: 'displayName' },
    description: { name: 'description' },
    isActive: { name: 'isActive' },
    createdAt: { name: 'createdAt' },
    updatedAt: { name: 'updatedAt' },
  },
  providers: {
    id: { name: 'id' },
    name: { name: 'name' },
  },
  modelQuotas: {
    id: { name: 'id' },
    modelId: { name: 'modelId' },
    maxTokensPerMessage: { name: 'maxTokensPerMessage' },
    maxTokensPerMinute: { name: 'maxTokensPerMinute' },
    maxTokensPerDay: { name: 'maxTokensPerDay' },
    isActive: { name: 'isActive' },
    createdAt: { name: 'createdAt' },
    updatedAt: { name: 'updatedAt' },
  },
};

jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
  schema: mockSchema,
}));

jest.mock('@/lib/ai/services/model-stats/provider-map');
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { drizDbWithInit } from '@/lib/drizzle-db';

describe('ModelMap with Full Mocking', () => {
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
  ];

  const mockProviderMap = {
    id: jest.fn(),
  };

  const createMockDatabase = () => {
    let queryCount = 0;
    
    const mockQuery = {
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const mockDatabase = {
      select: jest.fn().mockImplementation(() => {
        queryCount++;
        return {
          ...mockQuery,
          // The final result of the query chain - needs to be awaitable
          then: (resolve: any) => {
            const result = queryCount === 1 ? mockModelsWithProviders : mockQuotas;
            return Promise.resolve(result).then(resolve);
          },
        };
      }),
    };

    return mockDatabase;
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

    // Setup database mock
    (drizDbWithInit as jest.Mock).mockImplementation(() => {
      return Promise.resolve(createMockDatabase());
    });
  });

  afterEach(() => {
    ModelMap.reset();
  });

  describe('Singleton Pattern', () => {
    it('should create singleton instance', () => {
      const instance = ModelMap.Instance;
      expect(instance).toBeInstanceOf(ModelMap);
      expect(instance.initialized).toBe(false);
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

  describe('Database Initialization', () => {
    it('should initialize with database', async () => {
      const instance = await ModelMap.getInstance();
      
      expect(instance.initialized).toBe(true);
      expect(drizDbWithInit).toHaveBeenCalled();
    });

    it('should get model by provider and name', async () => {
      const instance = await ModelMap.getInstance();
      const model = await instance.getModelByProviderAndName('azure-openai.chat', 'gpt-4');
      
      expect(model).toEqual(expect.objectContaining({
        id: 'model-uuid-123',
        providerId: mockProviderId,
        modelName: 'gpt-4',
        displayName: 'GPT-4 Turbo',
      }));
    });

    it('should get quota by model ID', async () => {
      const instance = await ModelMap.getInstance();
      const quota = await instance.getQuotaByModelId('model-uuid-123');
      
      expect(quota).toEqual(expect.objectContaining({
        modelId: 'model-uuid-123',
        maxTokensPerMessage: 8192,
        maxTokensPerMinute: 40000,
        maxTokensPerDay: 1000000,
      }));
    });
  });

  describe('LanguageModelV1 Integration', () => {
    it('should extract model info from LanguageModelV1 instance', async () => {
      const instance = await ModelMap.getInstance();

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

    it('should handle missing provider or modelId', async () => {
      const instance = await ModelMap.getInstance();

      const incompleteModel: LanguageModelV1 = {
        provider: 'azure-openai.chat',
      } as LanguageModelV1; // Missing modelId

      const modelInfo = await instance.getModelFromLanguageModelV1(incompleteModel);
      expect(modelInfo).toBeNull();
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
      const instance = await ModelMap.getInstance();

      const exists = await instance.contains('azure-openai.chat', 'gpt-4');
      expect(exists).toBe(true);
      
      const notExists = await instance.contains('azure-openai.chat', 'non-existent');
      expect(notExists).toBe(false);
    });

    it('should provide correct cache metadata', async () => {
      const instance = await ModelMap.getInstance();

      expect(instance.allIds).toContain('model-uuid-123');
      expect(instance.allProviderModelKeys).toContain(`${mockProviderId}:gpt-4`);
    });
  });
});
