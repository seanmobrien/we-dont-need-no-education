import { LoggedError, log } from '@compliance-theater/logger';
import { enqueueStream, ProcessingQueue } from './processing-queue';
import { simulateReadableStream, wrapLanguageModel } from 'ai';
import { MiddlewareStateManager } from '../state-management';
import { ToolMap } from '../../services/model-stats/tool-map';
import { createToolOptimizingMiddleware } from '../tool-optimizing-middleware';
export { instrumentFlushOperation, instrumentStreamChunk, instrumentMiddlewareInit, recordQueueOperation, createChatHistoryError, } from './instrumentation';
export { createAgentHistoryContext, createUserChatHistoryContext, } from './create-chat-history-context';
export { chatIdFromParams } from './message-persistence';
const createOriginalChatHistoryMiddleware = (context) => {
    const processingQueue = new ProcessingQueue();
    return {
        wrapStream: async ({ doStream, params }) => {
            try {
                const { stream, ...rest } = await doStream();
                const streamContext = await enqueueStream({
                    stream,
                    params,
                    context,
                    processingQueue,
                });
                return {
                    stream: streamContext.stream,
                    ...rest,
                };
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ChatHistoryMiddleware',
                    message: 'Error in streaming chat history middleware',
                    critical: true,
                    data: {
                        chatId: context.chatId,
                        turnId: context.turnId,
                        context,
                    },
                });
                return doStream();
            }
            finally {
                log((l) => l.verbose('=== ChatHistoryMiddleware.wrapStream - END ==='));
            }
        },
        wrapGenerate: async ({ doGenerate, params }) => {
            const result = await doGenerate();
            try {
                const stream = simulateReadableStream({
                    chunks: result.content,
                    chunkDelayInMs: 0,
                    initialDelayInMs: 0,
                });
                const streamContext = await enqueueStream({
                    stream,
                    params,
                    context,
                    processingQueue,
                });
                streamContext.result.catch((error) => {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'ChatHistoryMiddleware',
                        message: 'Error in streaming chat history middleware',
                        critical: true,
                        data: {
                            chatId: context.chatId,
                            turnId: context.turnId,
                            context,
                        },
                    });
                });
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ChatHistoryMiddleware',
                    message: 'Error in streaming chat history middleware',
                    critical: true,
                    data: {
                        chatId: context.chatId,
                        turnId: context.turnId,
                        context,
                    },
                });
            }
            return result;
        },
        transformParams: async ({ params }) => {
            log((l) => l.verbose('ChatHistoryMiddleware.transformParams', { params }));
            const { tools = [] } = params;
            try {
                await ToolMap.getInstance().then((x) => x.scanForTools(tools));
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ChatHistoryMiddleware',
                    message: 'Error in transforming parameters',
                    critical: true,
                    data: {
                        chatId: context.chatId,
                        turnId: context.turnId,
                        context,
                    },
                });
                throw error;
            }
            return {
                ...params,
                tools,
            };
        },
    };
};
export const createChatHistoryMiddleware = (context) => {
    let sharedState = {
        currentMessageOrder: 0,
        generatedText: '',
        startTime: Date.now(),
        contextData: {},
    };
    const originalMiddleware = createOriginalChatHistoryMiddleware(context);
    return MiddlewareStateManager.Instance.statefulMiddlewareWrapper({
        middlewareId: 'chat-history',
        middleware: originalMiddleware,
        serialize: () => Promise.resolve({
            ...sharedState,
        }),
        deserialize: ({ state, }) => {
            if (state) {
                sharedState = {
                    ...sharedState,
                    ...state,
                    startTime: Date.now() - (state.startTime || 0),
                };
                log((l) => l.debug('Chat history state restored', {
                    messageOrder: sharedState.currentMessageOrder,
                    textLength: sharedState.generatedText.length,
                    elapsedTime: Date.now() - sharedState.startTime,
                    contextData: sharedState.contextData,
                }));
            }
            return Promise.resolve();
        },
    });
};
export const createChatHistoryMiddlewareEx = createOriginalChatHistoryMiddleware;
export const wrapChatHistoryMiddleware = ({ model, chatHistoryContext, }) => {
    if (!chatHistoryContext) {
        throw new TypeError('chatHistoryContext is required');
    }
    if (!model) {
        throw new TypeError('model is required');
    }
    return wrapLanguageModel({
        model,
        middleware: [
            createToolOptimizingMiddleware({
                userId: chatHistoryContext.userId,
                chatHistoryId: chatHistoryContext.requestId,
                enableMessageOptimization: true,
                optimizationThreshold: 5,
                enableToolScanning: true,
            }),
            createChatHistoryMiddleware(chatHistoryContext),
        ],
    });
};
//# sourceMappingURL=index.js.map