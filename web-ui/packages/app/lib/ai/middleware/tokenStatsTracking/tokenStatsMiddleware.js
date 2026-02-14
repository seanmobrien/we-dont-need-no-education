import { getInstance } from '../../services/model-stats/token-stats-service';
import { log, LoggedError } from '@compliance-theater/logger';
import { countTokens } from '../../core/count-tokens';
import { MiddlewareStateManager } from '../state-management';
import { ModelMap } from '../../services/model-stats/model-map';
import { isResourceNotFoundError } from '../../services/chat/errors/resource-not-found-error';
const extractProviderAndModel = async (modelId) => {
    const modelMap = await ModelMap.getInstance();
    const parts = await modelMap.normalizeProviderModel(modelId);
    parts.rethrow();
    const { provider, modelName } = parts;
    return {
        provider,
        modelName,
    };
};
const isQuotaEnforcementError = (error) => typeof error === 'object' &&
    !!error &&
    'message' in error &&
    'quota' in error &&
    typeof error.quota === 'object';
const quotaCheck = async ({ provider, modelName, estimatedTokens, enableQuotaEnforcement = true, enableLogging = true, }) => {
    try {
        const quotaCheck = await getInstance().checkQuota(provider, modelName, estimatedTokens);
        if (quotaCheck.allowed) {
            if (enableLogging) {
                log((l) => l.verbose('Quota check passed', {
                    provider,
                    modelName,
                    estimatedTokens,
                    currentUsage: quotaCheck.currentUsage,
                }));
            }
            return quotaCheck;
        }
        if (enableLogging) {
            log((l) => l.warn('Request failed quota check', {
                provider,
                modelName,
                reason: quotaCheck.reason,
                currentUsage: quotaCheck.currentUsage,
                quota: quotaCheck.quota,
            }));
        }
        if (enableQuotaEnforcement) {
            const error = new Error(`Quota exceeded: ${quotaCheck.reason}`);
            error.quota = quotaCheck;
            throw error;
        }
    }
    catch (error) {
        if (isQuotaEnforcementError(error)) {
            throw error;
        }
        if (enableLogging) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'tokenStatsMiddleware.quotaCheck',
                log: enableLogging,
                data: {
                    provider,
                    modelName,
                    estimatedTokens,
                },
            });
        }
    }
    return { allowed: true, reason: 'Quota check failed, allowing request' };
};
const wrapGenerate = async ({ doGenerate, model, config: { provider: configProvider, modelName: configModelName, enableLogging = true, enableQuotaEnforcement = false, }, params: { providerOptions: { backOffice: { estTokens: estimatedTokens = 0 } = {}, } = {}, }, }) => {
    try {
        const { provider, modelName, rethrow } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(model));
        try {
            rethrow();
            if (enableLogging) {
                log((l) => l.verbose('Token stats middleware processing request', {
                    provider,
                    modelName,
                }));
            }
            await quotaCheck({
                provider,
                modelName,
                estimatedTokens,
                enableQuotaEnforcement,
                enableLogging,
            });
        }
        catch (error) {
            if (isResourceNotFoundError(error)) {
                if (enableLogging) {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        data: {
                            severity: 'warning',
                            message: 'Unknown model',
                            model,
                        },
                    });
                }
                if (enableQuotaEnforcement) {
                    throw error;
                }
            }
            else {
                throw error;
            }
        }
        try {
            const result = await doGenerate();
            if (result.usage) {
                const tokenUsage = {
                    promptTokens: result?.usage?.inputTokens ?? 0,
                    completionTokens: result?.usage?.outputTokens ?? 0,
                    totalTokens: result?.usage?.totalTokens ?? 0,
                };
                if (provider && modelName) {
                    getInstance()
                        .safeRecordTokenUsage(provider, modelName, tokenUsage)
                        .catch((error) => {
                        if (enableLogging) {
                            log((l) => l.error('Failed to record token usage', {
                                provider,
                                modelName,
                                tokenUsage,
                                error: error instanceof Error ? error.message : String(error),
                            }));
                        }
                    });
                }
                if (enableLogging) {
                    log((l) => l.silly('Token usage recorded', {
                        provider,
                        modelName,
                        tokenUsage,
                    }));
                }
            }
            return result;
        }
        catch (error) {
            if (isQuotaEnforcementError(error)) {
                throw error;
            }
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'tokenStatsMiddleware.wrapGenerate',
                log: enableLogging,
                data: {
                    provider,
                    modelName,
                    estimatedTokens,
                },
            });
        }
    }
    catch (error) {
        if (isQuotaEnforcementError(error)) {
            throw error;
        }
        else {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'tokenStatsMiddleware.wrapGenerate',
                log: enableLogging,
                data: {
                    provider: configProvider || typeof model === 'string' ? '' : model.provider,
                    modelName: configModelName || typeof model === 'string'
                        ? model
                        : model.modelId,
                    estimatedTokens,
                },
            });
        }
    }
};
const wrapStream = async ({ doStream, model, config: { provider: configProvider, modelName: configModelName, enableLogging = true, enableQuotaEnforcement = false, }, params: { providerOptions: { backOffice: { estTokens: estimatedTokens = 0 } = {}, } = {}, }, }) => {
    let provider = '';
    let modelName = '';
    try {
        const { provider: providerFromProps, modelName: modelNameFromProps } = await (typeof model === 'string'
            ? extractProviderAndModel(model)
            : configProvider && configModelName
                ? { provider: configProvider, modelName: configModelName }
                : model.provider && model.modelId
                    ? { provider: model.provider, modelName: model.modelId }
                    : extractProviderAndModel(model));
        provider = providerFromProps;
        modelName = modelNameFromProps;
        if (enableLogging) {
            log((l) => l.verbose('Token stats middleware processing stream request', {
                data: {
                    provider,
                    modelName,
                    estimatedTokens,
                },
            }));
        }
        await quotaCheck({
            provider,
            modelName,
            estimatedTokens,
            enableQuotaEnforcement,
            enableLogging,
        });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.wrapStream',
            log: enableLogging,
            data: {
                provider,
                modelName,
                estimatedTokens,
            },
        });
        if (isQuotaEnforcementError(error) || isResourceNotFoundError(error)) {
            if (enableQuotaEnforcement) {
                throw enableLogging ? le : error;
            }
        }
        else {
            throw enableLogging ? le : error;
        }
    }
    try {
        const result = await doStream();
        let promptTokens = 0;
        let completionTokens = 0;
        let generatedText = '';
        let hasFinished = false;
        const transformStream = new TransformStream({
            transform(chunk, controller) {
                try {
                    if (chunk.type === 'text-delta') {
                        generatedText += chunk.delta;
                    }
                    if (chunk.type === 'finish') {
                        hasFinished = true;
                        if (chunk.usage) {
                            promptTokens = chunk.usage.inputTokens || 0;
                            completionTokens = chunk.usage.outputTokens || 0;
                        }
                    }
                    controller.enqueue(chunk);
                }
                catch (error) {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        source: 'tokenStatsMiddleware.streamTransform',
                        log: enableLogging,
                        data: {
                            provider,
                            modelName,
                            chunkType: chunk.type,
                        },
                    });
                }
            },
            flush() {
                if (!provider || !modelName) {
                    return;
                }
                try {
                    if (hasFinished || generatedText.length > 0) {
                        if (completionTokens === 0 && generatedText.length > 0) {
                            completionTokens = Math.ceil(generatedText.length / 4);
                        }
                        if (promptTokens === 0) {
                            promptTokens = estimatedTokens;
                        }
                        const tokenUsage = {
                            promptTokens,
                            completionTokens,
                            totalTokens: promptTokens + completionTokens,
                        };
                        if (tokenUsage.totalTokens > 0) {
                            getInstance()
                                .safeRecordTokenUsage(provider, modelName, tokenUsage)
                                .catch((error) => {
                                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                                    source: 'tokenStatsMiddleware.streamTransform',
                                    log: enableLogging,
                                    data: {
                                        provider,
                                        modelName,
                                        tokenUsage,
                                    },
                                });
                            });
                            if (enableLogging) {
                                log((l) => l.verbose('=== tokenStatsMiddleware: Stream token usage recorded ===', {
                                    provider,
                                    modelName,
                                    tokenUsage,
                                    generatedTextLength: generatedText.length,
                                }));
                            }
                        }
                    }
                }
                catch (error) {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        source: 'tokenStatsMiddleware.streamTransformFlush',
                        log: enableLogging,
                        data: {
                            provider,
                            modelName,
                        },
                    });
                }
            },
        });
        return {
            ...result,
            stream: result.stream.pipeThrough(transformStream),
        };
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.wrapStream',
            log: enableLogging,
            data: {
                provider,
                modelName,
                estimatedTokens,
            },
        });
    }
    finally {
        if (enableLogging) {
            log((l) => l.verbose('Token stats middleware completed'));
        }
    }
};
export const transformParams = async ({ params: { prompt, providerOptions: providerMetadata = {}, ...params }, config: { enableLogging = true }, }) => {
    log((l) => l.verbose('=== TokenStatsMiddleware.transformParams - BEGIN ==='));
    try {
        const tokens = countTokens({ prompt, enableLogging });
        providerMetadata.backOffice = {
            ...(providerMetadata.backOffice ?? {}),
            estTokens: tokens,
        };
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.transformParams',
            log: enableLogging,
        });
    }
    log((l) => l.verbose('=== TokenStatsMiddleware.transformParams - END ==='));
    return {
        ...params,
        prompt,
        providerOptions: providerMetadata,
    };
};
const createOriginalTokenStatsMiddleware = (config = {}) => {
    const { provider: p, modelName: m } = config ?? {};
    const setupModelProviderOverrides = () => ({
        overrideProvider: p ? () => p : undefined,
        overrideModelId: m ? () => m : undefined,
    });
    let { overrideProvider, overrideModelId } = setupModelProviderOverrides();
    const thisInstance = {
        wrapGenerate: async (props) => wrapGenerate({
            ...props,
            config,
        }),
        wrapStream: async (props) => wrapStream({
            ...props,
            config,
        }),
        transformParams: async (props) => transformParams({
            ...props,
            config,
        }),
        getMiddlewareId: () => 'token-stats-tracking',
        serializeState: () => Promise.resolve({ config: JSON.stringify(config) }),
        deserializeState: ({ state }) => {
            const { config: configFromState } = state;
            if (!configFromState) {
                return Promise.reject(new TypeError('Missing required property "config".'));
            }
            config = JSON.parse(configFromState.toString());
            ({ overrideProvider, overrideModelId } = setupModelProviderOverrides());
            if (overrideProvider) {
                thisInstance.overrideProvider = overrideProvider;
            }
            if (overrideModelId) {
                thisInstance.overrideModelId = overrideModelId;
            }
            return Promise.resolve();
        },
        overrideProvider,
        overrideModelId,
    };
    return thisInstance;
};
export const tokenStatsMiddleware = (config = {}) => MiddlewareStateManager.Instance.statefulMiddlewareWrapper({
    middlewareId: 'token-stats-tracking',
    middleware: createOriginalTokenStatsMiddleware(config),
});
export const tokenStatsWithQuotaMiddleware = (config = {}) => tokenStatsMiddleware({
    enableLogging: true,
    ...config,
    enableQuotaEnforcement: true,
});
export const tokenStatsLoggingOnlyMiddleware = (config = {}) => tokenStatsMiddleware({
    ...config,
    enableLogging: true,
    enableQuotaEnforcement: false,
});
//# sourceMappingURL=tokenStatsMiddleware.js.map