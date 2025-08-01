import { env } from '@/lib/site-util/env';
import { PolicySearchOptions } from '../../tools/types';
import { PolicySearchScopeType } from '../../tools/unions';
import { HybridSearchClient } from './HybridSearchBase';
import { HybridSearchPayload } from './types';
import { IEmbeddingService } from '../embedding';

export class HybridPolicySearch extends HybridSearchClient<PolicySearchOptions> {
  protected getSearchIndexName(): string {
    return env('AZURE_AISEARCH_POLICY_INDEX_NAME');
  }

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

export const hybridPolicySearchFactory = (options?: {
  embeddingService?: IEmbeddingService;
}) => new HybridPolicySearch(options);
