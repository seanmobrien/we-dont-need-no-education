import { log, safeSerialize, LoggedError, singletonProviderFactory } from '@compliance-theater/logger';
import AfterManager from './index';
import {
  setState as setAppStartupState,
  state as getAppStartupState,
} from './app-startup-state';
import type { AppStartupState } from './app-startup-state';

/**
 * The state of the application startup process.
 * Can be one of:
 * - 'pending': The application startup process has not yet started.
 * - 'initializing': The application startup process is in progress.
 * - 'ready': The application startup process has completed successfully.
 * - 'teardown': The application startup process is in the process of being torn down.
 * - 'done': The application startup process has completed and is no longer active.
 */
export type { AppStartupState } from './app-startup-state';

/**
 * Type for an initialization function that can be registered with AppStartup.
 * These are executed during the initialization phase.
 */
export type InitializerFunction = () => Promise<void>;

/**
 * Type for a teardown function that can be registered with AppStartup.
 * These are executed during the teardown phase.
 */
export type TeardownFunction = () => Promise<void>;

/**
 * Configuration for discovering and loading initializers dynamically.
 */
export interface AppStartupConfig {
  /**
   * Array of module paths to check for initAppStartup exports.
   * Each module should export an `initAppStartup` function that returns Promise<void>.
   * 
  * Example: ['@compliance-theater/logger/errors/monitoring', '@/lib/ai']
   */
  initializerModules?: string[];

  /**
   * Direct initializer functions to run (in addition to discovered ones).
   */
  initializers?: InitializerFunction[];

  /**
   * Direct teardown functions to run.
   */
  teardownHandlers?: TeardownFunction[];

  /**
   * Singleton key for the AppStartup instance.
   * Defaults to '@noeducation/app-startup'
   */
  singletonKey?: string;
}

/**
 * Generic AppStartup class that manages application lifecycle.
 * Supports late-bound initializer loading to avoid circular dependencies.
 */
export class AppStartup {
  #pending: Promise<void> | undefined;
  #config: AppStartupConfig;
  #initializers: InitializerFunction[] = [];
  #teardownHandlers: TeardownFunction[] = [];

  constructor(config: AppStartupConfig = {}) {
    this.#config = config;
    setAppStartupState('pending');

    // Add direct initializers if provided
    if (config.initializers) {
      this.#initializers.push(...config.initializers);
    }

    // Add direct teardown handlers if provided
    if (config.teardownHandlers) {
      this.#teardownHandlers.push(...config.teardownHandlers);
    }
  }

  get state(): AppStartupState {
    return getAppStartupState();
  }

  getStateAsync(): Promise<AppStartupState> {
    return this.#pending
      ? this.#pending.then(() => getAppStartupState())
      : Promise.resolve(getAppStartupState());
  }

  /**
   * Dynamically discover and load initializers from configured modules.
   * Uses dynamic import and checks for 'initAppStartup' export.
   */
  async #discoverInitializers(): Promise<void> {
    if (!this.#config.initializerModules || this.#config.initializerModules.length === 0) {
      return;
    }

    for (const modulePath of this.#config.initializerModules) {
      try {
        // Use dynamic import with require to avoid circular dependencies
        const module = await import(modulePath);

        if (module && typeof module.initAppStartup === 'function') {
          this.#initializers.push(module.initAppStartup);
        }
      } catch (e) {
        // Log but don't fail - module may not be available in all environments
        log((l) =>
          l.debug(`Could not load initializer from ${modulePath}: ${safeSerialize(e)}`)
        );
      }
    }
  }

  /**
   * Initialize the application by running all registered initializers.
   * This includes both direct initializers and those discovered from modules.
   */
  initialize(): Promise<void> {
    // Guard against multiple initializations
    if (getAppStartupState() !== 'pending') {
      return this.#pending ?? Promise.resolve();
    }

    this.#pending = (async () => {
      setAppStartupState('initializing');
      try {
        // First, discover any late-bound initializers
        await this.#discoverInitializers();

        // Determine environment-specific initializers
        const isNodeEnv = typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs';

        // Run all initializers in parallel
        const allPendingInitializers = await Promise.allSettled(
          this.#initializers.map((init) => init())
        );

        // Check for failures
        const allFailed = allPendingInitializers
          .map((result, idx) =>
            result.status === 'rejected' ? this.#initializers[idx] : undefined
          )
          .filter(Boolean);

        if (allFailed && allFailed.length > 0) {
          throw new Error(
            `Failed to initialize one or more initializers: ${allFailed.length} failed`
          );
        }

        setAppStartupState('ready');
      } catch (e) {
        setAppStartupState('done');
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

  /**
   * Tear down the application by running all registered teardown handlers.
   */
  teardown(): Promise<void> {
    switch (getAppStartupState()) {
      case 'pending':
      case 'initializing':
        throw new Error('App startup is not ready to be torn down.');
      case 'ready':
        this.#pending = (async () => {
          setAppStartupState('teardown');
          try {
            // Run all teardown handlers in parallel
            await Promise.allSettled(
              this.#teardownHandlers.map((handler) => handler())
            );
            setAppStartupState('done');
          } catch (e) {
            log((l) =>
              l.error(`Failed to teardown app startup ${safeSerialize(e)}`)
            );
            setAppStartupState('done');
            throw e;
          } finally {
            this.#pending = undefined;
          }
        })();
        return this.#pending;
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

  /**
   * Create and register a singleton AppStartup instance.
   * 
   * @param config - Configuration for the AppStartup instance
   * @returns The singleton instance
   */
  static createInstance(config: AppStartupConfig = {}): AppStartup {
    const singletonKey = config.singletonKey || '@noeducation/app-startup';
    const singletonProvider = singletonProviderFactory();
    if (!singletonProvider) { throw new Error('Singleton provider is not available'); }
    return singletonProvider.getOrCreate(singletonKey, () => {
      const instance = new AppStartup(config);

      // Initialize app startup
      instance.initialize().then(() => {
        log((l) => l.info('App startup successfully completed.'));
      });

      // Subscribe to process exit to handle app state teardown
      AfterManager.processExit(() =>
        instance.teardown().catch((e) => {
          log((l) =>
            l.error(`Failed to teardown app state: ${safeSerialize(e)}`)
          );
          return;
        })
      );

      return instance;
    })! satisfies AppStartup;
  }
}

/**
 * Helper function to create a startup accessor for a configured instance.
 * 
 * @param config - Configuration for the AppStartup instance
 * @returns Functions to access the startup state
 */
export const createStartupAccessors = (config: AppStartupConfig = {}) => {
  const getInstance = () => singletonProviderFactory()?.getOrCreate(config.singletonKey || '@noeducation/app-startup', () => AppStartup.createInstance(config))!;

  return {
    /**
     * Get the current application startup state asynchronously.
     * @returns Promise that resolves to the current state
     */
    startup: (): Promise<AppStartupState> => getInstance().getStateAsync(),

    /**
     * Get the AppStartup instance.
     * @returns The singleton instance
     */
    getInstance,
  };
};
