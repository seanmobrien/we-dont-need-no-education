import { env } from '/lib/site-util/env';
import type { PolicySearchOptions } from '../../tools/types';
import type { PolicySearchScopeType } from '../../tools/unions';
import { HybridSearchClient } from './HybridSearchBase';
import type { HybridSearchPayload } from './types';
import type { IEmbeddingService } from '../embedding';

/**
 * Hybrid search client targeted at policy corpus (district / state / federal). Encapsulates
 * the mapping of high level scope types into concrete `document_type` attribute values
 * persisted inside the search index.
 */
export class HybridPolicySearch extends HybridSearchClient<PolicySearchOptions> {
  /** Returns the policy index name (environment sourced). */
  protected getSearchIndexName(): string {
    return env('AZURE_AISEARCH_POLICY_INDEX_NAME');
  }

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
  ): void {
    // Example: apply a filter based on a "scopeType" property in options.metadata
    // (You may need to adjust this logic based on your actual requirements)
    const policyType = options?.scope;
    let filterValues: string[] = [];

    // Update these cases to reflect only valid/allowed values for your application
    const validTypes: Record<PolicySearchScopeType, Array<string>> = {
      'school-district': ['1'],
      state: ['2'],
      federal: ['3'],
    };

    if (Array.isArray(policyType)) {
      filterValues = policyType
        .flatMap((type) => validTypes[type])
        .filter(Boolean);
    } else if (typeof policyType === 'string') {
      const mapped = validTypes[policyType];
      if (mapped) {
        filterValues = [mapped];
      }
    }

    if (filterValues.length > 0) {
      const orFilters = filterValues
        .map(
          (val) =>
            `metadata/attributes/any(a: a/key eq 'document_type' and a/value eq '${val}')`,
        )
        .join(' or ');
      payload.filter = orFilters;
    }
  }
}

/**
 * Factory helper for creating a {@link HybridPolicySearch} with optional embedding service injection.
 * @param options Optional configuration with embeddingService override.
 */
export const hybridPolicySearchFactory = (options?: {
  embeddingService?: IEmbeddingService;
}) => new HybridPolicySearch(options);
