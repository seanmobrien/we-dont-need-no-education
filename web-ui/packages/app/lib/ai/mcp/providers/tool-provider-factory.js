import { log, LoggedError } from '@compliance-theater/logger';
import EventEmitter from '@protobufjs/eventemitter';
import { getResolvedPromises, } from '@/lib/react-util/utility-methods';
import { isAbortError, isError } from '@compliance-theater/logger';
import { withEmittingDispose } from '@/lib/nextjs-util/utils';
import { SingletonProvider } from '@compliance-theater/typescript';
import { InstrumentedSseTransport } from '../instrumented-sse-transport';
import { getToolCache } from '../cache';
import { getStreamingTransportFlag } from '../tool-flags';
import { toolProxyFactory } from '../tools';
import { clientToolProviderFactory } from './client-tool-provider';
const getHttpStreamEnabledFlag = async () => {
    const ret = await getStreamingTransportFlag();
    return ret.value;
};
const createTransport = async ({ onerror, userId, ...options }) => {
    const flagsHttpStreamEnabled = await getHttpStreamEnabledFlag();
    if (!flagsHttpStreamEnabled || options.sse === true) {
        const sseTransportConfig = {
            type: 'sse',
            url: options.url,
            headers: typeof options.headers === 'function'
                ? await options.headers()
                : (options.headers ?? {}),
            onerror,
            onclose: () => {
                try {
                    log((l) => l.warn('MCP Client SSE Connection Closed'));
                }
                catch (e) {
                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                        log: true,
                        source: 'MCPClientMessageHandler',
                        message: 'MCP Client SSE Close Error',
                        critical: true,
                    });
                }
            },
        };
        const deezHeaders = options.headers;
        const headerCb = () => {
            if (!deezHeaders) {
                return Promise.resolve({});
            }
            return typeof deezHeaders === 'function'
                ? deezHeaders()
                : Promise.resolve(deezHeaders);
        };
        return new InstrumentedSseTransport({
            onerror,
            ...sseTransportConfig,
            url: options.url ?? sseTransportConfig.url,
            headers: headerCb,
        });
    }
    const streamableHttpClientTransport = await import('@modelcontextprotocol/sdk/client/streamableHttp.js').then((mod) => mod.StreamableHTTPClientTransport);
    const headers = typeof options.headers === 'function'
        ? await options.headers()
        : (options.headers ?? {});
    return new streamableHttpClientTransport(new URL(options.url), {
        sessionId: userId ? `user-${userId}` : undefined,
        requestInit: {
            ...(headers ? { headers } : {}),
        },
    });
};
const createClient = async ({ onerror, userId, ...options }) => {
    const transport = await createTransport({
        onerror,
        userId,
        ...options,
    });
    const createMCPClient = await SingletonProvider.Instance.getOrCreateAsync('ai-sdk:createMCPClient', async () => {
        const { experimental_createMCPClient } = await import('@ai-sdk/mcp');
        return experimental_createMCPClient;
    });
    if (!createMCPClient) {
        throw new Error('Failed to create MCP client - verify ai-sdk/mcp is installed');
    }
    const mcpClient = await createMCPClient({
        transport,
        onUncaughtError: (error) => {
            try {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'MCPClientMessageHandler',
                    message: 'MCP Client SSE Uncaught Error',
                    critical: true,
                });
                return {
                    role: 'assistant',
                    content: [
                        {
                            type: 'text',
                            text: `An error occurred while processing your request: ${isError(error) ? error.message : String(error)}. Please try again later.`,
                        },
                    ],
                };
            }
            catch (e) {
                log((l) => l.error('MCP Client Uncaught Error Handler Error:', e));
                return {
                    role: 'assistant',
                    content: [
                        {
                            type: 'text',
                            text: `A critical error occurred while processing your request. Please try again later.`,
                        },
                    ],
                };
            }
        },
    });
    return mcpClient;
};
const wrapToolsetWithProxies = ({ mcpClient, tools, }) => {
    return Object.entries(tools).reduce((acc, [toolName, cachedTool]) => {
        acc[toolName] = toolProxyFactory({
            mcpClient,
            name: toolName,
            tool: cachedTool,
        });
        return acc;
    }, {});
};
export const toolProviderFactory = async ({ impersonation, ...options }) => {
    const onerror = ((error) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'MCPClientMessageHandler',
            relog: true,
        });
        return {
            role: 'assistant',
            content: `An error occurred while connecting to the MCP server: ${le.message}. Please try again later.`,
        };
    });
    try {
        const user = impersonation ? impersonation.getUserContext() : undefined;
        const userId = user ? String(user.hash ?? user.userId) : undefined;
        let mcpClient = await createClient({
            onerror,
            userId,
            ...options,
        });
        const toolCache = await getToolCache();
        const cachedTools = await toolCache.getCachedTools(options);
        let tools;
        if (!cachedTools) {
            const allTools = await mcpClient.tools();
            const filteredTools = options.allowWrite
                ? allTools
                : Object.entries(allTools).reduce((acc, [toolName, tool]) => {
                    if ((tool.description?.indexOf('Write access') ?? -1) === -1) {
                        acc[toolName] = tool;
                    }
                    return acc;
                }, {});
            await toolCache.setCachedTools(options, filteredTools);
            tools = filteredTools;
        }
        else {
            tools = wrapToolsetWithProxies({ mcpClient, tools: cachedTools });
        }
        let isConnected = true;
        return withEmittingDispose({
            get_mcpClient: () => mcpClient,
            get_isConnected: () => isConnected,
            get tools() {
                return tools;
            },
            [Symbol.dispose]: () => {
                mcpClient.close().catch((e) => {
                    if (isAbortError(e)) {
                        log((l) => l.verbose('toolProviderFactory.dispose: Ignoring AbortError'));
                    }
                    else {
                        LoggedError.isTurtlesAllTheWayDownBaby(e, {
                            log: true,
                            source: 'toolProviderFactory dispose',
                            severity: 'error',
                            data: {
                                message: 'Error disposing MCP client',
                                options,
                            },
                        });
                    }
                    return Promise.resolve();
                });
            },
            connect: async ({ allowWrite = false, }) => {
                const disconnect = isConnected
                    ? await mcpClient.close()
                    : Promise.resolve();
                if (allowWrite !== options.allowWrite) {
                    await toolCache.invalidateCache({ ...options, allowWrite });
                }
                const newTool = await toolProviderFactory({
                    ...options,
                    allowWrite,
                    impersonation,
                });
                mcpClient = newTool.get_mcpClient();
                await disconnect;
                isConnected = true;
                return newTool;
            },
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'MCPClientMessageHandler',
            message: `A critical failure occurred connecting to MCP server at [${options?.url}] - tools from this resource will not be available.`,
            url: options?.url,
        });
        return withEmittingDispose({
            get_mcpClient: () => undefined,
            get_isConnected: () => false,
            get tools() {
                return {};
            },
            connect: async ({ allowWrite = false, }) => {
                const newTool = await toolProviderFactory({
                    ...options,
                    allowWrite,
                    impersonation,
                });
                return newTool;
            },
        });
    }
};
const getResolvedProvidersWithCleanup = async (promises, timeoutMs = 60 * 1000) => {
    const categorized = await getResolvedPromises(promises, timeoutMs);
    categorized.pending.forEach((p) => {
        p.then((provider) => {
            if (provider && typeof provider[Symbol.dispose] === 'function') {
                try {
                    provider[Symbol.dispose]();
                }
                catch (e) {
                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                        log: true,
                        relog: true,
                        source: 'toolProviderFactory::getResolvedProvidersWithCleanup',
                        severity: 'error',
                    });
                }
            }
        }).catch((e) => {
            LoggedError.isTurtlesAllTheWayDownBaby(e, {
                log: true,
                relog: true,
                source: 'toolProviderFactory::getResolvedProvidersWithCleanup',
                severity: 'error',
                message: 'Error during provider cleanup after rejection',
            });
            return Promise.resolve();
        });
    });
    if (categorized.rejected.length > 0) {
        LoggedError.isTurtlesAllTheWayDownBaby(new AggregateError(categorized.rejected, 'Some MCP clients failed to connect or returned errors'), {
            log: true,
            source: 'getResolvedProvidersWithCleanup',
            severity: 'error',
            data: {
                numberOfFailures: categorized.rejected.length,
                timeoutMs,
            },
        });
    }
    log((l) => l.debug(`MCP toolProviderFactory resolved; ${categorized.fulfilled.length} connections established.`));
    return categorized.fulfilled;
};
export const isToolProvider = (check) => {
    return (typeof check === 'object' &&
        !!check &&
        'get_mcpClient' in check &&
        'get_isConnected' in check &&
        'tools' in check &&
        'connect' in check &&
        typeof check.get_mcpClient === 'function' &&
        typeof check.get_isConnected === 'function' &&
        typeof check.tools === 'function' &&
        typeof check.tools === 'object' &&
        Symbol.dispose in check &&
        typeof check[Symbol.dispose] === 'function' &&
        typeof check.connect === 'function');
};
export const toolProviderSetFactory = async (providers, timeoutMs = 180 * 1000) => {
    const resolvedProviders = await getResolvedProvidersWithCleanup(providers.map((options) => isToolProvider(options)
        ? Promise.resolve(options)
        : toolProviderFactory(options)), timeoutMs);
    const allProviders = [clientToolProviderFactory(), ...resolvedProviders];
    allProviders.forEach((provider) => {
        if (!provider.addDisposeListener) {
            log((l) => l.warn('weird non-dispose-emitting provider detected', {
                provider,
                data: { provider },
            }));
        }
        provider.addDisposeListener(() => {
            const index = allProviders.indexOf(provider);
            if (index > -1) {
                allProviders.splice(index, 1);
                if (allProviders.length === 0) {
                    dispose();
                }
            }
        });
    });
    const isHealthy = allProviders.length === providers.length + 1;
    const dispose = () => {
        [...allProviders].forEach((provider) => {
            provider.removeDisposeListener(dispose);
            provider[Symbol.dispose]();
        });
        allProviders.splice(0, allProviders.length);
        emitter.emit('disposed');
    };
    const emitter = new EventEmitter();
    return {
        providers: allProviders,
        get isHealthy() {
            return (isHealthy &&
                allProviders.every((p) => p.get_isConnected() && Object.keys(p.tools).length > 0));
        },
        get tools() {
            return allProviders.reduce((acc, provider) => {
                return { ...acc, ...provider.tools };
            }, {});
        },
        addDisposeListener: (listener) => {
            emitter.on('disposed', listener);
        },
        removeDisposeListener: (listener) => {
            emitter.off('disposed', listener);
        },
        dispose: () => {
            dispose();
            return Promise.resolve();
        },
        [Symbol.dispose]: () => {
            dispose();
        },
    };
};
//# sourceMappingURL=tool-provider-factory.js.map