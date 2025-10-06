/**
 * @jest-environment node
 */
/**
 * Tests for EmbeddingService
 */
import { EmbeddingService } from '/lib/ai/services/embedding/EmbeddingService';
import { createEmbeddingModel } from '/lib/ai/aiModelFactory';

jest.mock('/lib/ai/aiModelFactory', () => ({
  createEmbeddingModel: jest.fn(() => ({
    provider: 'test-provider',
    modelId: 'test-model',
  })),
}));

// Mock the external 'ai' embed call
jest.mock('ai', () => ({
  embed: jest.fn(async ({ value }: { value: string }) => ({
    embedding: Array.from({ length: 5 }, (_, i) => i + value.length),
  })),
}));

import { embed } from 'ai';

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
});
