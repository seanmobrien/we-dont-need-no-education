import { AiSearchResultEnvelope } from './types';
import { CaseFileSearchOptions } from '../../tools/types';

const getMetadataValue = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): unknown => metadata?.[key];

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return undefined;
};

const hasRelatedDocument = (
  metadata: Record<string, unknown> | undefined,
  relatedDocumentId: number,
): boolean => {
  const value = getMetadataValue(metadata, 'related_documents');
  return Array.isArray(value) && value.some((entry) => asNumber(entry) === relatedDocumentId);
};

export const augmentCaseFileResultsWithNeo4jSemantics = (
  envelope: AiSearchResultEnvelope,
  options?: CaseFileSearchOptions,
): AiSearchResultEnvelope => {
  if (!envelope.results.length) {
    return envelope;
  }

  const boosted = envelope.results.map((result) => {
    const metadata = (result.metadata ?? {}) as Record<string, unknown>;
    let scoreBoost = 0;

    if (options?.threadId && String(getMetadataValue(metadata, 'thread_id')) === String(options.threadId)) {
      scoreBoost += 0.2;
    }
    if (
      options?.attachmentId != null &&
      asNumber(getMetadataValue(metadata, 'attachment_id')) ===
        asNumber(options.attachmentId)
    ) {
      scoreBoost += 0.2;
    }
    if (
      options?.replyToDocumentId != null &&
      asNumber(getMetadataValue(metadata, 'reply_to_document_id')) ===
        asNumber(options.replyToDocumentId)
    ) {
      scoreBoost += 0.2;
    }
    if (
      options?.relatedToDocumentId != null &&
      hasRelatedDocument(metadata, Number(options.relatedToDocumentId))
    ) {
      scoreBoost += 0.25;
    }

    return {
      ...result,
      score: result.score + scoreBoost,
      metadata: {
        ...metadata,
        graph_augmentation_provider: 'neo4j',
      },
    };
  });

  return {
    ...envelope,
    results: boosted.sort((a, b) => b.score - a.score),
  };
};
