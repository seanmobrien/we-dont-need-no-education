import { z } from 'zod';
export const HybridSearchOptionsSchema = z.object({
    hitsPerPage: z
        .number()
        .min(1)
        .max(25)
        .optional()
        .describe('Results per page (1-25, default 15)'),
    page: z.number().min(1).optional().describe('Page number (default 1)'),
    metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for filtering; prefer explicit filters when available'),
    count: z
        .boolean()
        .optional()
        .describe('Return total result count (impacts performance, default false)'),
    continuationToken: z
        .string()
        .optional()
        .describe('Pagination token for retrieving next results; alternative to page/hitsPerPage'),
    exhaustive: z
        .boolean()
        .optional()
        .default(false)
        .describe('Use exhaustive k-NN search for exact matches (default false)'),
});
export const PolicySearchOptionsSchema = HybridSearchOptionsSchema.extend({
    scope: z
        .array(z.enum(['school-district', 'state', 'federal']))
        .optional()
        .describe('Policy scope: school-district, state, or federal'),
});
export const CaseFileSearchOptionsSchema = HybridSearchOptionsSchema.extend({
    scope: z
        .array(z.enum([
        'email',
        'attachment',
        'core-document',
        'key-point',
        'call-to-action',
        'responsive-action',
        'note',
    ]))
        .optional()
        .describe('Search scope: email, attachment, core-document, key-point, call-to-action, responsive-action, note'),
    emailId: z.string().optional().describe('Filter by email ID'),
    threadId: z.string().optional().describe('Filter by thread ID'),
    attachmentId: z.number().optional().describe('Filter by attachment ID'),
    documentId: z.number().optional().describe('Filter by document ID'),
    replyToDocumentId: z
        .number()
        .optional()
        .describe('Filter by direct reply to document ID'),
    relatedToDocumentId: z
        .number()
        .optional()
        .describe('Filter by related document ID'),
});
export const AiSearchResultSchema = z.object({
    id: z.string().optional(),
    content: z.string().describe('Main content of search result'),
    metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value metadata pairs'),
    score: z.number().describe('Relevance score after semantic re-ranking'),
});
export const AiSearchResultEnvelopeSchema = z.object({
    results: z.array(AiSearchResultSchema).describe('Array of search results'),
    total: z
        .number()
        .optional()
        .describe('Total results available (only when count=true)'),
    continuationToken: z
        .string()
        .optional()
        .describe('Token for next page of results'),
});
//# sourceMappingURL=searchObjects.js.map