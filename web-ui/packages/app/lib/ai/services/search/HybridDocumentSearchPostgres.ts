import { pgDbWithInit } from '@compliance-theater/database/driver';
import { getAccessibleUserIds } from '@compliance-theater/auth/lib/resources/case-file/index';
import { log } from '@compliance-theater/logger';
import { getEmbeddingModelNameForSize } from '@/lib/api/document-unit/embeddings';
import { CaseFileSearchOptions } from '../../tools/types';
import {
  AiSearchResultEnvelope,
  normalizeCaseFileSearchFilters,
} from './types';
import {
  HybridSearchClient,
  HybridSearchExecutionContext,
} from './HybridSearchBase';
import { IEmbeddingService } from '../embedding';

type PostgresSearchRow = {
  document_id: number;
  content: string | null;
  document_type: string | null;
  email_id: string | null;
  thread_id: number | null;
  attachment_id: number | null;
  reply_to_document_id: number | null;
  related_documents: number[] | null;
  lexical_score: number | null;
  vector_score: number | null;
  total_count: number | null;
  combined_score: number | null;
};

const normalizeEmbeddingVector = (vector: number[]): number[] => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new TypeError('Embedding vector must be a non-empty number array.');
  }
  const normalized = vector.map((value) => Number(value));
  if (!normalized.every((value) => Number.isFinite(value))) {
    throw new TypeError('Embedding vector must contain only finite numbers.');
  }
  return normalized;
};

const toVectorLiteral = (vector: number[]): string =>
  `[${normalizeEmbeddingVector(vector).join(',')}]`;

const parseOptionalInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const toResultEnvelope = (
  rows: PostgresSearchRow[],
  options: CaseFileSearchOptions,
  page: number,
  topK: number,
): AiSearchResultEnvelope => {
  const results = rows.map((row) => ({
    id: String(row.document_id),
    content: row.content ?? '',
    metadata: {
      document_type: row.document_type ?? undefined,
      email_id: row.email_id ?? undefined,
      thread_id: row.thread_id ?? undefined,
      attachment_id: row.attachment_id ?? undefined,
      reply_to_document_id: row.reply_to_document_id ?? undefined,
      related_documents: Array.isArray(row.related_documents)
        ? row.related_documents
        : [],
      retrieval_provider: 'postgresql',
      lexical_score: row.lexical_score ?? 0,
      vector_score: row.vector_score ?? 0,
      combined_score: row.combined_score ?? 0,
    },
    score: Number(
      row.combined_score ?? row.vector_score ?? row.lexical_score ?? 0,
    ),
  }));

  const total =
    options.count && rows.length > 0 ? Number(rows[0].total_count ?? 0) : undefined;
  const hasMore =
    typeof total === 'number' && total > 0 ? page * topK < total : false;

  return {
    results,
    ...(typeof total === 'number' ? { total } : {}),
    ...(hasMore ? { continuationToken: String(page + 1) } : {}),
  };
};

export class HybridDocumentSearchPostgres extends HybridSearchClient<CaseFileSearchOptions> {
  constructor(options?: { embeddingService?: IEmbeddingService }) {
    super(options);
  }

  protected async retrieveCandidates(
    context: HybridSearchExecutionContext<CaseFileSearchOptions>,
  ): Promise<AiSearchResultEnvelope> {
    const { naturalQuery, options, embeddingVector, topK, page } = context;
    const normalizedFilters = normalizeCaseFileSearchFilters(options);
    const {
      scopeDocumentTypes,
      emailId,
      threadId,
      attachmentId,
      documentId,
      replyToDocumentId,
      relatedToDocumentId,
    } = normalizedFilters;
    const sql = await pgDbWithInit();
    const queryText = String(naturalQuery ?? '').trim();
    const embeddingModel = getEmbeddingModelNameForSize('large');
    const vectorLiteral = toVectorLiteral(embeddingVector);
    const offset = Math.max(0, (page - 1) * topK);
    const threadIdFilter = parseOptionalInteger(threadId);
    const accessibleUserIds = ((await getAccessibleUserIds(undefined)) ?? [])
      .map((id) => Number(id))
      .filter((id): id is number => Number.isSafeInteger(id))
      .map((id) => Math.trunc(id));
    if (accessibleUserIds.length === 0) {
      const errorMessage =
        'No credentials available for case-file search authorization context.';
      log((l) => l.warn(errorMessage));
      throw new Error(errorMessage);
    }
    const whereAccessibleCaseFiles =
      sql`du.user_id IN ${sql(`(${accessibleUserIds.join(',')})`)}`;

    const rows = await sql<PostgresSearchRow>`
      WITH scored_candidates AS (
        SELECT
          d.document_id,
          d.content,
          d.document_type,
          d.email_id,
          d.thread_id,
          d.attachment_id,
          d.reply_to_document_id,
          d.related_documents,
          CASE
            WHEN ${queryText} = '' THEN 0::double precision
            ELSE ts_rank_cd(
              to_tsvector('english', COALESCE(d.content, '')),
              plainto_tsquery('english', ${queryText})
            )
          END AS lexical_score,
          (
            SELECT MAX(1 - (due.vector <=> ${vectorLiteral}::vector))
            FROM document_unit_embeddings due
            WHERE due.document_id = d.document_id
              AND due.embedding_model = ${embeddingModel}
              AND due.vector IS NOT NULL
          ) AS vector_score
        FROM "DocumentWithDetails" d
        JOIN document_units du ON du.unit_id = d.document_id
        WHERE (${scopeDocumentTypes.length} = 0 OR d.document_type = ANY(${scopeDocumentTypes}))
          AND ${whereAccessibleCaseFiles}
          AND (${emailId ?? null}::uuid IS NULL OR d.email_id = ${emailId ?? null}::uuid)
          AND (${threadIdFilter ?? null}::integer IS NULL OR d.thread_id = ${threadIdFilter ?? null}::integer)
          AND (${attachmentId ?? null}::integer IS NULL OR d.attachment_id = ${attachmentId ?? null}::integer)
          AND (${documentId ?? null}::integer IS NULL OR d.document_id = ${documentId ?? null}::integer)
          AND (${replyToDocumentId ?? null}::integer IS NULL OR d.reply_to_document_id = ${replyToDocumentId ?? null}::integer)
          AND (
            ${relatedToDocumentId ?? null}::integer IS NULL
            OR ${relatedToDocumentId ?? null}::integer = ANY(COALESCE(d.related_documents, ARRAY[]::integer[]))
          )
      )
      SELECT
        *,
        COUNT(*) OVER() AS total_count,
        (COALESCE(vector_score, 0) * 0.65 + COALESCE(lexical_score, 0) * 0.35) AS combined_score
      FROM scored_candidates
      WHERE (
        (${queryText} = '' AND vector_score IS NOT NULL)
        OR lexical_score > 0
        OR vector_score IS NOT NULL
      )
      ORDER BY combined_score DESC, document_id DESC
      LIMIT ${Math.max(1, topK)}
      OFFSET ${offset}
    `;

    return toResultEnvelope(rows, options, page, topK);
  }
}
