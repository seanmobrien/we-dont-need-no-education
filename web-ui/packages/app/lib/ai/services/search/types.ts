export type HybridSearchOptions = {
  hitsPerPage?: number;
  page?: number;
  metadata?: Record<string, string>;
  count?: boolean;
  continuationToken?: string;
  exhaustive?: boolean;
};

export const CaseFileSearchRetrievalProviderValues = [
  'azure',
  'postgresql',
] as const;
export type CaseFileSearchRetrievalProvider =
  (typeof CaseFileSearchRetrievalProviderValues)[number];

export const CaseFileSearchGraphAugmentationProviderValues = [
  'none',
  'neo4j',
] as const;
export type CaseFileSearchGraphAugmentationProvider =
  (typeof CaseFileSearchGraphAugmentationProviderValues)[number];

export const normalizeCaseFileSearchRetrievalProvider = (
  value: unknown,
): CaseFileSearchRetrievalProvider =>
  value === 'postgresql' ? 'postgresql' : 'azure';

export const normalizeCaseFileSearchGraphAugmentationProvider = (
  value: unknown,
): CaseFileSearchGraphAugmentationProvider =>
  value === 'neo4j' ? 'neo4j' : 'none';

type CaseFileSearchScopeType =
  | 'email'
  | 'attachment'
  | 'key-point'
  | 'call-to-action'
  | 'responsive-action'
  | 'note'
  | 'core-document';

const CaseFileScopeDocumentTypeMap: Readonly<
  Record<CaseFileSearchScopeType, string[]>
> = {
  email: ['email'],
  attachment: ['attachment'],
  'key-point': ['key_point'],
  'call-to-action': ['cta'],
  'responsive-action': ['cta_response'],
  note: ['note'],
  'core-document': ['email', 'attachment'],
};

const normalizeOptionalNumber = (value: unknown): number | undefined => {
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

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

export type NormalizedCaseFileSearchFilters = {
  scopeDocumentTypes: string[];
  emailId?: string;
  threadId?: number;
  attachmentId?: number;
  documentId?: number;
  replyToDocumentId?: number;
  relatedToDocumentId?: number;
};

export const normalizeCaseFileSearchFilters = (options?: {
  scope?: CaseFileSearchScopeType[];
  emailId?: string;
  threadId?: string;
  attachmentId?: number;
  documentId?: number;
  replyToDocumentId?: number;
  relatedToDocumentId?: number;
}): NormalizedCaseFileSearchFilters => {
  const normalizedScopes = Array.isArray(options?.scope)
    ? options.scope
        .flatMap((scopeType) => CaseFileScopeDocumentTypeMap[scopeType] ?? [])
        .filter(Boolean)
    : [];

  return {
    scopeDocumentTypes: [...new Set(normalizedScopes)],
    emailId: normalizeOptionalString(options?.emailId),
    threadId: normalizeOptionalNumber(options?.threadId),
    attachmentId: normalizeOptionalNumber(options?.attachmentId),
    documentId: normalizeOptionalNumber(options?.documentId),
    replyToDocumentId: normalizeOptionalNumber(options?.replyToDocumentId),
    relatedToDocumentId: normalizeOptionalNumber(options?.relatedToDocumentId),
  };
};

export interface AiSearchResult {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
}

export type AiSearchResultEnvelope = {
  searchId?: string;
  results: AiSearchResult[];
  total?: number;
  continuationToken?: string;
};

export type VectorBlock = {
  vector: number[];
  kind: 'vector';
  fields: string;
  k: number;
  exhaustive: boolean;
};

export type HybridSearchPayload = {
  search: string;
  filter?: string;
  vectorQueries: VectorBlock[];
  top: number;
  queryType: string;
  semanticConfiguration: string;
  select: string;
  count?: boolean;
  skip?: number;
};
