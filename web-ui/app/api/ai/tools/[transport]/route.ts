export const dynamic = 'force-dynamic';

import { log } from '@/lib/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { createMcpHandler } from '@vercel/mcp-adapter';
// tool imports
import {
  searchCaseFile,
  searchCaseFileConfig,
} from '@/lib/ai/tools/searchCaseFile';
import {
  searchPolicyStore,
  searchPolicyStoreConfig,
} from '@/lib/ai/tools/searchPolicyStore';
import { 
  amendCaseRecord,
  amendCaseRecordConfig,
} from '@/lib/ai/tools/amendCaseRecord';
import {
  getMultipleCaseFileDocuments,
  getMultipleCaseFileDocumentsConfig,
} from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document';
import {
  getCaseFileDocumentIndex,
  getCaseFileDocumentIndexConfig,
} from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document-index';
import {
  SEQUENTIAL_THINKING_TOOL_NAME,
  sequentialThinkingCallback,
  sequentialThinkingCallbackConfig,
} from '@/lib/ai/tools/sequentialthinking/tool-callback';
import {
  pingPongToolCallback,
  pingPongToolConfig,
} from '@/lib/ai/tools/ping-pong';
import { isAbortError } from '@/lib/react-util';

const handler = wrapRouteRequest(
  createMcpHandler(
    (server) => {
      server.registerTool(
        'playPingPong',
        pingPongToolConfig,
        pingPongToolCallback,
      );
      server.registerTool(
        'searchPolicyStore',
        searchPolicyStoreConfig,
        searchPolicyStore,
      );
      server.registerTool(
        'searchCaseFile',
        searchCaseFileConfig,
        searchCaseFile,
      );
      server.registerTool(
        'getMultipleCaseFileDocuments',
        getMultipleCaseFileDocumentsConfig,
        getMultipleCaseFileDocuments,
      );
      server.registerTool(
        'getCaseFileDocumentIndex',
        getCaseFileDocumentIndexConfig,
        getCaseFileDocumentIndex,
      );
      server.registerTool(
        'amendCaseFileDocument',
        amendCaseRecordConfig,
        amendCaseRecord,
      );
      server.registerTool(
        SEQUENTIAL_THINKING_TOOL_NAME,
        sequentialThinkingCallbackConfig,
        sequentialThinkingCallback,
      );
      const makeErrorHandler = (
        oldHandler: ((error: Error) => void) | undefined,
        dscr: string,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (error: unknown, ...args: any[]) => {
          try {
            if (isAbortError(error)) {
              log((l) =>
                l.verbose(
                  {
                    message: `MCP Server ${dscr} aborted`,
                    data: {
                      abort_signal: error,
                    }
                  },
                ),
              );
              return {
                role: 'assistant',
                content: `MCP Server ${dscr} aborted`,
              };
            }


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
        log((l) => l.info(`MCP Event: ${event} -\n${JSON.stringify(args ?? [])}`, ...args));
      },
    },
  ),
  { log: true },
);

export { handler as GET, handler as POST };
