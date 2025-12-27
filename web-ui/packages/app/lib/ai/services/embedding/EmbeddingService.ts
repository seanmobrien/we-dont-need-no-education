import { EmbeddingModelV2 } from '@ai-sdk/provider';
import { createEmbeddingModel } from '../../aiModelFactory';
import { embed } from 'ai';
import { IEmbeddingService } from './types';
import { globalRequiredSingleton, SingletonProvider } from '@repo/lib-typescript';

export class EmbeddingService implements IEmbeddingService {
  private static get globalEmbeddingModel(): Promise<EmbeddingModelV2<string>> {
    return globalRequiredSingleton(Symbol.for('@noeducation/embedding:Model'), async () =>
      createEmbeddingModel(),
    );
  }
  private static set globalEmbeddingModel(model: Promise<EmbeddingModelV2<string>>) {
    const GLOBAL_KEY = Symbol.for('@noeducation/embedding:Model');
    SingletonProvider.Instance.set<Promise<EmbeddingModelV2<string>>, symbol>(
      GLOBAL_KEY,
      model,
    );
  }

  private embeddingClient: Promise<EmbeddingModelV2<string>>;
  private cacheEmbeddings = true;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(embeddingClient?: EmbeddingModelV2<string> | Promise<EmbeddingModelV2<string>>) {
    this.embeddingClient =
      embeddingClient instanceof Promise || typeof embeddingClient === 'undefined'
        ? (embeddingClient ?? EmbeddingService.globalEmbeddingModel)
        : Promise.resolve(embeddingClient);
  }

  public setCacheEmbeddings(cache: boolean): this {
    this.cacheEmbeddings = cache;
    return this;
  }

  private async getEmbedding(query: string): Promise<number[]> {
    const ret = await embed({
      model: await this.embeddingClient,
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
