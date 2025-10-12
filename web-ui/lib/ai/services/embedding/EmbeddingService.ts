import { EmbeddingModelV2 } from '@ai-sdk/provider';
import { createEmbeddingModel } from '../../aiModelFactory';
import { embed } from 'ai';
import { IEmbeddingService } from './types';

export class EmbeddingService implements IEmbeddingService {
  /**
   * Global embedding model stored in a Symbol-backed registry to avoid
   * duplication across HMR/SSR/multi-bundle environments.
   */
  private static get globalEmbeddingModel(): EmbeddingModelV2<string> {
    const GLOBAL_KEY = Symbol.for('@noeducation/embedding:Model');
    const registry = globalThis as unknown as {
      [key: symbol]: EmbeddingModelV2<string> | undefined;
    };
    if (!registry[GLOBAL_KEY]) {
      registry[GLOBAL_KEY] = createEmbeddingModel();
    }
    return registry[GLOBAL_KEY]!;
  }
  private static set globalEmbeddingModel(model: EmbeddingModelV2<string>) {
    const GLOBAL_KEY = Symbol.for('@noeducation/embedding:Model');
    const registry = globalThis as unknown as {
      [key: symbol]: EmbeddingModelV2<string> | undefined;
    };
    registry[GLOBAL_KEY] = model;
  }

  private openAiClient: EmbeddingModelV2<string>;
  private cacheEmbeddings = true;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(openAiClient?: EmbeddingModelV2<string>) {
    this.openAiClient = openAiClient ?? EmbeddingService.globalEmbeddingModel;
  }

  public setCacheEmbeddings(cache: boolean): this {
    this.cacheEmbeddings = cache;
    return this;
  }

  private async getEmbedding(query: string): Promise<number[]> {
    const ret = await embed({
      model: this.openAiClient,
      value: query,
    });
    return ret.embedding;
  }

  public async embed(query: string): Promise<number[]> {
    if (this.cacheEmbeddings && this.embeddingCache.has(query)) {
      return this.embeddingCache.get(query)!;
    }
    const vector = await this.getEmbedding(query);
    this.embeddingCache.set(query, vector);
    return vector;
  }
}
