export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { createMcpHandler } from 'mcp-handler';
import { KnownScopeIndex, KnownScopeValues } from '@/lib/auth/utilities';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server';
import { ApiRequestError } from '@compliance-theater/send-api-request';
import { searchCaseFile, searchCaseFileConfig, } from '@/lib/ai/tools/searchCaseFile';
import { searchPolicyStore, searchPolicyStoreConfig, } from '@/lib/ai/tools/searchPolicyStore';
import { amendCaseRecord, amendCaseRecordConfig, } from '@/lib/ai/tools/amend-case-record';
import { getMultipleCaseFileDocuments, getMultipleCaseFileDocumentsConfig, } from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document';
import { getCaseFileDocumentIndex, getCaseFileDocumentIndexConfig, } from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document-index';
import { SEQUENTIAL_THINKING_TOOL_NAME, sequentialThinkingCallback, sequentialThinkingCallbackConfig, } from '@/lib/ai/tools/sequentialthinking/tool-callback';
import { pingPongToolCallback, pingPongToolConfig, } from '@/lib/ai/tools/ping-pong';
import { isAbortError } from '@/lib/react-util';
import { createTodoCallback, createTodoConfig, getTodosCallback, getTodosConfig, updateTodoCallback, updateTodoConfig, toggleTodoCallback, toggleTodoConfig, } from '@/lib/ai/tools/todo';
import { wellKnownFlag } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
import { env } from '@compliance-theater/env';
import { resourceService, } from '@/lib/auth/resources/resource-service';
import { authorizationService } from '@/lib/auth/resources/authorization-service';
import { getAccessToken } from '@/lib/auth/access-token';
const makeErrorHandler = (server, dscr) => {
    const oldHandler = server.server?.onerror;
    return (error, ...args) => {
        try {
            if (isAbortError(error)) {
                log((l) => l.verbose({
                    message: `MCP Server ${dscr} aborted`,
                    data: {
                        abort: true,
                        abortReason: safeSerialize(error?.message ?? error),
                        server: safeSerialize.serverDescriptor(server),
                        args: safeSerialize.argsSummary(args),
                    },
                }));
                try {
                    const s = server;
                    const serverObj = s?.['server'];
                    const transport = serverObj ? serverObj['transport'] : undefined;
                    if (transport && typeof transport === 'object') {
                        try {
                            const t = transport;
                            if ('onerror' in t) {
                                try {
                                    t.onerror = undefined;
                                }
                                catch { }
                            }
                        }
                        catch { }
                        try {
                            const t = transport;
                            if (typeof t['close'] === 'function') {
                                t['close']();
                            }
                            else if (typeof t['destroy'] === 'function') {
                                t['destroy']();
                            }
                        }
                        catch { }
                    }
                    const srvClose = serverObj && typeof serverObj['close'] === 'function'
                        ? serverObj['close']
                        : s && typeof s['close'] === 'function'
                            ? s['close']
                            : undefined;
                    if (typeof srvClose === 'function') {
                        try {
                            srvClose.call(serverObj ?? s);
                        }
                        catch { }
                    }
                }
                catch {
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
            let ret = oldHandler
                ? oldHandler.call(server.server, le)
                : undefined;
            if (ret) {
                log((l) => l.debug('Error was handled by existing subscriber', {
                    server: safeSerialize.serverDescriptor(server),
                    args: safeSerialize.argsSummary(args),
                }));
            }
            else {
                try {
                    const s = server;
                    const serverObj = s?.['server'];
                    const transport = serverObj ? serverObj['transport'] : undefined;
                    if (transport && typeof transport === 'object') {
                        try {
                            const t = transport;
                            if ('onerror' in t) {
                                try {
                                    t.onerror = undefined;
                                }
                                catch { }
                            }
                        }
                        catch { }
                        try {
                            const t = transport;
                            if (typeof t['close'] === 'function') {
                                t['close']();
                            }
                            else if (typeof t['destroy'] === 'function') {
                                t['destroy']();
                            }
                        }
                        catch { }
                    }
                    const srvClose = serverObj && typeof serverObj['close'] === 'function'
                        ? serverObj['close']
                        : s && typeof s['close'] === 'function'
                            ? s['close']
                            : undefined;
                    if (typeof srvClose === 'function') {
                        try {
                            srvClose.call(serverObj ?? s);
                        }
                        catch { }
                    }
                }
                catch {
                }
                log((l) => l.error('suppressing MCP Server error', {
                    server: safeSerialize.serverDescriptor(server),
                    error: safeSerialize(error),
                    args: safeSerialize.argsSummary(args),
                }));
                ret = {
                    role: 'assistant',
                    content: `An error occurred while processing your request: ${error instanceof Error ? error.message : String(error)}. Please try again later.`,
                };
            }
            return ret;
        }
        catch (e) {
            log((l) => l.error('Error in MCP Server error handler', {
                error: safeSerialize(e),
                originalError: safeSerialize(error),
                server: safeSerialize.serverDescriptor(server),
                args: safeSerialize.argsSummary(args),
            }));
            return {
                role: 'assistant',
                content: `A critical error occurred while processing your request: ${e instanceof Error ? e.message : String(e)}. Please try again later.`,
            };
        }
    };
};
const onMcpEvent = (event, ...args) => {
    try {
        log((l) => l.info(`MCP Event: ${safeSerialize(event)} - ${safeSerialize(args)}`, {
            event: safeSerialize(event),
            args: safeSerialize.argsSummary(args),
        }));
    }
    catch {
    }
};
const checkAccess = async (props) => {
    const TOOL_RESOURCE_NAME = env('AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME');
    const TOOL_RESOURCE_ID = env('AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID');
    const reqFromProps = 'req' in props
        ? props
        : {
            req: props,
            readWrite: false,
        };
    const { req: requestFromProps, readWrite: readWriteAccess } = reqFromProps;
    const findResource = async () => {
        let toolResourceRecord = null;
        const rs = resourceService();
        try {
            toolResourceRecord = await rs.getAuthorizedResource(TOOL_RESOURCE_ID);
            if (!toolResourceRecord) {
                toolResourceRecord = await rs.findAuthorizedResource(TOOL_RESOURCE_NAME);
            }
        }
        catch (error) {
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
        const checkResult = await authorizationService((svc) => svc.checkResourceFileAccess({
            bearerToken,
            resourceId: toolResourceRecord._id,
            scope: readWriteAccess === true ? 'mcp-tool:write' : 'mcp-tool:read',
        }));
        if (!checkResult || !checkResult.success) {
            return false;
        }
        return true;
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'checkAccess',
            include: { TOOL_RESOURCE_NAME, TOOL_RESOURCE_ID },
        });
        return false;
    }
};
const handler = wrapRouteRequest(async (req, context) => {
    const { transport: transportFromProps } = await context.params;
    const transport = Array.isArray(transportFromProps)
        ? transportFromProps.join('/')
        : transportFromProps;
    const hasAccess = await checkAccess(req);
    if (!hasAccess) {
        log((l) => l.warn(`Unauthorized access attempt (no token).  Transport: ${safeSerialize(transport)}`));
        throw new ApiRequestError('Unauthorized', unauthorizedServiceResponse({
            req,
            scopes: [
                KnownScopeValues[KnownScopeIndex.ToolRead],
                KnownScopeValues[KnownScopeIndex.ToolReadWrite],
            ],
        }));
    }
    log((l) => l.debug('Calling MCP Tool route.', { transport }));
    const maxDuration = (await wellKnownFlag('mcp_max_duration')).value;
    const traceLevel = (await wellKnownFlag('mcp_trace_level')).value;
    const verboseLogs = ['debug', 'verbose', 'silly'].includes(traceLevel);
    const mcpHandler = createMcpHandler((server) => {
        log((l) => l.info('=== MCP Handler: Server callback called ===', {
            serverInfo: safeSerialize.serverDescriptor(server),
        }));
        log((l) => l.info('=== Registering MCP tools ==='));
        server.registerTool('playPingPong', pingPongToolConfig, pingPongToolCallback);
        server.registerTool('searchPolicyStore', searchPolicyStoreConfig, searchPolicyStore);
        server.registerTool('searchCaseFile', searchCaseFileConfig, searchCaseFile);
        server.registerTool('getMultipleCaseFileDocuments', getMultipleCaseFileDocumentsConfig, getMultipleCaseFileDocuments);
        server.registerTool('getCaseFileDocumentIndex', getCaseFileDocumentIndexConfig, getCaseFileDocumentIndex);
        server.registerTool('amendCaseFileDocument', amendCaseRecordConfig, amendCaseRecord);
        server.registerTool(SEQUENTIAL_THINKING_TOOL_NAME, sequentialThinkingCallbackConfig, sequentialThinkingCallback);
        server.registerTool('createTodo', createTodoConfig, createTodoCallback);
        server.registerTool('getTodos', getTodosConfig, getTodosCallback);
        server.registerTool('updateTodo', updateTodoConfig, updateTodoCallback);
        server.registerTool('toggleTodo', toggleTodoConfig, toggleTodoCallback);
        server.server.onerror = makeErrorHandler(server, 'server');
    }, {}, {
        redisUrl: process.env.REDIS_URL,
        basePath: `/api/ai/tools/`,
        maxDuration,
        verboseLogs,
        onEvent: verboseLogs ? onMcpEvent : undefined,
    });
    return mcpHandler(req);
}, { log: true });
export { handler as GET, handler as POST };
//# sourceMappingURL=route.js.map