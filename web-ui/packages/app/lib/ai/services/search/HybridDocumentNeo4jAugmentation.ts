import { env } from '@compliance-theater/env';
import neo4j from 'neo4j-driver';
import { AiSearchResultEnvelope } from './types';
import { CaseFileSearchOptions } from '../../tools/types';

const asInteger = (value: unknown): number | undefined => {
  if (neo4j.isInt(value) && value.inSafeRange()) {
    return value.toNumber();
  }
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

const asFiniteNumber = (value: unknown): number | undefined => {
  if (neo4j.isInt(value) && value.inSafeRange()) {
    return value.toNumber();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const getNeo4jConfig = ():
  | {
      uri: string;
      username: string;
      password: string;
      database: string;
    }
  | undefined => {
  const uri = env('NEO4J_URI');
  const username = env('NEO4J_USERNAME');
  const password = env('NEO4J_PASSWORD');
  const database = env('NEO4J_DATABASE');
  if (!uri || !username || !password || !database) {
    return undefined;
  }
  return { uri, username, password, database };
};

const findScoreBoostsFromGraph = async (
  documentIds: number[],
  config: {
    uri: string;
    username: string;
    password: string;
    database: string;
  },
  options?: CaseFileSearchOptions,
): Promise<Map<number, number>> => {
  if (documentIds.length === 0) {
    return new Map();
  }

  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.username, config.password),
  );
  const session = driver.session({ database: config.database });

  try {
    const result = await session.executeRead((tx) =>
      tx.run(
        `
          UNWIND $documentIds AS documentId
          MATCH (d {document_id: documentId})
          OPTIONAL MATCH (d)-[:RELATED_TO]-(related {document_id: $relatedToDocumentId})
          RETURN
            d.document_id AS documentId,
            (
              CASE WHEN $threadId IS NOT NULL AND d.thread_id = $threadId THEN 0.2 ELSE 0 END +
              CASE WHEN $attachmentId IS NOT NULL AND d.attachment_id = $attachmentId THEN 0.2 ELSE 0 END +
              CASE WHEN $replyToDocumentId IS NOT NULL AND d.reply_to_document_id = $replyToDocumentId THEN 0.2 ELSE 0 END +
              CASE WHEN $relatedToDocumentId IS NOT NULL AND related IS NOT NULL THEN 0.25 ELSE 0 END
            ) AS scoreBoost
        `,
        {
          documentIds,
          threadId: asInteger(options?.threadId),
          attachmentId: asInteger(options?.attachmentId),
          replyToDocumentId: asInteger(options?.replyToDocumentId),
          relatedToDocumentId: asInteger(options?.relatedToDocumentId),
        },
      ),
    );

    return result.records.reduce((acc, record) => {
      const documentId = asInteger(record.get('documentId'));
      if (documentId == null) {
        return acc;
      }
      const scoreBoost = asFiniteNumber(record.get('scoreBoost')) ?? 0;
      acc.set(documentId, scoreBoost);
      return acc;
    }, new Map<number, number>());
  } finally {
    await session.close();
    await driver.close();
  }
};

export const augmentCaseFileResultsWithNeo4jSemantics = async (
  envelope: AiSearchResultEnvelope,
  options?: CaseFileSearchOptions,
): Promise<AiSearchResultEnvelope> => {
  if (!envelope.results.length) {
    return envelope;
  }

  const config = getNeo4jConfig();
  if (!config) {
    return envelope;
  }

  const documentIds = envelope.results
    .map((result) => asInteger(result.id))
    .filter((value): value is number => value != null);
  if (documentIds.length === 0) {
    return envelope;
  }

  const scoreBoosts = await findScoreBoostsFromGraph(documentIds, config, options);
  const boosted = envelope.results.map((result) => {
    const metadata = (result.metadata ?? {}) as Record<string, unknown>;
    const scoreBoost = scoreBoosts.get(asInteger(result.id) ?? -1) ?? 0;
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
