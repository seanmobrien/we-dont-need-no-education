import { LoggedError, log } from '@compliance-theater/logger';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';
const toolOptimizationCounter = appMeters.createCounter('ai_tool_optimization_middleware_total', {
    description: 'Total number of tool optimization middleware operations',
    unit: '1',
});
const toolScanningCounter = appMeters.createCounter('ai_tool_scanning_total', {
    description: 'Total number of tool scanning operations',
    unit: '1',
});
const toolOptimizationDurationHistogram = appMeters.createHistogram('ai_tool_optimization_middleware_duration_ms', {
    description: 'Duration of tool optimization middleware operations',
    unit: 'ms',
});
const newToolsFoundHistogram = appMeters.createHistogram('ai_new_tools_found_count', {
    description: 'Distribution of new tools found during scanning',
    unit: '1',
});
const messageOptimizationHistogram = appMeters.createHistogram('ai_message_optimization_enabled_total', {
    description: 'Total number of times message optimization was enabled',
    unit: '1',
});
export function createToolOptimizingMiddleware(config = {}) {
    const { userId, chatHistoryId, enableMessageOptimization = true, optimizationThreshold = 10, enableToolScanning = true, } = config;
    const enableToolScanningExplicit = Object.hasOwn(config, 'enableToolScanning');
    async function performToolScanning(params, attributes) {
        if (!enableToolScanning || !params.tools)
            return 0;
        let newToolsCount = 0;
        const toolMap = await ToolMap.getInstance();
        try {
            newToolsCount = await toolMap.scanForTools(params.tools);
            toolScanningCounter.add(1, {
                ...attributes,
                tools_provided: Array.isArray(params.tools) ? params.tools.length : 1,
            });
            newToolsFoundHistogram.record(newToolsCount, attributes);
            log((l) => l.debug('Tool scanning completed', {
                newToolsFound: newToolsCount,
                totalToolsProvided: Array.isArray(params.tools)
                    ? params.tools.length
                    : 1,
            }));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ToolOptimizingMiddleware.toolScanning',
                message: 'Failed to scan tools',
                data: {
                    userId,
                    chatHistoryId,
                    toolsCount: Array.isArray(params.tools) ? params.tools.length : 1,
                },
            });
        }
        return newToolsCount;
    }
    function selectSourceMessages(params) {
        const hasLegacyMessagesKey = Object.prototype.hasOwnProperty.call(params, 'messages');
        const legacyMessagesValue = params.messages;
        const legacyArray = Array.isArray(legacyMessagesValue)
            ? legacyMessagesValue
            : undefined;
        const promptArray = Array.isArray(params.prompt)
            ? params.prompt
            : undefined;
        const sourceMessages = legacyArray ?? promptArray;
        return {
            hasLegacyMessagesKey,
            legacyMessagesValue,
            legacyArray,
            promptArray,
            sourceMessages,
        };
    }
    function buildOptimizerInput(legacyArray, promptArray, params) {
        if (!legacyArray && Array.isArray(promptArray) && promptArray.length > 0) {
            const first = promptArray[0];
            const second = promptArray[1];
            if (!first?.id && second?.id) {
                const paramModel = params.model;
                const needsSlice = enableToolScanningExplicit ||
                    typeof paramModel === 'string' ||
                    typeof paramModel === 'undefined';
                if (needsSlice)
                    return promptArray.slice(1);
            }
        }
        return legacyArray ?? promptArray;
    }
    async function optimizeMessagesStep(params, model, opType, attributes) {
        const { hasLegacyMessagesKey, legacyMessagesValue, legacyArray, promptArray, sourceMessages, } = selectSourceMessages(params);
        if (hasLegacyMessagesKey && !Array.isArray(legacyMessagesValue)) {
            return {
                result: {
                    ...params,
                    prompt: legacyMessagesValue,
                    messages: legacyMessagesValue,
                },
                applied: false,
                earlyReturn: true,
            };
        }
        if (!sourceMessages) {
            return {
                result: params,
                applied: false,
                earlyReturn: true,
            };
        }
        const optimizerInput = buildOptimizerInput(legacyArray, promptArray, params);
        const shouldOptimize = enableMessageOptimization &&
            opType === 'generate' &&
            Array.isArray(optimizerInput) &&
            optimizerInput.length >= optimizationThreshold;
        if (!shouldOptimize) {
            if (!hasLegacyMessagesKey) {
                return {
                    result: params,
                    applied: false,
                    earlyReturn: false,
                    sourceCount: sourceMessages.length,
                };
            }
            return {
                result: {
                    ...params,
                    prompt: sourceMessages,
                    messages: sourceMessages,
                },
                applied: false,
                earlyReturn: false,
                sourceCount: sourceMessages.length,
            };
        }
        let optimizedMessages = sourceMessages;
        try {
            const modelId = typeof model === 'string'
                ? model
                : model?.modelId || 'unknown';
            const optimizedCandidate = await optimizeMessagesWithToolSummarization(optimizerInput, modelId, userId, chatHistoryId);
            optimizedMessages = optimizedCandidate;
            messageOptimizationHistogram.record(1, {
                ...attributes,
                model: modelId,
                original_messages: sourceMessages.length,
                optimized_messages: optimizedMessages.length,
            });
            log((l) => l.info('Message optimization applied', {
                originalMessages: sourceMessages.length,
                optimizedMessages: optimizedMessages.length,
                modelId,
                userId,
                chatHistoryId,
            }));
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ToolOptimizingMiddleware.messageOptimization',
                message: 'Failed to optimize messages',
                data: {
                    userId,
                    chatHistoryId,
                    messageCount: sourceMessages.length,
                    modelId: typeof model === 'string' ? model : model?.modelId || 'unknown',
                },
            });
            optimizedMessages = sourceMessages;
        }
        const resultParams = {
            ...params,
            prompt: optimizedMessages,
        };
        if (hasLegacyMessagesKey)
            resultParams.messages = optimizedMessages;
        return {
            result: resultParams,
            applied: optimizedMessages !== sourceMessages ||
                optimizerInput !== sourceMessages,
            earlyReturn: false,
            sourceCount: sourceMessages.length,
            optimizedCount: optimizedMessages.length,
        };
    }
    const middleware = {
        transformParams: async (options) => {
            const { type, params, model } = options;
            const opType = type === 'stream' || type === 'streamText' ? 'stream' : 'generate';
            const startTime = Date.now();
            const attributes = {
                user_id: userId ? hashUserId(userId) : 'anonymous',
                chat_id: chatHistoryId || 'unknown',
            };
            try {
                toolOptimizationCounter.add(1, attributes);
                log((l) => l.debug('Tool optimizing middleware transformParams', {
                    enableToolScanning,
                    enableMessageOptimization,
                    userId,
                    chatHistoryId,
                }));
                const newToolsCount = await performToolScanning(params, attributes);
                const optimization = await optimizeMessagesStep(params, model, opType, attributes);
                if (!optimization.earlyReturn) {
                    const duration = Date.now() - startTime;
                    toolOptimizationDurationHistogram.record(duration, {
                        ...attributes,
                        optimization_applied: String(optimization.applied),
                        new_tools_found: newToolsCount,
                    });
                    log((l) => l.debug('Tool optimizing middleware completed', {
                        duration,
                        newToolsFound: newToolsCount,
                        optimizationApplied: optimization.applied,
                        originalMessageCount: optimization.sourceCount,
                        optimizedMessageCount: optimization.optimizedCount,
                    }));
                }
                return optimization.result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                toolOptimizationDurationHistogram.record(duration, {
                    ...attributes,
                    status: 'error',
                });
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'ToolOptimizingMiddleware.transformParams',
                    message: 'Unexpected error in tool optimizing middleware',
                    data: { userId, chatHistoryId },
                });
                const legacyParams = params;
                if (legacyParams.messages && !legacyParams.prompt) {
                    legacyParams.prompt = legacyParams.messages;
                }
                return params;
            }
        },
    };
    return middleware;
}
export const getToolOptimizingMiddlewareMetrics = () => {
    return {
        counters: {
            tool_optimization_middleware_total: 'ai_tool_optimization_middleware_total',
            tool_scanning_total: 'ai_tool_scanning_total',
            message_optimization_enabled_total: 'ai_message_optimization_enabled_total',
        },
        histograms: {
            tool_optimization_middleware_duration_ms: 'ai_tool_optimization_middleware_duration_ms',
            new_tools_found_count: 'ai_new_tools_found_count',
        },
    };
};
export { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
export { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
//# sourceMappingURL=index.js.map