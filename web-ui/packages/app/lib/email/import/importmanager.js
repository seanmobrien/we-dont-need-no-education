import { ImportStageValues, } from '@/data-models/api/import/email-message';
import { managerMapFactory } from './google/managermapfactory';
import { log, LoggedError, isError } from '@compliance-theater/logger';
import { TransactionalStateManagerBase } from './default/transactional-statemanager';
import { context, SpanKind, SpanStatusCode, trace, } from '@opentelemetry/api';
export class DefaultImportManager {
    static Stages = ImportStageValues;
    #provider;
    #map;
    #tracer;
    constructor(provider) {
        this.#provider = provider;
        this.#map = managerMapFactory(this.#provider);
        this.#tracer = trace.getTracer('sue-the-schools-webui');
    }
    async runImportStage(target, { req }) {
        const typedRunStage = async (stage) => {
            const providerEmailId = target?.providerId ?? 'No ID';
            const stageContext = {
                providerEmailId,
                target,
                currentStage: stage,
                nextStage: TransactionalStateManagerBase.calculateNextStage(stage),
                accountId: -1,
            };
            const factory = this.#map[stage];
            const stateManager = factory(stage, { req });
            try {
                const context = await stateManager
                    .begin(stageContext)
                    .then((c) => stateManager.run(c))
                    .then((c) => stateManager.commit(c))
                    .catch((e) => stateManager
                    .rollback()
                    .then(() => {
                    throw e;
                })
                    .catch((e2) => {
                    throw new AggregateError('Error during rollback', e, e2);
                }));
                if (stage === 'new') {
                    return context.target;
                }
                if (!context.target) {
                    throw new Error(`No import target found in current context in stage ${stage}`);
                }
                return context.target;
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'DefaultImportManager',
                    data: { stage, providerEmailId },
                    critical: true,
                });
            }
        };
        const result = await typedRunStage(target.stage);
        if (!result) {
            throw new Error('Expected a valid ImportSourceMessage to be returned.');
        }
        return result;
    }
    async importEmail(emailId, { req }) {
        const activeContext = context.active();
        return this.#tracer.startActiveSpan('Import Email', {
            root: false,
            kind: SpanKind.INTERNAL,
            startTime: performance.now(),
        }, activeContext, async (emailImportSpan) => {
            emailImportSpan
                .setAttribute('emailId', emailId)
                .setAttribute('provider', this.#provider)
                .setAttribute('timestamp', new Date().toISOString());
            try {
                let currentUserId = 0;
                let result = {
                    providerId: emailId ?? TransactionalStateManagerBase.NullId,
                    stage: 'new',
                    raw: null,
                    userId: undefined,
                };
                let tries = 0;
                let lastStage = null;
                await context.with(trace.setSpan(activeContext, emailImportSpan), async () => {
                    while (result.stage !== 'completed') {
                        await this.#tracer.startActiveSpan(result.stage === 'staged'
                            ? 'Staging email for import'
                            : `Import Stage: ${result.stage}`, {
                            root: false,
                            kind: SpanKind.INTERNAL,
                            startTime: performance.now(),
                        }, activeContext, async (stageSpan) => {
                            if (currentUserId) {
                                stageSpan.setAttribute('userId', currentUserId);
                            }
                            try {
                                if (lastStage === result.stage) {
                                    tries++;
                                    if (tries > 3) {
                                        const stageError = new Error(`Import stage did not progress after 3 attempts: ${result.stage}`);
                                        stageSpan.recordException(stageError, performance.now());
                                        stageSpan
                                            .addEvent('Import stage failed', { stage: result.stage }, performance.now())
                                            .setStatus({
                                            code: SpanStatusCode.ERROR,
                                            message: `Import stage ${result.stage} failed`,
                                        });
                                        throw stageError;
                                    }
                                    stageSpan.addEvent('Import stage did not progress, retrying.', { tries: tries, stage: result.stage }, performance.now());
                                }
                                else {
                                    lastStage = result.stage;
                                    tries = 0;
                                }
                                result = await this.runImportStage(result, { req });
                                if (result.userId !== currentUserId) {
                                    log((l) => l.info({
                                        message: 'User ID changed',
                                        stage: typeof result === 'string' ? 'new' : result.stage,
                                    }));
                                    stageSpan.setAttribute('userId', currentUserId);
                                    emailImportSpan.setAttribute('userId', currentUserId);
                                    currentUserId = result.userId;
                                }
                                log((l) => l.info({
                                    message: 'Import stage completed',
                                    stage: typeof result === 'string' ? 'new' : result.stage,
                                }));
                            }
                            finally {
                                stageSpan.end();
                            }
                        });
                    }
                });
                emailImportSpan
                    .addEvent('Import completed', {}, performance.now())
                    .setStatus({
                    code: SpanStatusCode.OK,
                    message: 'Import completed successfully',
                });
                return {
                    success: true,
                    message: 'Import successful',
                    data: result,
                };
            }
            catch (error) {
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    source: 'DefaultImportManager',
                    log: true,
                });
                emailImportSpan.recordException(le, Date.now());
                emailImportSpan
                    .addEvent('Import failed', {}, performance.now())
                    .setStatus({
                    code: SpanStatusCode.ERROR,
                    message: 'Import failed',
                });
                return {
                    success: false,
                    message: (isError(error) ? error.message : null) ?? 'Import failed',
                    error: le,
                };
            }
            finally {
                emailImportSpan.end();
            }
        });
    }
}
//# sourceMappingURL=importmanager.js.map