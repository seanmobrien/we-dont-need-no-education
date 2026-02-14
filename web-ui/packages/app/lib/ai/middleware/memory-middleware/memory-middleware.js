import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { MiddlewareStateManager } from '../state-management';
import { noopStrategyFactory } from './noop-strategy';
import { directAccessStrategyFactory } from './direct-access';
import { promptInjectionStrategyFactory } from './prompt-injection-strategy';
import { wrapLanguageModel } from 'ai';
import { PassthroughStreamProcessor } from '../chat-history/passthrough-processor';
import { ensureCreateResult } from '../chat-history/stream-handler-result';
const strategyFactory = (context) => {
    const strategies = [];
    const { mem0Enabled, directAccess } = context;
    if (!mem0Enabled) {
        strategies.push(['No Operation', noopStrategyFactory()]);
    }
    else {
        if (directAccess) {
            strategies.push(['Direct Access', directAccessStrategyFactory()]);
        }
        strategies.push(['Prompt Injection', promptInjectionStrategyFactory()]);
    }
    return strategies;
};
export const memoryMiddlewareFactory = (context) => ({
    wrapStream: async ({ doStream, params }) => {
        try {
            const result = await doStream();
            const processor = new PassthroughStreamProcessor();
            const streamContext = ensureCreateResult({
                chatId: context.chatId,
                turnId: 0,
                messageId: undefined,
                currentMessageOrder: 0,
                generatedText: '',
                generatedJSON: [],
                toolCalls: new Map(),
            });
            const transformStream = new TransformStream({
                async transform(chunk, controller) {
                    try {
                        await processor.process(chunk, streamContext);
                    }
                    catch (e) {
                        log((l) => l.warn('Error processing chunk in memory middleware', {
                            error: e,
                        }));
                    }
                    controller.enqueue(chunk);
                },
                async flush() {
                    log((l) => l.verbose('Memory middleware stream flushed'));
                    try {
                        const output = streamContext.generatedJSON;
                        const strategies = strategyFactory(context);
                        if (strategies?.length) {
                            for (const [strategyName, strategy] of strategies) {
                                try {
                                    const processed = await strategy.onOutputGenerated({
                                        output,
                                        params,
                                        context,
                                    });
                                    if (processed) {
                                        log((l) => l.verbose(`Memory strategy ${strategyName} successfully processed output`));
                                        break;
                                    }
                                }
                                catch (err) {
                                    LoggedError.isTurtlesAllTheWayDownBaby(err, {
                                        source: `memory-middleware:wrapStream:onOutputGenerated::[${strategyName}]`,
                                        log: true,
                                    });
                                }
                            }
                        }
                    }
                    catch (e) {
                        log((l) => l.error('Error in memory middleware flush', { error: e }));
                    }
                },
            });
            return {
                stream: result.stream.pipeThrough(transformStream),
            };
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'memoryMiddleware:wrapStream',
                log: true,
            });
        }
        finally {
            log((l) => l.verbose('=== Memory middleware stream end ==='));
        }
    },
    wrapGenerate: async ({ doGenerate, params }) => {
        try {
            const result = await doGenerate();
            const strategies = strategyFactory(context);
            if (strategies?.length) {
                for (const [strategyName, strategy] of strategies) {
                    try {
                        await strategy.onOutputGenerated({
                            output: result.content,
                            params,
                            context,
                        });
                    }
                    catch (err) {
                        LoggedError.isTurtlesAllTheWayDownBaby(err, {
                            source: `memory-middleware:wrapGenerate:onOutputGenerated::[${strategyName}]`,
                            log: true,
                        });
                    }
                }
            }
            return result;
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'memoryMiddleware:wrapGenerate',
                log: true,
            });
        }
        finally {
            log((l) => l.verbose('=== Memory middleware generate end ==='));
        }
    },
    transformParams: async ({ params }) => {
        try {
            const strategies = strategyFactory(context);
            if (!strategies?.length) {
                log((l) => l.verbose('No memory middleware strategies available'));
                return params;
            }
            for (const [strategyName, strategy] of strategies) {
                log((l) => l.verbose(`Applying memory middleware strategy: ${strategyName}`));
                try {
                    const result = await strategy.transformParams({ params, context });
                    if (result) {
                        log((l) => l.verbose(`Memory middleware strategy ${strategyName} processing complete; implementing strategy: ${strategyName}`));
                        return result;
                    }
                    else {
                        log((l) => l.verbose(`Memory middleware strategy ${strategyName} processing failed; falling back to next strategy.`));
                    }
                }
                catch (error) {
                    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        source: `memory-middleware:transform-params::[${strategyName}]`,
                        log: true,
                    });
                    log((l) => l.warn(`An error occurred accessing memory - some context may not be available.  Details: ${safeSerialize(le, { maxObjectDepth: 3 })}`));
                }
            }
            log((l) => l.verbose(`Memory middleware strategies exhausted; memory integration not available.`));
            return params;
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'memory-middleware:transform-params',
                log: true,
            });
        }
        finally {
            log((l) => l.verbose('=== Memory middleware transformParams end ==='));
        }
    },
});
export const memoryMiddlewareContextFactory = ({ projectId, orgId, impersonation, mem0Enabled, userId, chatId, messageId, toolProviders, directAccess = true, }) => {
    return {
        impersonation,
        projectId: projectId,
        organizationId: orgId,
        toolProviders,
        mem0Enabled,
        directAccess,
        userId,
        chatId,
        messageId,
        memClient: undefined,
    };
};
export const memoryMiddleware = (options) => {
    const context = memoryMiddlewareContextFactory(options);
    return MiddlewareStateManager.Instance.basicMiddlewareWrapper({
        middlewareId: 'memory-middleware',
        middleware: memoryMiddlewareFactory(context),
    });
};
export const wrapMemoryMiddleware = ({ model, ...options }) => wrapLanguageModel({
    model,
    middleware: memoryMiddleware(options),
});
export default memoryMiddleware;
//# sourceMappingURL=memory-middleware.js.map