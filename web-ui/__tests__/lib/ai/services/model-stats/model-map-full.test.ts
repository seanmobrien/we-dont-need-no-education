/**
 * @fileoverview Unit tests for ModelMap class with comprehensive mocking
 */

import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { LanguageModelV2 } from '@ai-sdk/provider';
// Minimal seeded data to drive lookups
import {
  PROVIDER_ID_AZURE,
  setupMaps,
} from '@/__tests__/setup/jest.mock-provider-model-maps';
import { hideConsoleOutput } from '@/__tests__/test-utils';
const mockConsole = hideConsoleOutput();

describe('ModelMap with Full Mocking', () => {
  const mockProviderId = PROVIDER_ID_AZURE;

  beforeEach(() => {
    setupMaps();
  });

  afterEach(() => {
    ModelMap.reset();
    mockConsole.dispose();
  });

  describe('Singleton Pattern', () => {
    it('should create singleton instance', () => {
      const instance = ModelMap.Instance;
      expect(instance).toBeInstanceOf(ModelMap);
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
    });
    const MODEL_ID_GPT4 = '97e291f6-4396-472e-9cb5-13cc94291879';
    it('should get model by provider and name', async () => {
      const instance = await ModelMap.getInstance();
      const model = await instance.getModelByProviderAndName(
        'azure',
        'gpt-4.1',
      );

      expect(model).toEqual(
        expect.objectContaining({
          createdAt: '2025-08-01T14:18:55.625835+00:00',
          description:
            'High-fidelity Azure OpenAI GPT-4 model for complex reasoning and analysis',
          displayName: 'Azure GPT-4.1',
          id: '97e291f6-4396-472e-9cb5-13cc94291879',
          isActive: true,
          modelName: 'gpt-4.1',
          providerId: PROVIDER_ID_AZURE,
          updatedAt: '2025-08-01T14:18:55.625835+00:00',
        }),
      );
    });

    it('should get quota by model ID', async () => {
      const instance = await ModelMap.getInstance();
      const quota = await instance.getQuotaByModelId(MODEL_ID_GPT4);

      expect(quota).toEqual(
        expect.objectContaining({
          createdAt: '2025-08-01T14:21:16.896854+00:00',
          id: '6bf2bf6c-6b94-485b-945b-20c762f1fe18',
          isActive: true,
          maxTokensPerDay: undefined,
          maxTokensPerMessage: 128000,
          maxTokensPerMinute: 50000,
          modelId: '97e291f6-4396-472e-9cb5-13cc94291879',
          updatedAt: '2025-08-01T14:21:16.896854+00:00',
        }),
      );
    });
  });

  describe('LanguageModelV2 Integration', () => {
    it('should extract model info from LanguageModelV2 instance', async () => {
      const instance = await ModelMap.getInstance();

      const mockLanguageModelV2: LanguageModelV2 = {
        provider: 'azure-openai.chat',
        modelId: 'gpt-4.1',
      } as LanguageModelV2;

      const modelInfo =
        await instance.normalizeProviderModel(mockLanguageModelV2);

      expect(modelInfo.modelName).toEqual('gpt-4.1');
      expect(modelInfo.modelId).toEqual('97e291f6-4396-472e-9cb5-13cc94291879');
      expect(modelInfo.providerId).toEqual(mockProviderId);
    });

    it('should handle missing provider or modelId', async () => {
      mockConsole.setup();
      const instance = await ModelMap.getInstance();

      const incompleteModel: LanguageModelV2 = {
        provider: 'azure-openai-blahblah.chat',
      } as LanguageModelV2; // Missing modelId

      const modelInfo = await instance.normalizeProviderModel(incompleteModel);
      expect(modelInfo.modelId).toBeUndefined();
    });
  });

  describe('Provider/Model Normalization', () => {
    it('should normalize provider:model format correctly', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'azure-openai.chat:gpt-4.1',
      );

      expect(result.provider).toBe('azure');
      expect(result.modelName).toBe('gpt-4.1');
      expect(result.providerId).toBe(PROVIDER_ID_AZURE);
    });

    it('should support retrieving providerId:modelName format', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        PROVIDER_ID_AZURE + ':gpt-4.1',
      );
      result.rethrow();
      expect(result.provider).toBe('azure');
      expect(result.modelName).toBe('gpt-4.1');
      expect(result.providerId).toBe(PROVIDER_ID_AZURE);
    });

    it('should normalize separate provider and model parameters', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'azure-openai.chat',
        'gpt-4',
      );

      expect(result.provider).toBe('azure');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe(mockProviderId);
    });

    it('should handle unknown provider gracefully', async () => {
      mockConsole.setup();
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel(
        'unknown-provider',
        'some-model',
      );

      expect(result.provider).toBeUndefined();
      expect('some-model').toBe('some-model');
      expect(result.providerId).toBeUndefined();
      expect(() => result.rethrow()).toThrow(
        'Provider not found: unknown-provider',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should check if model exists', async () => {
      mockConsole.setup();
      const instance = await ModelMap.getInstance();

      const exists = await instance.contains('azure', 'gpt-4.1');
      expect(exists).toBe(true);
      const notExists = await instance.contains(
        'azure-openai.chat',
        'non-existent',
      );
      expect(notExists).toBe(false);
    });

    it('should provide correct cache metadata', async () => {
      const instance = await ModelMap.getInstance();

      expect(instance.allIds).toContain('bc1a33e7-1330-4be1-913a-28bda8ebd835');
      expect(instance.allProviderModelKeys).toContain(
        `${PROVIDER_ID_AZURE}:gpt-4.1`,
      );
    });
  });
});
