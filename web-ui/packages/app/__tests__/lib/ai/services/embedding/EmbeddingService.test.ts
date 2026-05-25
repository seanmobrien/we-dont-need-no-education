/**
 * @jest-environment node
 */
/**
 * Tests for EmbeddingService
 */
import { EmbeddingService } from '../../../../../lib/ai/services/embedding/EmbeddingService';
import { createEmbeddingModel } from '../../../../../lib/ai/aiModelFactory';

jest.mock('../../../../../lib/ai/aiModelFactory', () => ({
  createEmbeddingModel: jest.fn(() =>
    Promise.resolve({
      provider: 'test-provider',
      modelId: 'test-model',
    }),
  ),
}));

// Mock the external 'ai' embed call
jest.mock('@compliance-theater/types/ai-sdk', () => ({
  embed: jest.fn(async ({ value }: { value: string }) => ({
    embedding: Array.from({ length: 5 }, (_, i) => i + value.length),
  })),
}));

import { embed } from '@compliance-theater/types/ai-sdk';

describe('EmbeddingService', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  it('creates a global embedding model lazily', async () => {
    const service1 = new EmbeddingService();
    await service1.embed('one');
    const service2 = new EmbeddingService();
    await service2.embed('two');
    // createEmbeddingModel should only have been called once because of static cache
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
    expect(a).toEqual(b); // values match because embed deterministic
    expect(embed).toHaveBeenCalledTimes(2); // but underlying calls executed twice
  });

  it('stores and returns distinct embeddings for different queries', async () => {
    const service = new EmbeddingService();
    const a = await service.embed('abc');
    const b = await service.embed('abcd');
    expect(a).not.toEqual(b);
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('supports injecting a custom model instance (bypasses global creation)', async () => {
    // Provide minimal structural match expected by embed() usage in service
    interface MinimalEmbeddingModel {
      provider: string;
      modelId: string;
    }
    const customModel: MinimalEmbeddingModel = {
      provider: 'alt',
      modelId: 'alt-model',
    };
    // @ts-expect-error - supplying structurally minimal model for test purposes
    const service = new EmbeddingService(customModel);
    await service.embed('x');
    // No global model needed for this instance
    expect(createEmbeddingModel).not.toHaveBeenCalled();
  });

  it('reuses cached value only when identical query string provided', async () => {
    const service = new EmbeddingService();
    await service.embed('Case');
    await service.embed('case');
    // Distinct keys due to case sensitivity
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('requests configured dimensions for azure embedding models', async () => {
    const customModel = {
      provider: 'azure.embeddings',
      modelId: 'embedding-small',
    };
    (embed as jest.Mock).mockResolvedValueOnce({
      embedding: Array.from({ length: 1536 }, (_, index) => index),
    });

    // @ts-expect-error - supplying structurally minimal model for test purposes
    const service = new EmbeddingService(customModel, {
      expectedDimensions: 1536,
    });
    const vector = await service.embed('dimensioned');

    expect(vector).toHaveLength(1536);
    expect(embed).toHaveBeenCalledWith({
      model: customModel,
      value: 'dimensioned',
      providerOptions: {
        openai: {
          dimensions: 1536,
        },
      },
    });
  });

  it('throws when embedding output dimensions do not match the expected size', async () => {
    const customModel = {
      provider: 'azure.embeddings',
      modelId: 'embedding-small',
    };
    (embed as jest.Mock).mockResolvedValueOnce({
      embedding: [1, 2, 3],
    });

    // @ts-expect-error - supplying structurally minimal model for test purposes
    const service = new EmbeddingService(customModel, {
      expectedDimensions: 1536,
    });

    await expect(service.embed('dimension-mismatch')).rejects.toThrow(
      'Expected embedding dimension 1536 but received 3.',
    );
  });

  it('rejects legacy providerOptions constructor usage', () => {
    const customModel = {
      provider: 'azure.embeddings',
      modelId: 'embedding-small',
    };

    expect(
      // @ts-expect-error - intentionally exercising legacy option shape rejection
      () => new EmbeddingService(customModel, { providerOptions: {} }),
    ).toThrow(
      'EmbeddingService options.providerOptions is no longer supported. Use options.expectedDimensions instead.',
    );
  });
});
