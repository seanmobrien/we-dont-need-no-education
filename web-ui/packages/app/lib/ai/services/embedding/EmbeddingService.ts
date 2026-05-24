import { EmbeddingModelV2 } from '@ai-sdk/provider';
import { createEmbeddingModel } from '../../aiModelFactory';
import { embed } from '@compliance-theater/types/ai-sdk';
import { IEmbeddingService } from './types';
import {
  globalRequiredSingleton,
  SingletonProvider,
} from '@compliance-theater/logger/singleton-provider';

type EmbeddingServiceOptions = {
  expectedDimensions?: number;
};

export class EmbeddingService implements IEmbeddingService {
  private static get globalEmbeddingModel(): Promise<EmbeddingModelV2<string>> {
    return globalRequiredSingleton(
      Symbol.for('@noeducation/embedding:Model'),
      async () => createEmbeddingModel()
    );
  }
  private static set globalEmbeddingModel(
    model: Promise<EmbeddingModelV2<string>>
  ) {
    const GLOBAL_KEY = Symbol.for('@noeducation/embedding:Model');
    SingletonProvider.Instance.set<Promise<EmbeddingModelV2<string>>, symbol>(
      GLOBAL_KEY,
      model
    );
  }

  private embeddingClient: Promise<EmbeddingModelV2<string>>;
  private cacheEmbeddings = true;
  private embeddingCache: Map<string, number[]> = new Map();
  private readonly expectedDimensions: number | undefined;

  constructor(
    embeddingClient?:
      | EmbeddingModelV2<string>
      | Promise<EmbeddingModelV2<string>>,
    options?: EmbeddingServiceOptions,
  ) {
    this.embeddingClient =
      embeddingClient instanceof Promise ||
        typeof embeddingClient === 'undefined'
        ? embeddingClient ?? EmbeddingService.globalEmbeddingModel
        : Promise.resolve(embeddingClient);
    this.expectedDimensions =
      typeof options?.expectedDimensions === 'number' &&
      Number.isInteger(options.expectedDimensions) &&
      options.expectedDimensions > 0
        ? options.expectedDimensions
        : undefined;
  }

  public setCacheEmbeddings(cache: boolean): this {
    this.cacheEmbeddings = cache;
    return this;
  }

  private getProviderOptions(
    model: EmbeddingModelV2<string>,
    dimensions: number,
  ): { openai: { dimensions: number } } | undefined {
    const descriptor = model as { modelId?: unknown; provider?: unknown };
    const provider =
      typeof descriptor.provider === 'string'
        ? descriptor.provider
        : typeof descriptor.modelId === 'string' && descriptor.modelId.startsWith('azure:')
          ? 'azure'
          : typeof descriptor.modelId === 'string' && descriptor.modelId.startsWith('openai:')
            ? 'openai'
            : undefined;

    if (
      provider === 'azure' ||
      provider === 'openai' ||
      (typeof provider === 'string' &&
        (provider.startsWith('azure.') || provider.startsWith('openai.')))
    ) {
      // Azure text embeddings use the OpenAI embedding provider implementation,
      // so the dimensions override must still flow through the `openai` key.
      return { openai: { dimensions } };
    }
    return undefined;
  }

  private async getEmbedding(query: string): Promise<number[]> {
    const model = await this.embeddingClient;
    const providerOptions =
      typeof this.expectedDimensions === 'number'
        ? this.getProviderOptions(model, this.expectedDimensions)
        : undefined;
    const ret = await embed({
      model,
      value: query,
      ...(providerOptions ? { providerOptions } : {}),
    });

    if (
      typeof this.expectedDimensions === 'number' &&
      ret.embedding.length !== this.expectedDimensions
    ) {
      throw new RangeError(
        `Expected embedding dimension ${this.expectedDimensions} but received ${ret.embedding.length}.`,
      );
    }

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
