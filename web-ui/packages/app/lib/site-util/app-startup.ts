import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import {
  initializeErrorReporterConfig,
  reporter,
} from '@/lib/react-util/errors/logged-error-reporter';
import { initializeProviderConfig } from '../ai/aiModelFactory/util';
import { globalRequiredSingleton } from '@compliance-theater/typescript';
import AfterManager from './after';

/**
 * The state of the application startup process.
 * Can be one of:
 * - 'pending': The application startup process has not yet started.
 * - 'initializing': The application startup process is in progress.
 * - 'ready': The application startup process has completed successfully.
 * - 'teardown': The application startup process is in the process of being torn down.
 * - 'done': The application startup process has completed and is no longer active.
 */
type AppStartupState =
  | 'pending'
  | 'initializing'
  | 'ready'
  | 'teardown'
  | 'done';

class AppStartup {
  #state: AppStartupState;
  #pending: Promise<void> | undefined;

  constructor() {
    this.#state = 'initializing';
  }

  get state(): AppStartupState {
    return this.#state;
  }
  getStateAsync(): Promise<AppStartupState> {
    return this.#pending
      ? this.#pending.then(() => this.#state)
      : Promise.resolve(this.#state);
  }
  initialize(): Promise<void> {
    // Guard against multiple initializations
    if (this.#state !== 'pending') {
      return this.#pending ?? Promise.resolve();
    }
    this.#pending = (async () => {
      this.#state = 'initializing';
      try {
        // Compute which initializers are needed in the current environment
        const allEnvironments = [initializeErrorReporterConfig];
        const nodeOnly = [initializeProviderConfig];
        const allInitializers = [
          ...allEnvironments,
          ...(typeof window === 'undefined' &&
          process.env.NODE_RUNTIME === 'nodejs'
            ? nodeOnly
            : []),
        ];
        // Run them all in parallel
        const allPendingInitializers = await Promise.allSettled(
          allInitializers.map((init) => init())
        );
        const allFailed = allPendingInitializers
          .map((result, idx) =>
            result.status === 'rejected' ? allInitializers[idx] : undefined
          )
          .filter(Boolean);
        if (allFailed && allFailed.length > 0) {
          throw new Error(
            `Failed to initialize one or more initializers: ${allFailed.join(
              ', '
            )}`
          );
        }
        this.#state = 'ready';
      } catch (e) {
        this.#state = 'done';
        throw LoggedError.isTurtlesAllTheWayDownBaby(e, {
          source: 'app-startup',
          log: true,
        });
      } finally {
        this.#pending = undefined;
      }
    })();
    return this.#pending;
  }
  teardown(): Promise<void> {
    switch (this.#state) {
      case 'pending':
      case 'initializing':
        throw new Error('App startup is not ready to be torn down.');
      case 'ready':
        this.#pending = (async () => {
          this.#state = 'teardown';
          // Note for now we only have the one cleanup action, so it
          // makes sense to do it inline here, but if we add more cleanup
          // actions we should switch to the more structured approach used
          // in {@link AppStartup.initialize}
          try {
            const reportingInstance = await reporter();
            if (reportingInstance) {
              reportingInstance.unsubscribeFromErrorReports();
            }
          } catch (e) {
            log((l) =>
              l.error(`Failed to teardown app startup ${JSON.stringify(e)}`)
            );
            this.#state = 'done';
            throw e;
          } finally {
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
        // Fallthrough to default promise.resolve
        break;
    }
    return Promise.resolve();
  }

  static get Instance(): AppStartup {
    return globalRequiredSingleton('@noeducation/site-util/appstartup', () => {
      const ret = new AppStartup();
      // Initialize app startup
      ret.initialize().then(() => {
        log((l) => l.info('App startup successfully completed.'));
      });
      // Subscribe to process exit to handle app state teardown
      AfterManager.processExit(() =>
        ret.teardown().catch((e) => {
          log((l) =>
            l.error(`Failed to teardown app state: ${safeSerialize(e)}`)
          );
          return;
        })
      );
      // Return singleton instance
      return ret;
    });
  }
}

/**
 * Performs any necessary
 * @returns The current state of the app - see {@link AppStartupState} for possible values.
 */
export const startup = (): Promise<AppStartupState> =>
  AppStartup.Instance.getStateAsync();

/**
 * Retrieves the currently active application startup state.
 * @returns The current state of the app - see {@link AppStartupState} for possible values.
 */
export const state = () => AppStartup.Instance.state;
