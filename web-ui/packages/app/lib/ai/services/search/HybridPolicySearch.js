import { env } from '@compliance-theater/env';
import { HybridSearchClient } from './HybridSearchBase';
export class HybridPolicySearch extends HybridSearchClient {
    getSearchIndexName() {
        return env('AZURE_AISEARCH_POLICY_INDEX_NAME');
    }
    appendScopeFilter(payload, options) {
        const policyType = options?.scope;
        let filterValues = [];
        const validTypes = {
            'school-district': ['1'],
            state: ['2'],
            federal: ['3'],
        };
        if (Array.isArray(policyType)) {
            filterValues = policyType
                .flatMap((type) => validTypes[type])
                .filter(Boolean);
        }
        else if (typeof policyType === 'string') {
            const mapped = validTypes[policyType];
            if (mapped) {
                filterValues = [mapped];
            }
        }
        if (filterValues.length > 0) {
            const orFilters = filterValues
                .map((val) => `metadata/attributes/any(a: a/key eq 'document_type' and a/value eq '${val}')`)
                .join(' or ');
            payload.filter = orFilters;
        }
    }
}
export const hybridPolicySearchFactory = (options) => new HybridPolicySearch(options);
//# sourceMappingURL=HybridPolicySearch.js.map