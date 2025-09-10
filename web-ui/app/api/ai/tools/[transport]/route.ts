export const dynamic = 'force-dynamic';

import { log } from '@/lib/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { createMcpHandler } from 'mcp-handler';
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

// Lightweight safe serializers to avoid attempting to stringify circular or
// large runtime objects (transports, servers, sockets). Keep summaries
// small to avoid blocking the event loop or leaking internal state.
const safeSerialize = (v: unknown, maxLen = 200) => {
  try {
    if (v === null || v === undefined) return String(v);
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(v);
    if (Array.isArray(v)) return `[Array length=${v.length}]`;
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    // For objects, return keys only (first 10) to avoid deep traversal
    if (t === 'object') {
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).slice(0, 10);
      return `{${keys.join(',')}}`;
    }
    return String(v).slice(0, maxLen);
  } catch {
    return '[unserializable]';
  }
};

const safeServerDescriptor = (srv: unknown) => {
  try {
    const s = srv as unknown as Record<string, unknown>;
    const serverObj = s['server'] as unknown as
      | Record<string, unknown>
      | undefined;
    const transport = serverObj
      ? (serverObj['transport'] as unknown)
      : undefined;
    const transportType =
      transport &&
      typeof (transport as Record<string, unknown>)['type'] === 'string'
        ? ((transport as Record<string, unknown>)['type'] as string)
        : null;
    const transportUrl =
      transport &&
      typeof (transport as Record<string, unknown>)['url'] === 'string'
        ? ((transport as Record<string, unknown>)['url'] as string)
        : null;
    return {
      basePath:
        serverObj && typeof serverObj['basePath'] === 'string'
          ? (serverObj['basePath'] as string)
          : (s['basePath'] ?? null),
      transportType,
      transportUrl,
      // avoid including the full server object
    };
  } catch {
    return { basePath: null, transportType: null, transportUrl: null };
  }
};

const safeArgsSummary = (args: unknown[]) =>
  Array.isArray(args) ? args.slice(0, 5).map((a) => safeSerialize(a, 200)) : [];

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
                l.verbose({
                  message: `MCP Server ${dscr} aborted`,
                  data: {
                    abort: true,
                    abortReason: safeSerialize(
                      (error as Error)?.message ?? error,
                    ),
                    server: safeServerDescriptor(server),
                    args: safeArgsSummary(args),
                  },
                }),
              );
              // Best-effort cleanup on abort
              try {
                const s = server as unknown as
                  | Record<string, unknown>
                  | undefined;
                const serverObj = s?.['server'] as unknown as
                  | Record<string, unknown>
                  | undefined;
                const transport = serverObj
                  ? serverObj['transport']
                  : undefined;
                if (transport && typeof transport === 'object') {
                  try {
                    const t = transport as Record<string, unknown>;
                    if ('onerror' in t) {
                      try {
                        // clear runtime callback reference
                        (t as { onerror?: unknown }).onerror = undefined;
                      } catch {}
                    }
                  } catch {}
                  try {
                    const t = transport as Record<string, unknown>;
                    if (typeof t['close'] === 'function') {
                      (t['close'] as (...a: unknown[]) => unknown)();
                    } else if (typeof t['destroy'] === 'function') {
                      (t['destroy'] as (...a: unknown[]) => unknown)();
                    }
                  } catch {}
                }
                const srvClose =
                  serverObj && typeof serverObj['close'] === 'function'
                    ? (serverObj['close'] as (...a: unknown[]) => unknown)
                    : s && typeof s['close'] === 'function'
                      ? (s['close'] as (...a: unknown[]) => unknown)
                      : undefined;
                if (typeof srvClose === 'function') {
                  try {
                    srvClose.call(serverObj ?? s);
                  } catch {}
                }
              } catch {
                /* swallow cleanup errors */
              }
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
                server: safeServerDescriptor(server),
                args: safeArgsSummary(args),
              },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let ret: any = oldHandler
              ? oldHandler.call(server.server, le)
              : undefined;
            if (ret) {
              log((l) =>
                l.debug('Error was handled by existing subscriber', {
                  server: safeServerDescriptor(server),
                  args: safeArgsSummary(args),
                }),
              );
            } else {
              // Attempt best-effort cleanup of transport/server to avoid leaving
              // open connections that could hang the SSE stream.
              try {
                const s = server as unknown as
                  | Record<string, unknown>
                  | undefined;
                const serverObj = s?.['server'] as unknown as
                  | Record<string, unknown>
                  | undefined;
                const transport = serverObj
                  ? serverObj['transport']
                  : undefined;
                if (transport && typeof transport === 'object') {
                  try {
                    const t = transport as Record<string, unknown>;
                    if ('onerror' in t) {
                      try {
                        (t as { onerror?: unknown }).onerror = undefined;
                      } catch {}
                    }
                  } catch {}
                  try {
                    const t = transport as Record<string, unknown>;
                    if (typeof t['close'] === 'function') {
                      (t['close'] as (...a: unknown[]) => unknown)();
                    } else if (typeof t['destroy'] === 'function') {
                      (t['destroy'] as (...a: unknown[]) => unknown)();
                    }
                  } catch {}
                }
                const srvClose =
                  serverObj && typeof serverObj['close'] === 'function'
                    ? (serverObj['close'] as (...a: unknown[]) => unknown)
                    : s && typeof s['close'] === 'function'
                      ? (s['close'] as (...a: unknown[]) => unknown)
                      : undefined;
                if (typeof srvClose === 'function') {
                  try {
                    srvClose.call(serverObj ?? s);
                  } catch {}
                }
              } catch {
                /* swallow cleanup errors */
              }

              log((l) =>
                l.error('suppressing MCP Server error', {
                  server: safeServerDescriptor(server),
                  error: safeSerialize(error),
                  args: safeArgsSummary(args),
                }),
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
                error: safeSerialize(e),
                originalError: safeSerialize(error),
                server: safeServerDescriptor(server),
                args: safeArgsSummary(args),
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
        try {
          log((l) =>
            l.info(
              `MCP Event: ${safeSerialize(event)} - ${safeSerialize(args)}`,
              {
                event: safeSerialize(event),
                args: safeArgsSummary(args),
              },
            ),
          );
        } catch {
          // best-effort, don't allow logging to crash the server
        }
      },
    },
  ),
  { log: true },
);

export { handler as GET, handler as POST };
