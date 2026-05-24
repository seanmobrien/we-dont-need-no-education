import { env } from '@compliance-theater/env';
import { pgDbWithInit } from '@compliance-theater/database/driver';
import {
  createEmbeddingModel,
  createEmbeddingSmallModel,
} from '@/lib/ai/aiModelFactory';
import { EmbeddingService } from '@/lib/ai/services/embedding';

export const EmbeddingSizeValues = ['large', 'small'] as const;

export type EmbeddingSize = (typeof EmbeddingSizeValues)[number];

export type DocumentUnitEmbeddingRecord = {
  documentId: number;
  embeddingModel: string;
  index: number;
  embedding: number[] | null;
  createdOn: string | null;
};

export type RegeneratedDocumentEmbeddings = {
  unitId: number;
  size: EmbeddingSize;
  embeddingModel: string;
  chunkSize: number;
  embeddings: DocumentUnitEmbeddingRecord[];
};

type DocumentUnitEmbeddingRow = {
  document_id: number;
  embedding_model: string;
  index: number;
  vector: string | null;
  created_on: string | null;
};

const LARGE_CHUNK_SIZE = 1000;
const SMALL_CHUNK_SIZE = 512;

export const isEmbeddingSize = (value: unknown): value is EmbeddingSize =>
  typeof value === 'string' &&
  EmbeddingSizeValues.includes(value as EmbeddingSize);

export const getDefaultEmbeddingChunkSize = (size: EmbeddingSize): number =>
  size === 'small' ? SMALL_CHUNK_SIZE : LARGE_CHUNK_SIZE;

export const getEmbeddingModelNameForSize = (size: EmbeddingSize): string =>
  size === 'small'
    ? env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL')
    : env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING');

const parseEmbeddingDimensions = (
  value: number | string,
  envVarName: 'AZURE_AISEARCH_VECTOR_SIZE_SMALL' | 'AZURE_AISEARCH_VECTOR_SIZE_LARGE',
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new RangeError(
      `${envVarName} must be configured as a positive integer embedding dimension.`,
    );
  }
  return parsed;
};

export const getEmbeddingDimensionsForSize = (size: EmbeddingSize): number =>
  size === 'small'
    ? parseEmbeddingDimensions(
        env('AZURE_AISEARCH_VECTOR_SIZE_SMALL'),
        'AZURE_AISEARCH_VECTOR_SIZE_SMALL',
      )
    : parseEmbeddingDimensions(
        env('AZURE_AISEARCH_VECTOR_SIZE_LARGE'),
        'AZURE_AISEARCH_VECTOR_SIZE_LARGE',
      );

const parseVector = (value: string | null): number[] | null => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const asNumbers = parsed.map((entry) => Number(entry));
    return asNumbers.every((entry) => Number.isFinite(entry))
      ? asNumbers
      : null;
  } catch {
    return null;
  }
};

const toRecord = (
  row: DocumentUnitEmbeddingRow,
): DocumentUnitEmbeddingRecord => ({
  documentId: Number(row.document_id),
  embeddingModel: String(row.embedding_model),
  index: Number(row.index),
  embedding: parseVector(row.vector),
  createdOn: row.created_on ? String(row.created_on) : null,
});

const ensureEmbeddingVector = (embedding: number[]): number[] => {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new TypeError('Embedding vector must be a non-empty number array.');
  }
  const normalized = embedding.map((value) => Number(value));
  if (!normalized.every((value) => Number.isFinite(value))) {
    throw new TypeError('Embedding vector must contain only finite numbers.');
  }
  return normalized;
};

const toVectorLiteral = (embedding: number[]): string => {
  const normalized = ensureEmbeddingVector(embedding);
  return `[${normalized.join(',')}]`;
};

export const getDocumentUnitContent = async (
  unitId: number,
): Promise<string | null> => {
  const sql = await pgDbWithInit();
  const rows = await sql<{ content: string | null }>`
    SELECT content
    FROM document_units
    WHERE unit_id = ${unitId}
    LIMIT 1
  `;
  if (!rows.length) {
    return null;
  }
  return rows[0].content ? String(rows[0].content) : '';
};

const setDocumentEmbeddingMetadata = async (
  unitId: number,
  embeddingModel: string,
): Promise<void> => {
  const sql = await pgDbWithInit();
  await sql`
    UPDATE document_units
    SET embedding_model = ${embeddingModel},
        embedded_on = CURRENT_TIMESTAMP
    WHERE unit_id = ${unitId}
  `;
};

export const getDocumentEmbeddingByIndex = async (
  unitId: number,
  embeddingModel: string,
  index: number,
): Promise<DocumentUnitEmbeddingRecord | null> => {
  const sql = await pgDbWithInit();
  const rows = await sql<DocumentUnitEmbeddingRow>`
    SELECT
      document_id,
      embedding_model,
      "index",
      vector::text AS vector,
      created_on::text AS created_on
    FROM document_unit_embeddings
    WHERE document_id = ${unitId}
      AND embedding_model = ${embeddingModel}
      AND "index" = ${index}
    LIMIT 1
  `;
  if (!rows.length) {
    return null;
  }
  return toRecord(rows[0]);
};

