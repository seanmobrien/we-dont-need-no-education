import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ModelResourceNotFoundError, isModelResourceNotFoundError } from '@/lib/ai/services/chat/errors/model-resource-not-found-error';

// Minimal seeded data to drive lookups
const seedProviders: Array<[
  string,
  { name: string; displayName: string; description: string; baseUrl: string; isActive: boolean; aliases: string[] }
]> = [
  ['prov-1', { name: 'azure-openai.chat', displayName: 'Azure OpenAI', description: '', baseUrl: 'https://example', isActive: true, aliases: [] }],
  ['prov-2', { name: 'google.gemini', displayName: 'Google Gemini', description: '', baseUrl: 'https://example', isActive: true, aliases: [] }],
];

const seedModels: Array<[
  string,
  { id: string; providerId: string; providerName?: string; modelName: string; displayName?: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string }
]> = [
  ['prov-1:gpt-4', { id: 'model-1', providerId: 'prov-1', providerName: 'azure-openai.chat', modelName: 'gpt-4', displayName: undefined, description: undefined, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
];

describe('ProviderMap OrThrow + ModelMap normalization throwing', () => {
  beforeEach(() => {
    // Reset ModelMap singleton to avoid DB paths
    ModelMap.reset();
    //jest.restoreAllMocks();
  });

  test('ProviderMap OrThrow methods throw domain error when missing', async () => {
  const pm = new ProviderMap(seedProviders);

    expect(pm.name('prov-1')).toBe('azure-openai.chat');
    expect(pm.id('azure-openai.chat')).toBe('prov-1');

    expect(() => pm.recordOrThrow('unknown')).toThrow(ModelResourceNotFoundError);
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
    const pm = new ProviderMap(seedProviders);
    jest.spyOn(ProviderMap, 'getInstance').mockResolvedValue(pm);
    // Instantiate ModelMap via its private constructor using a typed cast to avoid any
    const ModelMapCtor = ModelMap as unknown as {
      new (seed: ReadonlyArray<readonly [string, { id: string; providerId: string; providerName?: string; modelName: string; displayName?: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string }]>): ModelMap;
    };
    const mm = new ModelMapCtor(seedModels);

    const norm = await mm.normalizeProviderModel('missing-provider', 'gpt-4');
    expect(norm.provider).toBe('missing-provider');
    expect(norm.providerId).toBeUndefined();
    expect(() => norm.rethrow()).toThrow(ModelResourceNotFoundError);
  });

  test('ModelMap.normalizeProviderModel rethrow throws model not found when provider exists', async () => {
    const pm = new ProviderMap(seedProviders);
    jest.spyOn(ProviderMap, 'getInstance').mockResolvedValue(pm);
    const ModelMapCtor = ModelMap as unknown as {
      new (seed: ReadonlyArray<readonly [string, { id: string; providerId: string; providerName?: string; modelName: string; displayName?: string; description?: string; isActive: boolean; createdAt: string; updatedAt: string }]>): ModelMap;
    };
    const mm = new ModelMapCtor(seedModels);

    const norm = await mm.normalizeProviderModel('azure-openai.chat', 'nope');
    expect(norm.providerId).toBe('prov-1');
    expect(norm.modelId).toBeUndefined();
    try {
      norm.rethrow();
      fail('expected throw');
    } catch (e) {
      expect(isModelResourceNotFoundError(e)).toBe(true);
      if (isModelResourceNotFoundError(e)) {
        expect(e.resourceType).toBe('model');
        expect(String(e.normalized)).toContain('prov-1:nope');
      }
    }
  });
});
