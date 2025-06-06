import { z } from 'zod';

export const HybridSearchOptionsSchema = z.object({
  hitsPerPage: z
    .number()
    .min(5)
    .max(100)
    .optional()
    .describe(
      'Number of results to return per page, between 5 and 100.  If not set, defaults to 15,',
    ),
  page: z
    .number()
    .min(1)
    .optional()
    .describe(
      'The page number to return, starting from 1.  If no value is set, the first page (1) is returned.',
    ),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'supports refining the search results by including arbitrary metadata values.  Prefer using filters with explicit keys when available.',
    ),
  count: z
    .boolean()
    .optional()
    .describe(
      'If true, the search will return the total number of results available for the query, in addition to the results themselves.  While this can be useful when looking ' +
        'to understand the scope of the search results, it will have an impact on performance and increase response times. Defaults to false.',
    ),
  continuationToken: z
    .string()
    .optional()
    .describe(
      'A token for pagination, allowing retrieval of the next set of results.  If set, the search will return the next set of results based on this token.  If not set, there are no additional results available beyond those returned in this response.' +
        'useful as an alternative to `hitsPerPage` and `page` for when the previous search timed out otherwise could not return a full resultset.',
    ),
  exhaustive: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, triggers an exhaustive k-nearest neighbor search across all vectors within the vector index.  Useful for scenarios where exact matches are critical, such as determining ground truth values.  Default is false.',
    ),
});

export const PolicySearchOptionsSchema = HybridSearchOptionsSchema.extend({
  scope: z
    .array(z.enum(['school-district', 'state', 'federal']))
    .optional()
    .describe(
      `An optional array of policy search scope types to filter the search results.  If not set, the search applies to all available scopes.  Available value are:
  - 'school-district': represents policies specific to a school district.
  - 'state': represents policies and laws defined at the state level.
  - 'federal': represents policies and laws defined at the federal level.
`,
    ),
});

export const CaseFileSearchOptionsSchema = HybridSearchOptionsSchema.extend({
  scope: z
    .array(
      z.enum([
        'email',
        'attachment',
        'core-document',
        'key-point',
        'call-to-action',
        'responsive-action',
        'note',
      ]),
    )
    .optional()
    .describe(
      `An optional array of case file search scope types to filter the search results.  If not set, the search applies to all available scopes.  Available values are: 
  - 'email': represents email messages associated with the case file.
  - 'attachment': represents file attachments related to the case file.
  - 'core-document': an alias for 'email' and 'attachment', used to search across both scopes.
  - 'key-point': represents key points extracted from the case file.
  - 'call-to-action': represents actionable items identified in the case file.
  - 'responsive-action': represents responsive actions identified in the case file.
  - 'note': represents notes extracted from the case file.
`,
    ),
  emailId: z.string().optional().describe('The email id to filter results by.'),
  threadId: z
    .string()
    .optional()
    .describe('The thread id to filter results by.'),
  attachmentId: z
    .number()
    .optional()
    .describe('The attachment id to filter results by.'),
  documentId: z
    .number()
    .optional()
    .describe('The document id to filter results by.'),
  replyToDocumentId: z
    .number()
    .optional()
    .describe(
      'Filter by documents that are direct replies to this document id.',
    ),
  relatedToDocumentId: z
    .number()
    .optional()
    .describe('Filter by documents that are related to this document id.'),
});

export const AiSearchResultSchema = z.object({
  id: z
    .string()
    .optional()
    .describe('Unique identifier for this search result.'),
  content: z.string().describe('The main content of the search result.'),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'available metadata describing the search result, represented as key-value pairs.',
    ),
  score: z
    .number()
    .describe(
      'The relevance score of the search result, indicating how well it matches the search query after semantic re-ranking occurred.',
    ),
});

export const AiSearchResultEnvelopeSchema = z.object({
  results: z
    .array(AiSearchResultSchema)
    .describe('An array of AI search result items.'),
  total: z
    .number()
    .optional()
    .describe(
      'The total number of results available for the search query.  This is only returned when the `count` option on the search options is set to true.',
    ),
  continuationToken: z
    .string()
    .optional()
    .describe(
      'A token for pagination, allowing retrieval of the next set of results.  This is useful for retrieving exhaustive results when the resultset is large.  ' +
        'If not set, there are no additional results available beyond those returned in this response.  ' +
        'If set, the client can use this token to retrieve the next page of results by passing it in the `continuationToken` parameter of the next search request.',
    ),
});
