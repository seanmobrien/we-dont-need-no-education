/**
 * @fileoverview Type definitions for the hybrid search service.
 */

declare module '@/lib/ai/services/search/types' {
  /**
   * Options for configuring a hybrid search operation.
   */
  export type HybridSearchOptions = {
    /**
     * Optional. The number of results to return per page.
     */
    hitsPerPage?: number;
    /**
     * Optional. The page number to retrieve (for pagination).
     */
    page?: number;
    /**
     * Optional. Additional metadata to include with the search, represented as key-value pairs.
     */
    metadata?: Record<string, string>;
    /**
     * Optional. If true, the total number of results will be returned in the response.
     * This is useful for understanding the scope of the search results.
     */
    count?: boolean;
    /**
     * Optional. A token for pagination, allowing retrieval of the next set of results.
     * This is useful for large result sets where you want to fetch results in chunks.
     * If set, hitsPerPage and page are ignored, and the search will return the next set of results based on the token.
     */
    continuationToken?: string;
    /***
     * When true, triggers an exhaustive k-nearest neighbor search across all vectors within the vector index.
     * Useful for scenarios where exact matches are critical, such as determining ground truth values.  Default is false.
     */
    exhaustive?: boolean;
  };

  /**
   * Shape of the search-result model.
   */
  export interface AiSearchResult {
    /**
     * Optional. Unique identifier for this search result.
     * This can be used to reference the result in subsequent operations.
     */
    id?: string;
    /**
     * The main content of the search result.
     * This is typically the text or data that matches the search query.
     */
    content: string;
    /**
     * Optional. Additional metadata describing the search result, represented as key-value pairs.
     * This can include information such as source, timestamp, or any other relevant details.
     */
    metadata?: Record<string, unknown>;
    /**
     * The relevance score of the search result.
     * This is typically a numeric value indicating how well the result matches the search query.
     */
    score: number;
  }

  /**
   * Represents the envelope for AI search results, including the list of results,
   * the total number of results available, and an optional continuation token for pagination.
   */
  export type AiSearchResultEnvelope = {
    /**
     * Optional unique identifier assigned by the search service for this specific search operation.
     */
    searchId?: string;
    /**
     * An array of AI search results.
     */
    results: AiSearchResult[];
    /**
     * The total number of results available for the search query.
     * This is useful for understanding the scope of the search results.
     * It is only returned when the count option is set to true in the search request.
     */
    total?: number;
    /**
     * A token for pagination, allowing retrieval of the next set of results.
     * This is useful for large result sets where you want to fetch results in chunks.
     */
    continuationToken?: string;
  };

  /**
   * Represents a block of vector search parameters.
   */
  export type VectorBlock = {
    /**
     * The numerical vector used for searching.
     */
    vector: number[];
    /**
     * The type of block, always set to 'vector'.
     */
    kind: 'vector';
    /**
     * The fields to be searched or indexed.
     */
    fields: string;
    /**
     * The number of nearest neighbors to retrieve.
     */
    k: number;
    /**
     * Whether to perform an exhaustive search.
     */
    exhaustive: boolean;
  };

  /**
   * Represents the payload for performing a hybrid search operation.
   */
  export type HybridSearchPayload = {
    /**
     * The search query string.
     */
    search: string;
    /**
     * Optional filter expression to refine search results.
     */
    filter?: string;
    /**
     * An array of vector-based search queries.
     */
    vectorQueries: VectorBlock[];
    /**
     * The maximum number of results to return.
     */
    top: number;
    /**
     * The type of query to execute.
     */
    queryType: string;
    /**
     * The semantic configuration to use for the search.
     */
    semanticConfiguration: string;
    /**
     * Comma-separated list of fields to include in the result.
     */
    select: string;
    /**
     * Optional flag to include the total count of results.
     */
    count?: boolean;
    /**
     * Optional number of results to skip (for pagination).
     */
    skip?: number;
  };
}
