import { EmbeddingModelV1 } from '@ai-sdk/provider';
import { createEmbeddingModel } from '../../aiModelFactory';
import { embed } from 'ai';
import { IEmbeddingService } from './types';

export class EmbeddingService implements IEmbeddingService {
  static #globalEmbeddingModel: EmbeddingModelV1<string>;

  private static get globalEmbeddingModel(): EmbeddingModelV1<string> {
    if (!EmbeddingService.#globalEmbeddingModel) {
      EmbeddingService.#globalEmbeddingModel = createEmbeddingModel();
    }
    return EmbeddingService.#globalEmbeddingModel;
  }
  private static set globalEmbeddingModel(model: EmbeddingModelV1<string>) {
    EmbeddingService.#globalEmbeddingModel = model;
  }

  private openAiClient: EmbeddingModelV1<string>;
  private cacheEmbeddings = true;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(openAiClient?: EmbeddingModelV1<string>) {
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
    if (!this.cacheEmbeddings) {
      return this.getEmbedding(query);
    }
    if (this.embeddingCache.has(query)) {
      return this.embeddingCache.get(query)!;
    }
    const vector = await this.getEmbedding(query);
    this.embeddingCache.set(query, vector);
    return vector;
  }
}
