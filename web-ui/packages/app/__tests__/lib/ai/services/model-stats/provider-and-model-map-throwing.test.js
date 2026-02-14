import { ProviderMap } from '@/lib/ai/services/model-stats/provider-map';
import { ModelMap } from '@/lib/ai/services/model-stats/model-map';
import { ResourceNotFoundError, isResourceNotFoundError, } from '@/lib/ai/services/chat/errors/resource-not-found-error';
import { PROVIDER_ID_AZURE, setupMaps, } from '@/__tests__/setup/jest.mock-provider-model-maps';
describe('ProviderMap OrThrow + ModelMap normalization throwing', () => {
    beforeEach(() => {
        setupMaps();
    });
    test('ProviderMap OrThrow methods throw domain error when missing', async () => {
        const pm = ProviderMap.Instance;
        expect(pm.name('azure-openai.chat')).toBe('azure');
        expect(pm.id('azure-openai.chat')).toBe(PROVIDER_ID_AZURE);
        expect(() => pm.recordOrThrow('unknown')).toThrow(ResourceNotFoundError);
        try {
            pm.idOrThrow('unknown');
            fail('expected to throw');
        }
        catch (e) {
            expect(isResourceNotFoundError(e)).toBe(true);
            if (isResourceNotFoundError(e)) {
                expect(e.resourceType).toBe('provider');
            }
        }
    });
    test('ModelMap.normalizeProviderModel rethrow throws provider not found', async () => {
        const mm = await ModelMap.getInstance();
        const norm = await mm.normalizeProviderModel('missing-provider', 'gpt-4');
        expect(norm.provider).toBeUndefined();
        expect(norm.providerId).toBeUndefined();
        expect(() => norm.rethrow()).toThrow(ResourceNotFoundError);
    });
    test('ModelMap.normalizeProviderModel rethrow throws model not found when provider exists', async () => {
        const mm = await ModelMap.getInstance();
        const norm = await mm.normalizeProviderModel('azure-openai.chat', 'nope');
        expect(norm.provider).toBe('azure');
        expect(norm.modelId).toBeUndefined();
        try {
            norm.rethrow();
            fail('expected throw');
        }
        catch (e) {
            expect(isResourceNotFoundError(e)).toBe(true);
            if (isResourceNotFoundError(e)) {
                expect(e.resourceType).toBe('model');
                expect(String(e.normalized)).toContain('b555b85f-5b2f-45d8-a317-575a3ab50ff2:nope');
            }
        }
    });
});
//# sourceMappingURL=provider-and-model-map-throwing.test.js.map