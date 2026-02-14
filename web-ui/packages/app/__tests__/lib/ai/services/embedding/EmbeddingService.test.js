import { EmbeddingService } from '@/lib/ai/services/embedding/EmbeddingService';
import { createEmbeddingModel } from '@/lib/ai/aiModelFactory';
jest.mock('@/lib/ai/aiModelFactory', () => ({
    createEmbeddingModel: jest.fn(() => Promise.resolve({
        provider: 'test-provider',
        modelId: 'test-model',
    })),
}));
jest.mock('ai', () => ({
    embed: jest.fn(async ({ value }) => ({
        embedding: Array.from({ length: 5 }, (_, i) => i + value.length),
    })),
}));
import { embed } from 'ai';
describe('EmbeddingService', () => {
    beforeEach(() => {
    });
    it('creates a global embedding model lazily', async () => {
        const service1 = new EmbeddingService();
        await service1.embed('one');
        const service2 = new EmbeddingService();
        await service2.embed('two');
        expect(createEmbeddingModel).toHaveBeenCalledTimes(1);
    });
    it('caches embeddings by default', async () => {
        const service = new EmbeddingService();
        const first = await service.embed('hello');
        const second = await service.embed('hello');
        expect(first).toEqual(second);
        expect(embed).toHaveBeenCalledTimes(1);
    });
    it('can disable caching via setCacheEmbeddings(false)', async () => {
        const service = new EmbeddingService().setCacheEmbeddings(false);
        const a = await service.embed('hello');
        const b = await service.embed('hello');
        expect(a).toEqual(b);
        expect(embed).toHaveBeenCalledTimes(2);
    });
    it('stores and returns distinct embeddings for different queries', async () => {
        const service = new EmbeddingService();
        const a = await service.embed('abc');
        const b = await service.embed('abcd');
        expect(a).not.toEqual(b);
        expect(embed).toHaveBeenCalledTimes(2);
    });
    it('supports injecting a custom model instance (bypasses global creation)', async () => {
        const customModel = {
            provider: 'alt',
            modelId: 'alt-model',
        };
        const service = new EmbeddingService(customModel);
        await service.embed('x');
        expect(createEmbeddingModel).not.toHaveBeenCalled();
    });
    it('reuses cached value only when identical query string provided', async () => {
        const service = new EmbeddingService();
        await service.embed('Case');
        await service.embed('case');
        expect(embed).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=EmbeddingService.test.js.map