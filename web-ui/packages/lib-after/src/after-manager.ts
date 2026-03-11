import { log, LoggedError, singletonProviderFactory } from '@compliance-theater/logger';
import type { IAfterManager, TAfterHandler } from '@compliance-theater/types/after';

const AFTER_MANAGER_KEY = Symbol.for('@noeducation/after-manager-instance');

export default class AfterManager implements IAfterManager {
  static readonly #TIMEOUT = 7500;

  static get #instance(): AfterManager | undefined {
    const singletonProvider = singletonProviderFactory();
    if (!singletonProvider) {
      throw new Error('Singleton provider is not available');
    }
    return singletonProvider.get<
      AfterManager,
      typeof AFTER_MANAGER_KEY
    >(AFTER_MANAGER_KEY);
  }

  static set #instance(value: AfterManager | undefined) {
    const singletonProvider = singletonProviderFactory();
    if (!singletonProvider) {
      throw new Error('Singleton provider is not available');
    }
    if (value === undefined) {
      singletonProvider.delete(AFTER_MANAGER_KEY);
    } else {
      singletonProvider.set(AFTER_MANAGER_KEY, value);
    }
  }

  static #prexit: ((cb: () => Promise<void>) => void) | undefined;

  static readonly #brand: unique symbol = Symbol('AfterManager brand');

  static async #innerTeardown(): Promise<void> {
    // TODO: cleanup any registered prexit subs
  }

  static isBranded<T>(check: T): check is T & { __brand: symbol } {
    const c = check as { __brand: symbol } | undefined;
    return !!c && c.__brand === AfterManager.#brand;
  }

  static asBranded<T>(check: T): T & { __brand: symbol } {
    if (!AfterManager.isBranded(check)) {
      (check as { __brand: symbol }).__brand = AfterManager.#brand;
    }
    return check as T & { __brand: symbol };
  }

  readonly #queues: Map<string, Array<TAfterHandler<void>>>;

  private constructor() {
    this.#queues = new Map();
    this.add('teardown', AfterManager.#innerTeardown);
  }

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
          instance(AfterManager.#teardown);
        }
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'AfterManager::start',
        });
      }
    }
  }

  public add(queueName: string, handler: TAfterHandler<void>): boolean {
    let queue = this.#queues.get(queueName);
    if (!queue) {
      queue = [];
      this.#queues.set(queueName, queue);
    }
    if (!queue.includes(handler)) {
      queue.push(handler);
      return true;
    }
    return false;
  }

  public remove(queueName: string, handler: TAfterHandler<void>): boolean {
    const q = this.#queues.get(queueName);
    if (!q) {
      return false;
    }
    const index = q.indexOf(handler);
    if (index !== -1) {
      q.splice(index, 1);
      return true;
    }
    return false;
  }

  public queue(queueName: string): Array<TAfterHandler<void>>;
  public queue(queueName: string, create: true): Array<TAfterHandler<void>>;
  public queue(
    queueName: string,
    create: false,
  ): undefined | Array<TAfterHandler<void>>;
  public queue(
    queueName: string,
    create: boolean = false,
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

  static async #teardown(): Promise<void> {
    const myInstance = AfterManager.#instance;
    if (myInstance) {
      await myInstance.signal('teardown');
    }
  }

  public static getInstance(): AfterManager {
    if (!AfterManager.#instance) {
      AfterManager.#instance = new AfterManager();
      AfterManager.#instance.#start();
    }
    return AfterManager.#instance;
  }

  public async signal(signalName: string): Promise<void> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const queueHandlers = this.#queues.get(signalName);
      if (!queueHandlers) {
        return;
      }
      const promises = queueHandlers.map((handler) => handler());
      const completed = await Promise.race([
        Promise.all(promises),
        new Promise((resolve) => {
          timeoutHandle = setTimeout(() => {
            const timedOut = { __brand: AfterManager.#brand } as unknown as {
              __brand: symbol;
            };
            resolve(timedOut);
          }, AfterManager.#TIMEOUT);
          timeoutHandle.unref?.();
        }),
      ]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
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
            `AfterManager ${signalName} timed out before all registered callbacks completed`,
          ),
        );
      }
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: `AfterManager signal ${signalName}`,
      });
    }
  }

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
