import z from "zod";
export const MemoryAugmentationResultSchema = z.object({
    searchSemantics: z.array(z.object({
        term: z.string(),
        type: z.enum(['coreTerms', 'broadTerms', 'precisionTerms']),
        hits: z.number(),
    })).describe('Array of derived search semantics - at least three expected')
        .nonempty()
        .min(3),
    topMemories: z.array(z.object({
        id: z.string().describe('Unique identifier for the memory item'),
        content: z.string().describe('Content of the memory item'),
        hash: z.string().describe('Hash of the memory content for integrity verification'),
        createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/).describe('ISO-8601 Timestamp when the memory was created'),
        score: z.number().describe('Relevance score of the memory item'),
        integrity: z.string().describe('Integrity status of the memory item'),
    })).nonempty()
        .describe('Array of top memories retrieved - returned verbatim'),
    additionalMemoriesSummarized: z.array(z.object({
        searchTerm: z.string().describe('Search term used to find these or similar memories'),
        summary: z.string().describe('Summary of the additional memory cluster'),
    })).describe('Array of summarized additional memories')
        .optional(),
    truncated: z.boolean().describe('Indicates if results were truncated').default(false),
    traceability: z.object({
        influencing_memory_ids: z.array(z.string()).describe('IDs of memories that influenced the results'),
        confidence_estimate: z.object({
            number: z.number().describe('Confidence score for the memory retrieval'),
            reasons: z.array(z.string()).describe('Reasons supporting the confidence estimate'),
        }).describe('Confidence estimate details')
            .required(),
    }).describe('Traceability information for the memory retrieval')
        .required(),
    additionalSearchTerms: z.array(z.object({
        term: z.string().describe('Additional search term recommended for further retrieval'),
        reason: z.string().describe('Reason for recommending this additional search term'),
    })).describe('Array of additional search terms recommended for further retrieval')
        .optional(),
    comments: z.array(z.string()).describe('Additional comments regarding the memory retrieval process')
        .optional(),
}).describe('Result structure for memory augmentation retrieval');
//# sourceMappingURL=memory-augmentation-result.js.map