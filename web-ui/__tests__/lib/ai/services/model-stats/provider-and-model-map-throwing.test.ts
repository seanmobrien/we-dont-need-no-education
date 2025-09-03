import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import {
  ModelResourceNotFoundError,
  isModelResourceNotFoundError,
} from '@/lib/ai/services/chat/errors/model-resource-not-found-error';

// Minimal seeded data to drive lookups
import {
  providerRecords,
  modelRecords,
  quotaRecords,
  PROVIDER_ID_AZURE,
  MODEL_GPT4o,
  setupMaps,
} from '@/__tests__/jest.mock-provider-model-maps';

describe('ProviderMap OrThrow + ModelMap normalization throwing', () => {
  beforeEach(() => {
    // Reset ModelMap singleton to avoid DB paths
    setupMaps();
    //jest.restoreAllMocks();
  });

  test('ProviderMap OrThrow methods throw domain error when missing', async () => {
    const pm = ProviderMap.Instance;
    const providerRecord = providerRecords[0][0];

    expect(pm.name('azure-openai.chat')).toBe('azure');
    expect(pm.id('azure-openai.chat')).toBe(PROVIDER_ID_AZURE);
    expect(() => pm.recordOrThrow('unknown')).toThrow(
      ModelResourceNotFoundError,
    );
    try {
      pm.idOrThrow('unknown');
      fail('expected to throw');
    } catch (e) {
      expect(isModelResourceNotFoundError(e)).toBe(true);
      if (isModelResourceNotFoundError(e)) {
        expect(e.resourceType).toBe('provider');
      }
    }
  });

  test('ModelMap.normalizeProviderModel rethrow throws provider not found', async () => {
    // Instantiate ModelMap via its private constructor using a typed cast to avoid any
    const mm = await ModelMap.getInstance();
    const norm = await mm.normalizeProviderModel('missing-provider', 'gpt-4');
    expect(norm.provider).toBeUndefined();
    expect(norm.providerId).toBeUndefined();
    expect(() => norm.rethrow()).toThrow(ModelResourceNotFoundError);
  });

  test('ModelMap.normalizeProviderModel rethrow throws model not found when provider exists', async () => {
    const mm = await ModelMap.getInstance();

    const norm = await mm.normalizeProviderModel('azure-openai.chat', 'nope');
    expect(norm.provider).toBe('azure');
    expect(norm.modelId).toBeUndefined();
    try {
      norm.rethrow();
      fail('expected throw');
    } catch (e) {
      expect(isModelResourceNotFoundError(e)).toBe(true);
      if (isModelResourceNotFoundError(e)) {
        expect(e.resourceType).toBe('model');
        expect(String(e.normalized)).toContain(
          'b555b85f-5b2f-45d8-a317-575a3ab50ff2:nope',
        );
      }
    }
  });
});
