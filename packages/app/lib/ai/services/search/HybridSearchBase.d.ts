/**
 * @fileoverview Module definition for HybridSearchBase.
 */

import { type IEmbeddingService } from '../embedding';
import type {
  HybridSearchOptions,
  AiSearchResultEnvelope,
  HybridSearchPayload,
} from './types';

declare module '@/lib/ai/services/search/HybridSearchBase' {
  /**
   * Abstract base class, parameterized by your scope‐type (e.g. policyTypeId).
   */
  export abstract class HybridSearchClient<
    TOptions extends HybridSearchOptions,
  > {
    /**
     * Underlying embedding service responsible for turning the natural query into
     * a numeric vector suitable for vector portion of the hybrid search.
     */
    protected readonly embeddingService: IEmbeddingService;

    /**
     * Creates a new HybridSearchClient.
     *
     * Accepts either:
     *  1. An {@link IEmbeddingService} implementation (used directly), or
     *  2. An options object with optional `embeddingService` property, or
     *  3. Nothing – in which case a new default {@link EmbeddingService} is provisioned.
     *
     * @param embeddingServiceOrOptions Optional embedding service instance or configuration wrapper.
     * @throws Error if the argument is neither an embedding service nor an options object.
     */
    constructor(
      embeddingServiceOrOptions?:
        | IEmbeddingService
        | {
            embeddingService?: IEmbeddingService;
          },
    );

    /**
     * Implemented by concrete subclasses to return the Azure AI Search index name
     * to target (e.g. documents vs policies). Should be stable and usually sourced
     * from configuration / environment variables.
     */
    protected abstract getSearchIndexName(): string;

    /**
     * Gives subclasses a chance to mutate the outgoing payload with filter logic
     * derived from user / domain specific options (e.g. restricting by document
     * type, policy jurisdiction, ownership, etc.).
     *
     * Implementations SHOULD be pure (no side effects beyond the provided payload) and
     * SHOULD NOT remove existing required properties.
     *
     * @param payload Mutable payload object that will be serialized for the search request.
     * @param options User supplied search options.
     */
    protected abstract appendScopeFilter(
      payload: HybridSearchPayload,
      options: TOptions,
    ): void;

    /**
     * Returns the Azure Search service API version in use. Centralized here to
     * simplify coordinated upgrades.
     */
    protected getSearchApiVersion(): string;

    /**
     * Builds the fully qualified search endpoint URL including index path and API version.
     */
    protected getServiceUrl(): string;

    /**
     * Executes a hybrid (semantic + vector) search against the configured index.
     *
     * Workflow:
     *  1. Generate / fetch an embedding for the natural language query.
     *  2. Construct a vector query block (k expanded to at least 50 for richer recall).
     *  3. Build the hybrid payload (semantic configuration, paging, selection, filters).
     *  4. POST to the Azure AI Search endpoint with API key authentication.
     *  5. Parse, normalize, and return results via {@link HybridSearchClient.parseResponse}.
     *
     * Error Handling:
     *  - Network / fetch errors are wrapped in a {@link LoggedError} with contextual metadata.
     *  - Service reported errors (embedded in JSON) throw early inside parseResponse.
     *
     * @param naturalQuery User provided freeform text query.
     * @param options Domain specific hybrid search options (paging, filters, counts, etc.).
     * @returns Envelope containing normalized results plus optional total/continuation data.
     */
    hybridSearch(
      naturalQuery: string,
      options?: TOptions,
    ): Promise<AiSearchResultEnvelope>;
  }
}
