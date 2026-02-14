export const dynamic = 'force-dynamic';
import { streamText, convertToModelMessages, stepCountIs, hasToolCall, } from 'ai';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { isAiLanguageModelType } from '@/lib/ai/core/guards';
import { splitIds, generateChatId } from '@/lib/ai/core/chat-ids';
import { getRetryErrorInfo } from '@/lib/ai/chat/error-helpers';
import { getUserToolProviderCache } from '@/lib/ai/mcp/cache';
import { wrapChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import { env } from '@compliance-theater/env';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { log, LoggedError } from '@compliance-theater/logger';
import { isTruthy } from '@/lib/react-util/utility-methods';
import { unauthorizedServiceResponse, wrapRouteRequest, } from '@/lib/nextjs-util/server';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { wrapMemoryMiddleware } from '@/lib/ai/middleware/memory-middleware';
import { streamingMessageResponse } from '@/lib/ai/chat/streamed-result';
const safeDisposeToolProviders = async (toolProviders) => {
    if (!toolProviders)
        return;
    toolProviders[Symbol.dispose]();
};
const toolProviderFactory = async ({ req, chatHistoryId, memoryDisabled = false, writeEnabled = false, user, sessionId, }) => {
    const flag = await getFeatureFlag('mcp_cache_tools', user?.id);
    if (isTruthy(flag)) {
        const toolProviderCache = await getUserToolProviderCache({
            maxEntriesPerUser: 5,
            maxTotalEntries: 200,
            ttl: 45 * 60 * 1000,
            cleanupInterval: 10 * 60 * 1000,
        });
        return toolProviderCache.getOrCreate(user.id, sessionId, {
            writeEnabled,
            memoryDisabled,
        }, () => setupDefaultTools({
            writeEnabled,
            user,
            req,
            chatHistoryId,
            memoryEnabled: !memoryDisabled,
        }));
    }
    return setupDefaultTools({
        user,
        writeEnabled,
        req,
        chatHistoryId,
        memoryEnabled: !memoryDisabled,
    });
};
const extractRequestParams = async (req) => {
    const { messages, id } = (await req.json()) ?? {};
    const modelFromRequest = req.headers.get('x-active-model') ?? env('NEXT_PUBLIC_DEFAULT_AI_MODEL');
    const defaultModel = env('NEXT_PUBLIC_DEFAULT_AI_MODEL');
    const model = isAiLanguageModelType(modelFromRequest)
        ? modelFromRequest
        : isAiLanguageModelType(defaultModel)
            ? defaultModel
            : 'hifi';
    const writeEnabled = req.headers.get('x-write-enabled') === 'true';
    const memoryDisabled = req.headers.get('x-memory-disabled') === 'true';
    const activePage = req.headers.get('x-active-page') === 'true';
    const [threadId] = splitIds(id ?? undefined);
    return {
        activePage,
        messages,
        id,
        threadId,
        modelFromRequest,
        writeEnabled,
        memoryDisabled,
        model,
    };
};
export const POST = (req) => {
    let toolProviders = undefined;
    return wrapRouteRequest(async (req) => {
        const session = await auth();
        if (!session ||
            !session.user ||
            process.env.NEXT_PHASE === 'phase-production-build') {
            return unauthorizedServiceResponse({ req, scopes: ['mcp-tools:read'] });
        }
        const { messages, id, threadId, writeEnabled, memoryDisabled, model, } = await extractRequestParams(req);
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }
        const chatHistoryId = id ?? `${threadId}:${generateChatId().id}`;
        try {
            toolProviders ??= await toolProviderFactory({
                req,
                chatHistoryId,
                memoryDisabled,
                writeEnabled,
                user: session?.user,
                sessionId: chatHistoryId,
            });
            const chatHistoryContext = createUserChatHistoryContext({
                userId: session?.user?.id || 'anonymous',
                requestId: chatHistoryId,
                chatId: threadId,
                model,
            });
            const modelWithHistory = wrapMemoryMiddleware({
                model: wrapChatHistoryMiddleware({
                    model: await aiModelFactory(model),
                    chatHistoryContext,
                }),
                toolProviders,
                mem0Enabled: !memoryDisabled,
                directAccess: true,
                userId: session?.user?.id || 'anonymous',
                chatId: threadId,
                messageId: chatHistoryId,
            });
            let isRateLimitError = false;
            let retryAfter = 0;
            const result = streamText({
                model: modelWithHistory,
                messages: convertToModelMessages(messages),
                _internal: {
                    generateId: () => `${threadId ?? 'not-set'}:${generateChatId().id}`,
                },
                experimental_telemetry: {
                    isEnabled: true,
                    functionId: 'chat-request',
                    metadata: {
                        userId: session?.user?.id || 'anonymous',
                        requestId: chatHistoryId,
                        chatId: threadId || 'no-thread',
                    },
                },
                providerOptions: {
                    openai: {
                        store: true,
                        user: session.user ? `user-${session.user.id}` : `user-anon`,
                    },
                },
                stopWhen: [
                    stepCountIs(150),
                    hasToolCall('askConfirmation'),
                    ({ steps }) => steps.every((step) => step.finishReason !== 'tool-calls'),
                ],
                onError: async (error) => {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'route:ai:chat onError',
                        message: 'Error during chat processing',
                        critical: true,
                        data: {
                            userId: session?.user?.id,
                            model,
                            chatHistoryId,
                        },
                    });
                    chatHistoryContext.error = error;
                    try {
                        const rateLimitErrorInfo = getRetryErrorInfo(error);
                        if (rateLimitErrorInfo &&
                            rateLimitErrorInfo.isError === true &&
                            rateLimitErrorInfo.isRetry === true) {
                            isRateLimitError = true;
                            retryAfter = rateLimitErrorInfo.retryAfter ?? 60;
                        }
                        if (isRateLimitError) {
                            const retryAt = new Date(Date.now() + retryAfter * 1000);
                            log((l) => l.warn('Rate limit exceeded - retry request later', {
                                model,
                                retryAt,
                                chatHistoryId,
                                userId: session?.user?.id ?? -1,
                            }));
                            return;
                        }
                    }
                    finally {
                        chatHistoryContext.dispose().catch((disposeError) => {
                            LoggedError.isTurtlesAllTheWayDownBaby(disposeError, {
                                log: true,
                                source: 'route:ai:chat onError dispose',
                                severity: 'error',
                                data: {
                                    userId: session?.user?.id,
                                    model,
                                    chatHistoryId,
                                },
                            });
                        });
                    }
                },
                onFinish: async () => {
                    try {
                        log((l) => l.info({
                            source: 'route:ai:chat onFinish',
                            message: 'Chat response generated',
                            data: {
                                userId: session?.user?.id,
                                chatHistoryId,
                                model,
                                isRateLimitError,
                                retryAfter,
                            },
                        }));
                    }
                    catch (error) {
                        LoggedError.isTurtlesAllTheWayDownBaby(error, {
                            log: true,
                            source: 'route:ai:chat onFinish',
                            severity: 'error',
                            data: {
                                userId: session?.user?.id,
                                model,
                                chatHistoryId,
                                isRateLimitError,
                                retryAfter,
                            },
                        });
                        chatHistoryContext.error = error;
                    }
                    finally {
                        chatHistoryContext.dispose().catch((disposeError) => {
                            LoggedError.isTurtlesAllTheWayDownBaby(disposeError, {
                                log: true,
                                source: 'route:ai:chat onError dispose',
                                severity: 'error',
                                data: {
                                    userId: session?.user?.id,
                                    model,
                                    chatHistoryId,
                                },
                            });
                        });
                    }
                },
                tools: (toolProviders ??= await toolProviderFactory({
                    req,
                    chatHistoryId,
                    memoryDisabled,
                    writeEnabled,
                    user: session?.user,
                    sessionId: chatHistoryId,
                })).tools,
            });
            return streamingMessageResponse({
                result,
                context: {
                    chatHistoryId,
                    threadId,
                    model,
                    getIsRateLimitError: () => isRateLimitError,
                    getRetryAfter: () => retryAfter,
                },
            });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'route:ai:chat',
                severity: 'error',
            });
            await safeDisposeToolProviders(toolProviders);
            return NextResponse.error();
        }
    }, {
        buildFallback: {
            role: 'assistant',
            content: "I'm currently disabled for solution rebuild.",
        },
        errorCallback: () => safeDisposeToolProviders(toolProviders),
    })(req);
};
//# sourceMappingURL=route.js.map