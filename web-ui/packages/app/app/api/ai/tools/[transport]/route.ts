export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for SSE connections
import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { createMcpHandler } from 'mcp-handler';
import { KnownScopeIndex, KnownScopeValues } from '@/lib/auth/utilities';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server';
import { ApiRequestError } from '@compliance-theater/send-api-request';
import type { NextRequest } from 'next/server';
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
} from '@/lib/ai/tools/amend-case-record';
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
// Todo tool imports
import {
  createTodoCallback,
  createTodoConfig,
  getTodosCallback,
  getTodosConfig,
  updateTodoCallback,
  updateTodoConfig,
  toggleTodoCallback,
  toggleTodoConfig,
} from '@/lib/ai/tools/todo';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FirstParameter } from '@compliance-theater/typescript';
import { wellKnownFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import { env } from '@compliance-theater/env';
import {
  type BasicResourceRecord,
  resourceService,
} from '@/lib/auth/resources/resource-service';
import { authorizationService } from '@/lib/auth/resources/authorization-service';
import { getAccessToken } from '@/lib/auth/access-token';

type McpConfig = Exclude<Parameters<typeof createMcpHandler>[2], undefined>;
type OnEventHandler = Exclude<McpConfig['onEvent'], undefined>;
type McpEvent = FirstParameter<OnEventHandler>;

const makeErrorHandler = (server: McpServer, dscr: string) => {
  const oldHandler = server.server?.onerror;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (error: unknown, ...args: any[]) => {
    try {
      if (isAbortError(error)) {
        log((l) =>
          l.verbose({
            message: `MCP Server ${dscr} aborted`,
            data: {
              abort: true,
              abortReason: safeSerialize((error as Error)?.message ?? error),
              server: safeSerialize.serverDescriptor(server),
              args: safeSerialize.argsSummary(args),
            },
          })
        );
        // Best-effort cleanup on abort
        try {
          const s = server as unknown as Record<string, unknown> | undefined;
          const serverObj = s?.['server'] as unknown as
            | Record<string, unknown>
            | undefined;
          const transport = serverObj ? serverObj['transport'] : undefined;
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
          server: safeSerialize.serverDescriptor(server),
          args: safeSerialize.argsSummary(args),
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ret: any = oldHandler
        ? oldHandler.call(server.server, le)
        : undefined;
      if (ret) {
        log((l) =>
          l.debug('Error was handled by existing subscriber', {
            server: safeSerialize.serverDescriptor(server),
            args: safeSerialize.argsSummary(args),
          })
        );
      } else {
        // Attempt best-effort cleanup of transport/server to avoid leaving
        // open connections that could hang the SSE stream.
        try {
          const s = server as unknown as Record<string, unknown> | undefined;
          const serverObj = s?.['server'] as unknown as
            | Record<string, unknown>
            | undefined;
          const transport = serverObj ? serverObj['transport'] : undefined;
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
            server: safeSerialize.serverDescriptor(server),
            error: safeSerialize(error),
            args: safeSerialize.argsSummary(args),
          })
        );
        ret = {
          role: 'assistant',
          content: `An error occurred while processing your request: ${
            error instanceof Error ? error.message : String(error)
          }. Please try again later.`,
        };
      }
      return ret;
    } catch (e) {
      log((l) =>
        l.error('Error in MCP Server error handler', {
          error: safeSerialize(e),
          originalError: safeSerialize(error),
          server: safeSerialize.serverDescriptor(server),
          args: safeSerialize.argsSummary(args),
        })
      );
      return {
        role: 'assistant',
        content: `A critical error occurred while processing your request: ${
          e instanceof Error ? e.message : String(e)
        }. Please try again later.`,
      };
    }
  };
};

const onMcpEvent = (event: McpEvent, ...args: unknown[]) => {
  try {
    log((l) =>
      l.info(`MCP Event: ${safeSerialize(event)} - ${safeSerialize(args)}`, {
        event: safeSerialize(event),
        args: safeSerialize.argsSummary(args),
      })
    );
  } catch {
    // best-effort, don't allow logging to crash the server
  }
};

type CheckAccessProps = {
  req: NextRequest;
  readWrite?: boolean;
};

const checkAccess = async (props: NextRequest | CheckAccessProps) => {
  const TOOL_RESOURCE_NAME = env('AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME');
  const TOOL_RESOURCE_ID = env('AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID');

  const reqFromProps =
    'req' in props
      ? props
      : {
          req: props,
          readWrite: false,
        };
  const { req: requestFromProps, readWrite: readWriteAccess } = reqFromProps;

  const findResource = async () => {
    let toolResourceRecord: BasicResourceRecord | null = null;
    const rs = resourceService();
    try {
      toolResourceRecord = await rs.getAuthorizedResource(TOOL_RESOURCE_ID);
      if (!toolResourceRecord) {
        toolResourceRecord = await rs.findAuthorizedResource(
          TOOL_RESOURCE_NAME
        );
      }
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'checkAccess',
        include: { TOOL_RESOURCE_NAME, TOOL_RESOURCE_ID },
      });
    }
    return toolResourceRecord;
  };

  try {
    const toolResourceRecord = await findResource();
    if (!toolResourceRecord) {
      log((l) => l.warn('No tool resource found'));
      return false;
    }
    const bearerToken = await getAccessToken(requestFromProps);
    if (!bearerToken) {
      log((l) => l.warn('No bearer token found'));
      return false;
    }
    const checkResult = await authorizationService((svc) =>
      svc.checkResourceFileAccess({
        bearerToken,
        resourceId: toolResourceRecord._id!,
        scope: readWriteAccess === true ? 'mcp-tool:write' : 'mcp-tool:read',
      })
    );
    if (!checkResult || !checkResult.success) {
      // Access denied
      return false;
    }
    return true;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'checkAccess',
      include: { TOOL_RESOURCE_NAME, TOOL_RESOURCE_ID },
    });
    // Hard fail for exceptions
    return false;
  }
};

