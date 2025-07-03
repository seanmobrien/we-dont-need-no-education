import {
  PolicySearchOptionsSchema,
  CaseFileSearchOptionsSchema,
  searchCaseFile,
  searchPolicyStore,
  getCaseFileDocument,
  AiSearchResultEnvelopeSchema,
  getMultipleCaseFileDocuments,
  getCaseFileDocumentIndex,
  toolCallbackResultSchemaFactory,
  toolCallbackArrayResultSchemaFactory,
  CaseFileAmendmentShape,
  AmendmentResultShape,
} from '@/lib/ai/tools';
import { amendCaseRecord } from '@/lib/ai/tools/amendCaseRecord';
import { caseFileRequestPropsShape } from '@/lib/ai/tools/schemas/case-file-request-props-shape';
import { log } from '@/lib/logger';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';

const handler = createMcpHandler(
  (server) => {
    const oldCLose = server.server.onclose;
    const oldInit = server.server.oninitialized;
    const oldError = server.server.onerror;
    const oldTransportError = server.server.transport?.onerror;

    server.server.onclose = () => {
      log((l) => l.info('MCP Server closed'));
      return oldCLose?.call(server.server);
    };
    server.server.oninitialized = () => {
      log((l) => l.info('MCP Server initialized'));
      return oldInit?.call(server.server);
    };
    server.server.onerror = (c) => {
      log((l) => l.info('MCP Server error'));
      return oldError?.call(server.server, c);
    };
    if (server.server.transport) {
      server.server.transport.onerror = (c) => {
        log((l) => l.info('MCP Server transport error', c));
        return oldTransportError?.call(server.server.transport, c);
      };
    }
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
          'analysis of the case file contents.  IMPORTANT: case files are large and require a lot of context space, so pre-processing via goals is recommended.',
        inputSchema: {
          ...caseFileRequestPropsShape.shape,
        },
        /*
        outputSchema: toolCallbackResultSchemaFactory(
          z.string().or(DocumentSchema),
        ),
        */
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
          'analysis of the case file contents.  This can be used as an alternative to multiple calls to the `getCaseFileDocument` tool.  IMPORTANT: case ' +
          'files are large and require a lot of context space, so pre-processing via goals is recommended. Never attempt to load more than 5 unprocessed documents at a time.  ' +
          'With adequate pre-processing, more documents can be processed, but you should never request more than 100 documents at once.',
        inputSchema: {
          requests: z
            .array(caseFileRequestPropsShape)
            .describe('An array of case file requests.'),
          goals: z
            .array(z.string())
            .describe(
              'An array of goals identifying your task or describing what information should be extracted from the case files.  When set, each document will be pre-processed and relevant information returned, when left blank you will receive the full case files.  Case file documents are large and require a lot of context space, so pre-processing is recommended.',
            )
            .optional(),
          verbatim_fidelity: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe(
              'Controls how closely output should match source text. 100 = exact quotes with full context;  75 = exact excerpts with minimal context; 50 = summarized excerpts with some context; 1 = full summary, exact quotes not needed.  Set here to provide a default for all requests.',
            ),
        },
        /*S
        outputSchema: toolCallbackArrayResultSchemaFactory(
          z.string().or(DocumentSchema),
        ),
        */
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
              .number()
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
    server.registerTool(
      'amendCaseFileDocument',
      {
        description:
          'This tool supports updating values within existing case file documents.  It provides the following capabilities:\n' +
          '  - Adding a note to the file.\n' +
          '  - Associating existing call to action and call to action response files.\n' +
          '  - Adding a violation report to the case file.\n' +
          '  - Creating relationships between case file documents.\n' +
          '  - Updating select fields on extracted key points, notes, calls to action, responsive actions, or other relevant information.\n\n' +
          'Must be used with caution, as it can modify existing case file documents; Write access required.',
        inputSchema: {
          update: CaseFileAmendmentShape,
        },
        outputSchema:
          toolCallbackArrayResultSchemaFactory(AmendmentResultShape),
        annotations: {
          title: 'Amend Case File Document',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      amendCaseRecord,
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
    maxDuration: 60 * 15 * 1000, // 15 minutes
    verboseLogs: true,
    onEvent: (event) => {
      log((l) => l.info('MCP Event:', event));
    },
  },
);

export const GET = async (req: Request) => {
  console.log('MCP GET Request:', req.method, req.url);
  try {
    const ret = await handler(req);
    return ret;
  } catch (error) {
    log((l) => l.error('MCP GET Request Error:', error));
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const POST = async (req: Request) => {
  console.log('MCP POST Request:', req.method, req.url);
  try {
    const ret = await handler(req);
    return ret;
  } catch (error) {
    log((l) => l.error('MCP POST Request Error:', error));
    return new Response('Internal Server Error', { status: 500 });
  }
};
