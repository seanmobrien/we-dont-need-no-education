/**
 * @fileoverview Minimal unit tests for ModelMap class
 */

import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';

// Mock dependencies
jest.mock('@/lib/ai/services/model-stats/provider-map');

describe('ModelMap Basic Tests', () => {
  const mockProviderMap = {
    id: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ModelMap.reset();

    // Setup ProviderMap mock
    (ProviderMap.getInstance as jest.Mock).mockResolvedValue(mockProviderMap);
    mockProviderMap.id.mockReturnValue('provider-uuid-123');
  });

  afterEach(() => {
    ModelMap.reset();
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

    it('should have uninitialized state before database load', () => {
      const instance = ModelMap.Instance;
      expect(instance.initialized).toBe(false);
    });
  });

  describe('Provider Normalization', () => {
    it('should normalize provider:model format correctly', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel('azure-openai.chat:gpt-4');
      
      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe('provider-uuid-123');
    });

    it('should normalize separate provider and model parameters', async () => {
      const instance = ModelMap.Instance;
      const result = await instance.normalizeProviderModel('azure-openai.chat', 'gpt-4');
      
      expect(result.provider).toBe('azure-openai.chat');
      expect(result.modelName).toBe('gpt-4');
      expect(result.providerId).toBe('provider-uuid-123');
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
});
