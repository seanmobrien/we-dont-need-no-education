import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { initializeErrorReporterConfig, reporter, } from '@/lib/react-util/errors/logged-error-reporter';
import { initializeProviderConfig } from '../ai/aiModelFactory/util';
import { globalRequiredSingleton } from '@compliance-theater/typescript';
import AfterManager from '@compliance-theater/after';
class AppStartup {
    #state;
    #pending;
    constructor() {
        this.#state = 'initializing';
    }
    get state() {
        return this.#state;
    }
    getStateAsync() {
        return this.#pending
            ? this.#pending.then(() => this.#state)
            : Promise.resolve(this.#state);
    }
    initialize() {
        if (this.#state !== 'pending') {
            return this.#pending ?? Promise.resolve();
        }
        this.#pending = (async () => {
            this.#state = 'initializing';
            try {
                const allEnvironments = [initializeErrorReporterConfig];
                const nodeOnly = [initializeProviderConfig];
                const allInitializers = [
                    ...allEnvironments,
                    ...(typeof window === 'undefined' &&
                        process.env.NODE_RUNTIME === 'nodejs'
                        ? nodeOnly
                        : []),
                ];
                const allPendingInitializers = await Promise.allSettled(allInitializers.map((init) => init()));
                const allFailed = allPendingInitializers
                    .map((result, idx) => result.status === 'rejected' ? allInitializers[idx] : undefined)
                    .filter(Boolean);
                if (allFailed && allFailed.length > 0) {
                    throw new Error(`Failed to initialize one or more initializers: ${allFailed.join(', ')}`);
                }
                this.#state = 'ready';
            }
            catch (e) {
                this.#state = 'done';
                throw LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    source: 'app-startup',
                    log: true,
                });
            }
            finally {
                this.#pending = undefined;
            }
        })();
        return this.#pending;
    }
    teardown() {
        switch (this.#state) {
            case 'pending':
            case 'initializing':
                throw new Error('App startup is not ready to be torn down.');
            case 'ready':
                this.#pending = (async () => {
                    this.#state = 'teardown';
                    try {
                        const reportingInstance = await reporter();
                        if (reportingInstance) {
                            reportingInstance.unsubscribeFromErrorReports();
                        }
                    }
                    catch (e) {
                        log((l) => l.error(`Failed to teardown app startup ${JSON.stringify(e)}`));
                        this.#state = 'done';
                        throw e;
                    }
                    finally {
                        this.#pending = undefined;
                    }
                })();
                break;
            case 'teardown':
                if (this.#pending) {
                    return this.#pending;
                }
                break;
            case 'done':
                break;
        }
        return Promise.resolve();
    }
    static get Instance() {
        return globalRequiredSingleton('@noeducation/site-util/appstartup', () => {
            const ret = new AppStartup();
            ret.initialize().then(() => {
                log((l) => l.info('App startup successfully completed.'));
            });
            AfterManager.processExit(() => ret.teardown().catch((e) => {
                log((l) => l.error(`Failed to teardown app state: ${safeSerialize(e)}`));
                return;
            }));
            return ret;
        });
    }
}
export const startup = () => AppStartup.Instance.getStateAsync();
export const state = () => AppStartup.Instance.state;
//# sourceMappingURL=app-startup.js.map