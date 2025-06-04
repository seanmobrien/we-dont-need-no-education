import {
  PolicySearchOptionsSchema,
  CaseFileSearchOptionsSchema,
  searchCaseFile,
  searchPolicyStore,
  getCaseFileDocument,
  AiSearchResultEnvelopeSchema,
  getMultipleCaseFileDocuments,
  getCaseFileDocumentIndex,
  DocumentSchema,
  toolCallbackResultSchemaFactory,
  toolCallbackArrayResultSchemaFactory,
} from '@/lib/ai/tools';
import { log } from '@/lib/logger';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'searchPolicyStore',
      {
        description: 'Uses hybrid search to find policies based on a query.',
        inputSchema: {
          query: z
            .string()
            .describe('The search query term used to find policies.'),
          options: PolicySearchOptionsSchema.optional().describe(
            'Options used to influence the search results, such as scope and pagination.',
          ),
        },
        outputSchema: toolCallbackResultSchemaFactory(
          AiSearchResultEnvelopeSchema,
        ),
        annotations: {
          title: 'Search Policy Store',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      searchPolicyStore,
    );
    server.registerTool(
      'searchCaseFile',
      {
        description: 'Uses hybrid search to find case files based on a query.',
        inputSchema: {
          query: z
            .string()
            .describe('The search query term used to find case files.'),
          options: CaseFileSearchOptionsSchema.optional().describe(
            'Options used to influence the search results, such as scope and pagination.',
          ),
        },
        outputSchema: toolCallbackResultSchemaFactory(
          AiSearchResultEnvelopeSchema,
        ),
        annotations: {
          title: 'Search Case Files',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      searchCaseFile,
    );
    server.registerTool(
      'getCaseFileDocument',
      {
        description:
          "Retrieves the full contents of a specific case file document by it's ID.  This will include all metadata, as well as any linked case file documents, such as " +
          'extracted key points, notes, calls to action, responsive actions, or other relevant information.  Useful for performing detailed ' +
          'analysis of the case file contents.',
        inputSchema: {
          caseFileId: z
            .number()
            .or(
              z
                .string()
                .describe(
                  "While the numeric 'documentId' is the preferred access mechanism, some document types - such as emails, calls to action, responsive actions, and notes - can be requested by their uuid-based unique identifier as well",
                ),
            )
            .describe(
              'A numeric unique identifier identifying the case file document to retrieve.',
            ),
        },
        outputSchema: toolCallbackResultSchemaFactory(DocumentSchema),
        annotations: {
          title: 'Get Full Case File',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      getCaseFileDocument,
    );
    server.registerTool(
      'getMultipleCaseFileDocuments',
      {
        description:
          'Retrieves the full contents of a batch of specific case file document by ID.  This will include all metadata, as well as any linked case file documents, such as ' +
          'extracted key points, notes, calls to action, responsive actions, or other relevant information.  Useful for performing detailed ' +
          'analysis of the case file contents.  This can be used as an alternative to multiple calls to the `getCaseFileDocument` tool.',
        inputSchema: {
          caseFileIds: z
            .array(
              z
                .number()
                .or(
                  z
                    .string()
                    .describe(
                      "While the numeric 'documentId' is the preferred access mechanism, some document types - such as emails, calls to action, responsive actions, and notes - can be requested by their uuid-based unique identifier as well",
                    ),
                )
                .describe(
                  'A numeric unique identifier identifying the case file document to retrieve.',
                ),
            )
            .describe(
              'An array of unique identifiers identifying the case file documents to retrieve.',
            ),
        },
        outputSchema: toolCallbackArrayResultSchemaFactory(DocumentSchema),
        annotations: {
          title: 'Get Multiple Case Files',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      getMultipleCaseFileDocuments,
    );
    server.registerTool(
      'getCaseFileDocumentIndex',
      {
        description:
          'Retrieves an index containing summary information about all case file documents, optionally filtered by document type.  This ' +
          'index can be used as a quick and reliable way to obtain a listing of document types for performing iterative retrievals or analysis.',
        inputSchema: {
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
  - 'note': represents notes extracted from the case file.`,
            ),
        },
        outputSchema: toolCallbackArrayResultSchemaFactory(
          z.object({
            unitId: z
              .number()
              .describe(
                'The unique identifier of the case file document.  This value can be passed to the `getCaseFileDocument` or `getMultipleCaseFileDocuments` tools to retrieve the full contents of the document.',
              ),
            emailId: z
              .string()
              .nullable()
              .describe(
                'The unique identifier of the email associated with the case file document, if applicable.',
              ),
            attachmentId: z
              .string()
              .nullable()
              .describe(
                'The unique identifier of the document property associated with the case file document, if applicable.',
              ),
            documentType: z
              .string()
              .describe(
                'The type of the case file document, such as email, attachment, key point, call to action, responsive action, or note.',
              ),
            createdOn: z
              .date()
              .describe(
                'The date and time when the case file document was created.',
              ),
          }),
        ),
        annotations: {
          title: 'Retrieve Case File Document Index',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      getCaseFileDocumentIndex,
    );
  },
  {
    capabilities: {
      resources: {},
    },
  },
  {
    redisUrl: process.env.REDIS_URL,
    basePath: '/api/ai/tools',
    maxDuration: 300, // 5 minutes
    verboseLogs: true,
    onEvent: (event) => {
      log((l) => l.info('MCP Event:', event));
    },
  },
);

export { handler as GET, handler as POST };