export const listDocumentEmbeddings = async (
  unitId: number,
  embeddingModel: string,
): Promise<DocumentUnitEmbeddingRecord[]> => {
  const sql = await pgDbWithInit();
  const rows = await sql<DocumentUnitEmbeddingRow>`
    SELECT
      document_id,
      embedding_model,
      "index",
      vector::text AS vector,
      created_on::text AS created_on
    FROM document_unit_embeddings
    WHERE document_id = ${unitId}
      AND embedding_model = ${embeddingModel}
    ORDER BY "index" ASC
  `;
  return rows.map(toRecord);
};

export const upsertDocumentEmbeddingByIndex = async ({
  unitId,
  embeddingModel,
  index,
  embedding,
}: {
  unitId: number;
  embeddingModel: string;
  index: number;
  embedding: number[];
}): Promise<DocumentUnitEmbeddingRecord> => {
  const sql = await pgDbWithInit();
  const vectorLiteral = toVectorLiteral(embedding);
  await sql`
    INSERT INTO document_unit_embeddings (
      document_id,
      embedding_model,
      "index",
      vector
    )
    VALUES (
      ${unitId},
      ${embeddingModel},
      ${index},
      ${vectorLiteral}::vector
    )
    ON CONFLICT (document_id, embedding_model, "index")
    DO UPDATE SET
      vector = EXCLUDED.vector,
      created_on = CURRENT_TIMESTAMP
  `;

  await setDocumentEmbeddingMetadata(unitId, embeddingModel);

  const updated = await getDocumentEmbeddingByIndex(unitId, embeddingModel, index);
  if (!updated) {
    throw new Error('Failed to read embedding row after upsert.');
  }
  return updated;
};

export const deleteDocumentEmbeddingByIndex = async (
  unitId: number,
  embeddingModel: string,
  index: number,
): Promise<number> => {
  const sql = await pgDbWithInit();
  const rows = await sql<{ index: number }>`
    DELETE FROM document_unit_embeddings
    WHERE document_id = ${unitId}
      AND embedding_model = ${embeddingModel}
      AND "index" = ${index}
    RETURNING "index"
  `;
  return rows.length;
};

export const deleteDocumentEmbeddings = async (
  unitId: number,
  embeddingModel: string,
): Promise<number> => {
  const sql = await pgDbWithInit();
  const rows = await sql<{ index: number }>`
    DELETE FROM document_unit_embeddings
    WHERE document_id = ${unitId}
      AND embedding_model = ${embeddingModel}
    RETURNING "index"
  `;
  return rows.length;
};

export const splitDocumentContentForEmbeddings = (
  content: string,
  chunkSize: number,
): string[] => {
  const normalizedChunkSize = Math.max(1, Math.floor(chunkSize));
  const text = String(content ?? '').trim();
  if (!text.length) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const maxEnd = Math.min(cursor + normalizedChunkSize, text.length);
    let splitEnd = maxEnd;

    if (maxEnd < text.length) {
      const preferredBreak = text.lastIndexOf(' ', maxEnd);
      if (preferredBreak > cursor + Math.floor(normalizedChunkSize * 0.5)) {
        splitEnd = preferredBreak;
      }
    }

    const chunk = text.slice(cursor, splitEnd).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    cursor = splitEnd <= cursor ? maxEnd : splitEnd;
  }

  return chunks;
};

export const regenerateDocumentEmbeddings = async ({
  unitId,
  size,
  chunkSize,
}: {
  unitId: number;
  size: EmbeddingSize;
  chunkSize?: number;
}): Promise<RegeneratedDocumentEmbeddings | null> => {
  const content = await getDocumentUnitContent(unitId);
  if (content === null) {
    return null;
  }

  const targetChunkSize =
    typeof chunkSize === 'number' && Number.isFinite(chunkSize) && chunkSize > 0
      ? Math.floor(chunkSize)
      : getDefaultEmbeddingChunkSize(size);
  const embeddingModel = getEmbeddingModelNameForSize(size);
  const expectedDimensions = getEmbeddingDimensionsForSize(size);
  const chunks = splitDocumentContentForEmbeddings(content, targetChunkSize);
  const embeddingService =
    size === 'small'
      ? new EmbeddingService(createEmbeddingSmallModel(), {
          expectedDimensions,
        })
      : new EmbeddingService(createEmbeddingModel(), {
          expectedDimensions,
        });

  await deleteDocumentEmbeddings(unitId, embeddingModel);

  for (let index = 0; index < chunks.length; index += 1) {
    const embedding = await embeddingService.embed(chunks[index]);
    await upsertDocumentEmbeddingByIndex({
      unitId,
      embeddingModel,
      index: index + 1,
      embedding,
    });
  }

  await setDocumentEmbeddingMetadata(unitId, embeddingModel);

  const embeddings = await listDocumentEmbeddings(unitId, embeddingModel);
  return {
    unitId,
    size,
    embeddingModel,
    chunkSize: targetChunkSize,
    embeddings,
  };
};
