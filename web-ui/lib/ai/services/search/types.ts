export type HybridSearchOptions = {
  hitsPerPage?: number;
  page?: number;
  metadata?: Record<string, string>;
  count?: boolean;
  continuationToken?: string;
  exhaustive?: boolean;
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
