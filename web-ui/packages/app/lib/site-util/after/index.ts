import { log } from '@compliance-theater/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider/provider';

/**
 * Handler invoked by AfterManager queued operations.
 * The handler returns a promise which resolves when the cleanup work is complete.
 *
 * @template T - the resolved value type (defaults to void/unknown)
 */
type TAfterHandler<T = unknown | void> = () => Promise<T>;

/**
 * Webpack-safe singleton key using Symbol.for() to ensure uniqueness across all chunks.
 * This approach prevents module duplication issues where different webpack bundles
 * would otherwise create separate singleton instances.
 */
const AFTER_MANAGER_KEY = Symbol.for('@noeducation/after-manager-instance');

/**
 * Global registry interface using symbols for webpack-safe singleton access.
 * Symbols created with Symbol.for() are globally registered and shared across
 * all webpack chunks, preventing duplicate singleton instances.
 */

export default class AfterManager {
  /** Default timeout (ms) for waiting on registered handlers to complete */
  static readonly #TIMEOUT = 7500;

  /** Internal singleton accessor stored on SingletonProvider to survive reloads */
  static get #instance(): AfterManager | undefined {
    return SingletonProvider.Instance.get<
      AfterManager,
      typeof AFTER_MANAGER_KEY
    >(AFTER_MANAGER_KEY);
  }

  static set #instance(value: AfterManager | undefined) {
    if (value === undefined) {
      SingletonProvider.Instance.delete(AFTER_MANAGER_KEY);
    } else {
      SingletonProvider.Instance.set(AFTER_MANAGER_KEY, value);
    }
  }

  /**
   * Function provided by the `prexit` module to register a process-exit handler.
   * Stored so we only load prexit lazily once.
   */
  static #prexit: ((cb: () => Promise<void>) => void) | undefined;

  /** Unique brand symbol used for internal timeout marker objects */
  static readonly #brand: unique symbol = Symbol('AfterManager brand');

  /** Internal teardown handler that will be placed on the 'teardown' queue by default. */
  static async #innerTeardown(): Promise<void> {
    // TODO: cleanup any registered prexit subs
  }

  /**
   * Type-guard to determine whether a value has been branded by this manager.
   * Branded values are used internally to indicate timeout sentinel values.
   *
   * @template T
   * @param check - value to test
   * @returns true when the value has the manager brand
   */
  static isBranded<T>(check: T): check is T & { __brand: symbol } {
    const c = check as { __brand: symbol } | undefined;
    return !!c && c.__brand === AfterManager.#brand;
  }

  /**
   * Mark a value as branded by this manager. Used to create timeout sentinel objects.
   *
   * @template T
   * @param check - value to brand (mutates the object)
   * @returns the same value typed as branded
   */
  static asBranded<T>(check: T): T & { __brand: symbol } {
    if (!AfterManager.isBranded(check)) {
      (check as { __brand: symbol }).__brand = AfterManager.#brand;
    }
    return check as T & { __brand: symbol };
  }

  /** Map of queue name => array of handlers. Handlers are executed in registration order. */
  readonly #queues: Map<string, Array<TAfterHandler<void>>>;

  /**
   * Private constructor. Use `AfterManager.getInstance()` to obtain the singleton.
   * The manager registers a default teardown handler to allow centralized cleanup.
   */
  private constructor() {
    this.#queues = new Map();
    this.add('teardown', AfterManager.#innerTeardown);
  }

  /**
   * Start background wiring such as registering process-exit handlers via `prexit`.
   * This is invoked lazily when the singleton is first created.
   *
   * @private
   */
  async #start(): Promise<void> {
    AfterManager.asBranded(AfterManager.#teardown);
    if (!AfterManager.#prexit) {
      try {
        const instance = (await import('prexit')).default;
        if (!instance) {
          throw new Error('Unable to load prexit');
        }
        if (!AfterManager.#prexit) {
          AfterManager.#prexit = instance;
          AfterManager.#prexit(AfterManager.#teardown);
        }
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'AfterManager::start',
        });
      }
    }
  }

  /**
   * Register a handler for the named queue.
   * If the handler is already registered for that queue this is a no-op and returns false.
   *
   * @param queueName - logical queue name (e.g. 'teardown')
   * @param handler - async handler to invoke when the queue is signalled
   * @returns true when the handler was added, false when it was already present
   */
  public add(queueName: string, handler: TAfterHandler<void>): boolean {
    const queue = this.queue(queueName, true)!;
    if (!queue.includes(handler)) {
      queue.push(handler);
      return true;
    }
    return false;
  }

  /**
   * Remove a previously registered handler from a queue.
   *
   * @param queueName - the queue name
   * @param handler - the handler to remove
   * @returns true when the handler was removed
   */
  public remove(queueName: string, handler: TAfterHandler<void>): boolean {
    const q = this.queue(queueName);
    const index = q?.indexOf(handler);
    if (typeof index === 'number' && index !== -1) {
      q.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Overloaded accessor for a queue's handlers.
   * When `create` is true the queue is created if missing. Returned arrays are shallow copies
   * to prevent callers from mutating internal arrays.
   */
  public queue(queueName: string): Array<TAfterHandler<void>>;
  public queue(queueName: string, create: true): Array<TAfterHandler<void>>;
  public queue(
    queueName: string,
    create: false
  ): undefined | Array<TAfterHandler<void>>;
  public queue(
    queueName: string,
    create: boolean = false
  ): undefined | Array<TAfterHandler<void>> {
    if (!this.#queues.has(queueName) && create) {
      const newQueue = [] as Array<TAfterHandler<void>>;
      this.#queues.set(queueName, newQueue);
      return [...newQueue];
    }
    const q = this.#queues.get(queueName);
    if (q) {
      return [...q];
    }
    return undefined;
  }

  /**
   * Internal teardown entrypoint registered with prexit. Signals the 'teardown' queue.
   *
   * @private
   */
  static async #teardown(): Promise<void> {
    const myInstance = AfterManager.#instance;
    if (myInstance) {
      await myInstance.signal('teardown');
    }
  }

  /**
   * Get the process-global AfterManager singleton. The instance is lazily created and started.
   *
   * @returns the singleton AfterManager
   */
  public static getInstance(): AfterManager {
    if (!AfterManager.#instance) {
      AfterManager.#instance = new AfterManager();
      AfterManager.#instance.#start();
    }
    return AfterManager.#instance;
  }

  /**
   * Signal a queue by name, waiting for all registered handlers to complete or until a timeout.
   * Returns a promise that resolves when processing completes or when the timeout occurs.
   *
   * @param signalName - name of the queue to signal
   */
  public async signal(signalName: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const handlers = this.queue(signalName, false);
        if (!handlers) {
          return resolve();
        }
        const promises = handlers.map((handler) => handler());
        const completed = await Promise.race([
          Promise.all(promises),
          new Promise((resolve) =>
            setTimeout(() => {
              const timedOut = { __brand: AfterManager.#brand } as unknown as {
                __brand: symbol;
              };
              resolve(timedOut);
            }, AfterManager.#TIMEOUT)
          ), // Timeout after
        ]);
        // Completed can be either the result array from Promise.all or our timeout sentinel.
        const maybeBranded = completed as unknown;
        let isBrandedObj = false;
        if (
          typeof maybeBranded === 'object' &&
          maybeBranded !== null &&
          '__brand' in (maybeBranded as Record<string, unknown>)
        ) {
          const objBrand = (maybeBranded as Record<string, unknown>).__brand;
          isBrandedObj =
            typeof objBrand === 'symbol' && objBrand === AfterManager.#brand;
        }
        let isBrandedArray = false;
        if (
          Array.isArray(maybeBranded) &&
          (maybeBranded as Array<unknown>).length > 0
        ) {
          const first = (maybeBranded as Array<unknown>)[0];
          if (
            typeof first === 'object' &&
            first !== null &&
            '__brand' in (first as Record<string, unknown>)
          ) {
            const arrBrand = (first as Record<string, unknown>).__brand;
            isBrandedArray =
              typeof arrBrand === 'symbol' && arrBrand === AfterManager.#brand;
          }
        }
        if (isBrandedObj || isBrandedArray) {
          log((l) =>
            l.warn(
              `AfterManager ${signalName} timed out before all registered callbacks completed`
            )
          );
          return resolve();
        }
      } catch (error) {
        return reject(
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: `AfterManager signal ${signalName}`,
          })
        );
      }
      resolve(); // Replace with actual resolution logic
    });
  }

  /**
   * Helper for process exit integration.
   *
   * When called with a callback the callback is registered on the 'teardown' queue.
   * When called with no args the current number of teardown handlers is returned.
   */
  public static processExit(): number;
  public static processExit(cb: () => Promise<void>): void;
  public static processExit(cb?: () => Promise<void>): number | void {
    if (cb) {
      AfterManager.getInstance().add('teardown', cb);
    } else {
      return AfterManager.getInstance().queue('teardown')?.length ?? 0;
    }
  }
}
