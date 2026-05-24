/**
 * @jest-environment node
 */

const embedMock = jest.fn();

jest.mock('@compliance-theater/database/driver', () => ({
  pgDbWithInit: jest.fn(),
}));

jest.mock('@/lib/ai/aiModelFactory', () => ({
  createEmbeddingModel: jest.fn(() => 'large-embedding-model'),
  createEmbeddingSmallModel: jest.fn(() => 'small-embedding-model'),
}));

jest.mock('@/lib/ai/services/embedding', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    embed: (...args: unknown[]) => embedMock(...args),
  })),
}));

import { pgDbWithInit } from '@compliance-theater/database/driver';
import {
  createEmbeddingModel,
  createEmbeddingSmallModel,
} from '@/lib/ai/aiModelFactory';
import { EmbeddingService } from '@/lib/ai/services/embedding';
import { regenerateDocumentEmbeddings } from '@/lib/api/document-unit/embeddings';

type StoredRow = {
  document_id: number;
  embedding_model: string;
  index: number;
  vector: string | null;
  created_on: string | null;
};

const buildSqlMock = (content: string | null) => {
  const storedRows = new Map<number, StoredRow>();
  const sql = jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join(' ');

    if (query.includes('SELECT content') && query.includes('FROM document_units')) {
      return content == null ? [] : [{ content }];
    }

    if (query.includes('DELETE FROM document_unit_embeddings')) {
      const [unitId, embeddingModel] = values as [number, string];
      const deleted = Array.from(storedRows.values()).filter(
        (row) => row.document_id === unitId && row.embedding_model === embeddingModel,
      );
      for (const row of deleted) {
        storedRows.delete(row.index);
      }
      return deleted.map((row) => ({ index: row.index }));
    }

    if (query.includes('INSERT INTO document_unit_embeddings')) {
      const [unitId, embeddingModel, index, vectorLiteral] = values as [
        number,
        string,
        number,
        string,
      ];
      storedRows.set(index, {
        document_id: unitId,
        embedding_model: embeddingModel,
        index,
        vector: String(vectorLiteral),
        created_on: '2026-01-01T00:00:00.000Z',
      });
      return [];
    }

    if (query.includes('UPDATE document_units')) {
      return [];
    }

    if (query.includes('FROM document_unit_embeddings') && query.includes('AND "index" =')) {
      const [unitId, embeddingModel, index] = values as [number, string, number];
      const row = storedRows.get(index);
      if (!row || row.document_id !== unitId || row.embedding_model !== embeddingModel) {
        return [];
      }
      return [row];
    }

    if (query.includes('FROM document_unit_embeddings') && query.includes('ORDER BY "index" ASC')) {
      const [unitId, embeddingModel] = values as [number, string];
      return Array.from(storedRows.values())
        .filter((row) => row.document_id === unitId && row.embedding_model === embeddingModel)
        .sort((left, right) => left.index - right.index);
    }

    throw new Error(`Unexpected SQL query: ${query}`);
  });

  return { sql };
};

describe('regenerateDocumentEmbeddings', () => {
  beforeEach(() => {
    (pgDbWithInit as jest.Mock).mockReset();
    (createEmbeddingModel as jest.Mock).mockClear();
    (createEmbeddingSmallModel as jest.Mock).mockClear();
    (EmbeddingService as jest.Mock).mockClear();
    embedMock.mockReset();
    process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING = 'model-large';
    process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL = 'model-small';
    process.env.AZURE_AISEARCH_VECTOR_SIZE_SMALL = '1536';
    process.env.AZURE_AISEARCH_VECTOR_SIZE_LARGE = '3072';
  });

  it('stores regenerated embeddings with 1-based indices', async () => {
    const { sql } = buildSqlMock('abcdefghij');
    (pgDbWithInit as jest.Mock).mockResolvedValue(sql);
    embedMock
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.3, 0.4]);

    const regenerated = await regenerateDocumentEmbeddings({
      unitId: 42,
      size: 'small',
      chunkSize: 5,
    });

    expect(embedMock).toHaveBeenNthCalledWith(1, 'abcde');
    expect(embedMock).toHaveBeenNthCalledWith(2, 'fghij');
    expect(createEmbeddingSmallModel).toHaveBeenCalledTimes(1);
    expect(createEmbeddingModel).not.toHaveBeenCalled();
    expect(EmbeddingService).toHaveBeenCalledWith('small-embedding-model', {
      expectedDimensions: 1536,
    });
    expect(regenerated).toMatchObject({
      unitId: 42,
      size: 'small',
      embeddingModel: 'model-small',
      chunkSize: 5,
    });
    expect(regenerated?.embeddings.map((row) => row.index)).toEqual([1, 2]);
  });

  it('uses the large embedding model with 3072 expected dimensions', async () => {
    const { sql } = buildSqlMock('abcdefghij');
    (pgDbWithInit as jest.Mock).mockResolvedValue(sql);
    embedMock.mockResolvedValueOnce([0.1, 0.2]);

    const regenerated = await regenerateDocumentEmbeddings({
      unitId: 42,
      size: 'large',
      chunkSize: 10,
    });

    expect(createEmbeddingModel).toHaveBeenCalledTimes(1);
    expect(createEmbeddingSmallModel).not.toHaveBeenCalled();
    expect(EmbeddingService).toHaveBeenCalledWith('large-embedding-model', {
      expectedDimensions: 3072,
    });
    expect(regenerated).toMatchObject({
      unitId: 42,
      size: 'large',
      embeddingModel: 'model-large',
      chunkSize: 10,
    });
  });
});