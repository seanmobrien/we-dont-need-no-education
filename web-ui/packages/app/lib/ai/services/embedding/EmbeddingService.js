import { createEmbeddingModel } from '../../aiModelFactory';
import { embed } from 'ai';
import { globalRequiredSingleton, SingletonProvider, } from '@compliance-theater/typescript';
export class EmbeddingService {
    static get globalEmbeddingModel() {
        return globalRequiredSingleton(Symbol.for('@noeducation/embedding:Model'), async () => createEmbeddingModel());
    }
    static set globalEmbeddingModel(model) {
        const GLOBAL_KEY = Symbol.for('@noeducation/embedding:Model');
        SingletonProvider.Instance.set(GLOBAL_KEY, model);
    }
    embeddingClient;
    cacheEmbeddings = true;
    embeddingCache = new Map();
    constructor(embeddingClient) {
        this.embeddingClient =
            embeddingClient instanceof Promise ||
                typeof embeddingClient === 'undefined'
                ? embeddingClient ?? EmbeddingService.globalEmbeddingModel
                : Promise.resolve(embeddingClient);
    }
    setCacheEmbeddings(cache) {
        this.cacheEmbeddings = cache;
        return this;
    }
    async getEmbedding(query) {
        const ret = await embed({
            model: await this.embeddingClient,
            value: query,
        });
        return ret.embedding;
    }
    async embed(query) {
        if (this.cacheEmbeddings && this.embeddingCache.has(query)) {
            return this.embeddingCache.get(query);
        }
        const vector = await this.getEmbedding(query);
        this.embeddingCache.set(query, vector);
        return vector;
    }
}
//# sourceMappingURL=EmbeddingService.js.map