const handler = wrapRouteRequest(
  async (
    req: NextRequest,
    context: { params: Promise<{ transport: string }> }
  ) => {
    const { transport: transportFromProps } = await context.params;
    const transport = Array.isArray(transportFromProps)
      ? transportFromProps.join('/')
      : transportFromProps;
    const hasAccess = await checkAccess(req);
    if (!hasAccess) {
      log((l) =>
        l.warn(
          `Unauthorized access attempt (no token).  Transport: ${safeSerialize(
            transport
          )}`
        )
      );
      throw new ApiRequestError(
        'Unauthorized',
        unauthorizedServiceResponse({
          req,
          scopes: [
            KnownScopeValues[KnownScopeIndex.ToolRead],
            KnownScopeValues[KnownScopeIndex.ToolReadWrite],
          ],
        })
      );
    }

    log((l) => l.debug('Calling MCP Tool route.', { transport }));

    const maxDuration = (await wellKnownFlag('mcp_max_duration')).value;
    const traceLevel = (await wellKnownFlag('mcp_trace_level')).value;
    const verboseLogs = ['debug', 'verbose', 'silly'].includes(traceLevel);

    const mcpHandler = createMcpHandler(
      (server) => {
        log((l) =>
          l.info('=== MCP Handler: Server callback called ===', {
            serverInfo: safeSerialize.serverDescriptor(server),
          })
        );
        log((l) => l.info('=== Registering MCP tools ==='));
        server.registerTool(
          'playPingPong',
          pingPongToolConfig,
          pingPongToolCallback
        );
        server.registerTool(
          'searchPolicyStore',
          searchPolicyStoreConfig,
          searchPolicyStore
        );
        server.registerTool(
          'searchCaseFile',
          searchCaseFileConfig,
          searchCaseFile
        );
        server.registerTool(
          'getMultipleCaseFileDocuments',
          getMultipleCaseFileDocumentsConfig,
          getMultipleCaseFileDocuments
        );
        server.registerTool(
          'getCaseFileDocumentIndex',
          getCaseFileDocumentIndexConfig,
          getCaseFileDocumentIndex
        );
        server.registerTool(
          'amendCaseFileDocument',
          amendCaseRecordConfig,
          amendCaseRecord
        );
        server.registerTool(
          SEQUENTIAL_THINKING_TOOL_NAME,
          sequentialThinkingCallbackConfig,
          sequentialThinkingCallback
        );
        server.registerTool('createTodo', createTodoConfig, createTodoCallback);
        server.registerTool('getTodos', getTodosConfig, getTodosCallback);
        server.registerTool('updateTodo', updateTodoConfig, updateTodoCallback);
        server.registerTool('toggleTodo', toggleTodoConfig, toggleTodoCallback);
        server.server.onerror = makeErrorHandler(server, 'server');
      },
      {},
      {
        redisUrl: process.env.REDIS_URL,
        basePath: `/api/ai/tools/`,
        maxDuration,
        verboseLogs,
        onEvent: verboseLogs ? onMcpEvent : undefined,
      }
    );
    // Call mcpHandler directly without await - it manages the SSE stream itself
    return mcpHandler(req);
  },
  { log: true }
);

export { handler as GET, handler as POST };
