export const dynamic = 'force-dynamic';

import {
  PolicySearchOptionsSchema,
  CaseFileSearchOptionsSchema,
  searchCaseFile,
  searchPolicyStore,
  AiSearchResultEnvelopeSchema,
  getMultipleCaseFileDocuments,
  getCaseFileDocumentIndex,
  toolCallbackResultSchemaFactory,
  toolCallbackArrayResultSchemaFactory,
  CaseFileAmendmentShape,
  AmendmentResultShape,
  toolCallbackResultFactory,
} from '@/lib/ai/tools';
import { amendCaseRecord } from '@/lib/ai/tools/amendCaseRecord';
import {
  caseFileRequestPropsShape,
  CaseFileResponseShape,
} from '@/lib/ai/tools/schemas/case-file-request-props-shape';
import { log } from '@/lib/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { isError, LoggedError } from '@/lib/react-util';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import {
  SEQUENTIAL_THINKING_TOOL,
  SequentialThinkingServer,
} from '@/lib/ai/tools/sequentialthinking/sequential-thinking-server';

let sequentialThinkingTool: SequentialThinkingServer | undefined = undefined;

const handler = wrapRouteRequest(
  createMcpHandler(
    (server) => {
      server.registerTool(
        'playPingPong',
        {
          description:
            "You say ping, I say pong, we go back and forth until someone misses the ball and scores a point.  Repeat that like 15 times and you've finished a match.  When a user prompt includes a ping, call this tool with your planned response.  " +
            "The tool will analyize the user's ping, your pong, and round history to determin if the user missed (eg you scored a point), you missed (eg the user scored a point), or a successful return (eg no-one scored, user must respond or you score a point).  " +
            'IMPORTANT if the user sends a ping and you do not respond send it to this tool with a pong, the user automatically gets a point.',
          inputSchema: {
            userPing: z
              .string()
              .describe(
                'The exact verbiage the user used to initiate the round - could be ping or pong of course, but more casual terms like "nudge" "buzz", "tap", or even "echo drop" are good as well.',
              ),
            assistantPong: z
              .string()
              .describe(
                'The exact verbiage you are using to respond to the ping.  It should be close to the vector of the ping (so you hit), but creative and surprising enough to put some spin on the ball so you can score.',
              ),
            roundHistory: z
              .array(z.array(z.string()))
              .describe(
                'An array of arrays containingt the pings and pongs that make up the current round.  This is used to keep track of the game state and assign outcome multipliers - for example, the same term used multiple times is more likely to result in a bonus multiplier when hit back, as the player is familiar with that shot.',
              ),
          },
          outputSchema: toolCallbackResultSchemaFactory(
            z.object({
              result: z
                .number()
                .describe(
                  'The outcome of the exchange; if below zero the user missed and you scored a point, if above zero you missed and the user scored a point, when zero both you and the user hit and youmove on to the next exchange',
                ),
            }),
          ),
          annotations: {
            title: 'Ping and Pong',
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        ({
          userPing,
          assistantPong,
          roundHistory,
        }: {
          userPing: string;
          assistantPong: string;
          roundHistory: string[][];
        }) => {
          log((l) =>
            l.info(
              'Ping Pong Tool called with userPing:' +
                userPing +
                ', assistantPong:' +
                assistantPong +
                ', roundHistory:' +
                JSON.stringify(roundHistory),
            ),
          );
          const rand = Math.random();
          let result: number;
          if (rand < 0.4) {
            result = 0;
          } else if (rand < 0.65) {
            result = -1;
          } else {
            result = 1;
          }
          return toolCallbackResultFactory({ result });
        },
      );
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
          description:
            'Uses hybrid search to find case files based on a query.',
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
      /*
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
        outputSchema: toolCallbackResultSchemaFactory(
          z.string().or(DocumentSchema),
        ),
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
    */
      server.registerTool(
        'getMultipleCaseFileDocuments',
        {
          description:
            'Retrieves and pre-processes the full contents of a batch of specific case file documents by ID.  This will include all metadata, as well as any linked case file documents, such as ' +
            'extracted key points, notes, calls to action, responsive actions, or other relevant information.  Useful for performing detailed ' +
            'analysis of the case file contents.  IMPORTANT: case ' +
            'files are large and require a lot of context space, so pre-processing via goals is recommended. Never attempt to load more than 5 unprocessed documents at a time.  ' +
            'With adequate summarization goals, more documents can be processed, but you should never request more than 100 documents at once.',
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
          outputSchema: toolCallbackArrayResultSchemaFactory(
            z.string().or(CaseFileResponseShape),
          ),
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
      server.registerTool(
        SEQUENTIAL_THINKING_TOOL.name,
        {
          description: SEQUENTIAL_THINKING_TOOL.description,
          inputSchema: {
            thought: z.string().describe('Your current thinking step'),
            nextThoughtNeeded: z
              .boolean()
              .describe('Whether another thought step is needed'),
            thoughtNumber: z.number().min(1).describe('Current thought number'),
            totalThoughts: z
              .number()
              .min(1)
              .describe('Estimated total thoughts needed'),
            isRevision: z
              .boolean()
              .optional()
              .describe('Whether this revises previous thinking'),
            revisesThought: z
              .number()
              .describe('Which thought is being reconsidered')
              .optional(),
            branchFromThought: z
              .number()
              .optional()
              .describe('Branching point thought number'),
            branchId: z.string().describe('Branch identifier').optional(),
            needsMoreThoughts: z
              .boolean()
              .describe('If more thoughts are needed')
              .optional(),
          },
        },
        (arg: object) => {
          try {
            if (!sequentialThinkingTool) {
              sequentialThinkingTool = new SequentialThinkingServer();
            }
            const ret = sequentialThinkingTool.processThought(arg);
            console.log(ret);
            return ret as any;
          } catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              source: 'sequentialThinking',
              log: true,
            });
            return {
              role: 'tool',
              content: `An error occurred while processing your request: ${isError(error) ? error.message : String(error)}. Please try again later.`,
            };
          }
        },
      );
      const makeErrorHandler = (
        oldHandler: ((error: Error) => void) | undefined,
        dscr: string,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error: unknown, ...args: any[]) => {
          try {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'mcp:tools',
              severity: 'error',
              data: {
                details: `MCP ${dscr}::onerror handler fired`,
                server,
                args,
              },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let ret: any = oldHandler
              ? oldHandler.call(server.server, le)
              : undefined;
            if (ret) {
              log((l) =>
                l.debug(
                  'Error was handled by existing subscriber',
                  server,
                  args,
                ),
              );
            } else {
              log((l) =>
                l.error('supressing MCP Server error', server, error, args),
              );
              ret = {
                role: 'assistant',
                content: `An error occurred while processing your request: ${error instanceof Error ? error.message : String(error)}. Please try again later.`,
              };
            }
            return ret;
          } catch (e) {
            log((l) =>
              l.error('Error in MCP Server error handler', {
                error: e,
                originalError: error,
                server,
                args,
              }),
            );
            return {
              role: 'assistant',
              content: `A critical error occurred while processing your request: ${e instanceof Error ? e.message : String(e)}. Please try again later.`,
            };
          }
        };
      };

      server.server.onerror = makeErrorHandler(server.server.onerror, 'server');
      /*



    server.server.onclose = (...args: any[]) => {
      log((l) =>
        l.info({
          message: 'MCP Server closed',
          data: {
            server,
            args,
          },
        }),
      );
      return oldClose?.call(...args);
    };
    server.server.oninitialized = (...args: any[]) => {
      log((l) =>
        l.info({
          message: 'MCP Server initialized',
          data: {
            server,
            args,
          },
        }),
      );
      return oldInit?.call(...args);
    };
    if (server.server.transport) {
      server.server.transport.onerror = makeErrorHandler(
        oldError,
        'transport',
      );
    }
    */
      /*

    server.server.onerror = makeErrorHandler(oldError, 'server');
    if (server.server.transport) {
      server.server.transport.onerror = makeErrorHandler(
        oldTransportError,
        'transport',
      );
  }
      */
    },
    {
      /*
    capabilities: {
      resources: {},
    },
    */
    },
    {
      redisUrl: process.env.REDIS_URL,
      basePath: '/api/ai/tools',
      maxDuration: 60 * 5 * 1000, // 15 minutes
      verboseLogs: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEvent: (event, ...args: any[]) => {
        log((l) => l.info('MCP Event:', event, ...args));
      },
    },
  ),
  { log: true },
);

export { handler as GET, handler as POST };
