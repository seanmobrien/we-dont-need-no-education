/**
 * @fileoverview Module definition for HybridPolicySearch.
 */

import type { PolicySearchOptions } from '../../tools/types';
import { HybridSearchClient } from './HybridSearchBase';
import type { HybridSearchPayload } from './types';
import type { IEmbeddingService } from '../embedding';

declare module '@/lib/ai/services/search/HybridPolicySearch' {
  /**
   * Hybrid search client targeted at policy corpus (district / state / federal). Encapsulates
   * the mapping of high level scope types into concrete `document_type` attribute values
   * persisted inside the search index.
   */
  export class HybridPolicySearch extends HybridSearchClient<PolicySearchOptions> {
    /** Returns the policy index name (environment sourced). */
    protected getSearchIndexName(): string;

    /**
     * Appends policy scope filters to the outgoing payload by translating logical scope values
     * (e.g. 'state') into one or more underlying document type identifiers.
     *
     * The resulting filter is an OR chain across selected types, applied directly as the payload's
     * `filter` property (overwriting any previous value – acceptable because this subclass owns
     * its filter semantics).
     */
    protected appendScopeFilter(
      payload: HybridSearchPayload,
      options: PolicySearchOptions,
    ): void;
  }

  /**
   * Factory helper for creating a {@link HybridPolicySearch} with optional embedding service injection.
   * @param options Optional configuration with embeddingService override.
   */
  export const hybridPolicySearchFactory: (options?: {
    embeddingService?: IEmbeddingService;
  }) => HybridPolicySearch;
}
