import { env } from '@compliance-theater/env';
import { HybridSearchClient } from './HybridSearchBase';
export class HybridDocumentSearch extends HybridSearchClient {
    getSearchIndexName() {
        return env('AZURE_AISEARCH_DOCUMENTS_INDEX_NAME');
    }
    appendScopeFilter(payload, options) {
        const { scope: policyType, emailId, threadId, attachmentId, documentId, replyToDocumentId, relatedToDocumentId, } = options ?? {};
        let filterValues = [];
        const validTypes = {
            email: ['email'],
            attachment: ['attachment'],
            'key-point': ['key_point'],
            'call-to-action': ['cta'],
            'responsive-action': ['cta_response'],
            note: ['note'],
            'core-document': ['email', 'attachment'],
        };
        const filters = [];
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
            filters.push(`(${orFilters})`);
        }
        if (emailId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'email_id' and a/value eq '${emailId}')`);
        }
        if (threadId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'thread_id' and a/value eq '${threadId}')`);
        }
        if (attachmentId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'attachment_id' and a/value eq '${attachmentId}')`);
        }
        if (documentId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'id' and a/value eq '${documentId}')`);
        }
        if (replyToDocumentId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'parent_email_id' and a/value eq '${replyToDocumentId}')`);
        }
        if (relatedToDocumentId) {
            filters.push(`metadata/attributes/any(a: a/key eq 'relatedEmailId:${relatedToDocumentId}')`);
        }
        if (filters.length > 0) {
            payload.filter = filters.join(' and ');
        }
    }
}
export const hybridDocumentSearchFactory = (options) => new HybridDocumentSearch(options);
//# sourceMappingURL=HybridDocumentSearch.js.map