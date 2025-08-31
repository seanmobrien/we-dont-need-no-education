/**
 * @fileoverview Unit tests for ModelMap class with comprehensive mocking
 */

jest.mock('@/lib/ai/services/model-stats/provider-map');
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { LanguageModel } from '@ai-sdk/provider';
import { drizDb, drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { IMockQueryBuilder } from '@/__tests__/jest.mock-drizzle';

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
    const ret = drizDb();
    const mock = ret as unknown as IMockQueryBuilder;

    mock.__setRecords(async (ctx) => {
      if (ctx.isFrom('models')) {
        return mockModelsWithProviders;
      }
      if (ctx.isFrom(schema.modelQuotas)) {
        return mockQuotas;
      }
      return false;
    });
    return mock;
  };
  let mockDb: IMockQueryBuilder;

  beforeEach(() => {
    // jest.clearAllMocks();
    ModelMap.reset();

    // Setup ProviderMap mock
    (ProviderMap.getInstance as jest.Mock).mockResolvedValue(mockProviderMap);
    mockProviderMap.id.mockImplementation((provider: string) => {
      if (provider === 'azure-openai.chat') return mockProviderId;
      if (provider === 'google') return mockGoogleProviderId;
      return null;
    });
    mockDb = createMockDatabase();
  });

  afterEach(() => {
    ModelMap.reset();
    mockDb?.__resetMocks();
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
      const model = await instance.getModelByProviderAndName(
        'azure-openai.chat',
        'gpt-4',
      );

      expect(model).toEqual(
        expect.objectContaining({
          id: 'model-uuid-123',
          providerId: mockProviderId,
          modelName: 'gpt-4',
          displayName: 'GPT-4 Turbo',
        }),
      );
    });

    it('should get quota by model ID', async () => {
      const instance = await ModelMap.getInstance();
      const quota = await instance.getQuotaByModelId('model-uuid-123');

      expect(quota).toEqual(
        expect.objectContaining({
          modelId: 'model-uuid-123',
          maxTokensPerMessage: 8192,
          maxTokensPerMinute: 40000,
          maxTokensPerDay: 1000000,
        }),
      );
    });
  });

  describe('LanguageModel Integration', () => {
    it('should extract model info from LanguageModel instance', async () => {
      const instance = await ModelMap.getInstance();

      const mockLanguageModel: LanguageModel = {
        provider: 'azure-openai.chat',
        modelId: 'gpt-4',
      } as LanguageModel;

      const modelInfo =
        await instance.normalizeProviderModel(mockLanguageModel);

      expect(modelInfo.modelName).toEqual('gpt-4');
      expect(modelInfo.modelId).toEqual('model-uuid-123');
      expect(modelInfo.providerId).toEqual(mockProviderId);
    });

    it('should handle missing provider or modelId', async () => {
      const instance = await ModelMap.getInstance();

      const incompleteModel: LanguageModel = {
        provider: 'azure-openai-blahblah.chat',
      } as LanguageModel; // Missing modelId

      const modelInfo = await instance.normalizeProviderModel(incompleteModel);
      expect(modelInfo.modelId).toBeUndefined();
    });
  });

  describe('Provider/Model Normalization', () => {
    it('should normalize provider:model format correctly', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'azure-openai.chat:gpt-4',
      );

      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe(mockProviderId);
    });

    it('should normalize separate provider and model parameters', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'azure-openai.chat',
        'gpt-4',
      );

      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe(mockProviderId);
    });

    it('should handle unknown provider gracefully', async () => {
      mockProviderMap.id.mockReturnValue(null);

      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'unknown-provider',
        'some-model',
      );

      expect(result.provider).toBe('unknown-provider');
      expect(result.modelName).toBe('some-model');
      expect(result.providerId).toBeUndefined();
      expect(() => result.rethrow()).toThrow(
        'Provider not found: unknown-provider',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should check if model exists', async () => {
      const instance = await ModelMap.getInstance();

      const exists = await instance.contains('azure-openai.chat', 'gpt-4');
      expect(exists).toBe(true);

      const notExists = await instance.contains(
        'azure-openai.chat',
        'non-existent',
      );
      expect(notExists).toBe(false);
    });

    it('should provide correct cache metadata', async () => {
      const instance = await ModelMap.getInstance();

      expect(instance.allIds).toContain('model-uuid-123');
      expect(instance.allProviderModelKeys).toContain(
        `${mockProviderId}:gpt-4`,
      );
    });
  });
});
