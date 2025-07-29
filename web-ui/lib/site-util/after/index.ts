import { log } from "@/lib/logger";
import { LoggedError } from "@/lib/react-util";

type TAfterHandler<T = unknown | void> = () => Promise<T>;

export default class AfterManager {
  static readonly #TIMEOUT = 7500;
  static #instance: AfterManager | undefined;
  static readonly #brand: unique symbol = Symbol('AfterManager brand');
  static async #innerTeardown(): Promise<void> {
    // TODO: cleanup any registered prexit subs
  }
  static isBranded<T>(check: T): check is T & { __brand: symbol } {
    const c = check as { __brand: symbol };
    return !!c && c.__brand === AfterManager.#brand;
  }
  static asBranded<T>(check: T): T & { __brand: symbol } {
    if (!AfterManager.isBranded(check)) {
      (check as { __brand: symbol }).__brand = AfterManager.#brand;
    }
    return check as T & { __brand: symbol };
  }

  readonly #queues: Map<string, Array<TAfterHandler<void>>>;
  #prexit: unknown;
  private constructor() {
    this.#queues = new Map();
    this.add('teardown', AfterManager.#innerTeardown);
  }
  async #start(): Promise<void> {
    AfterManager.asBranded(AfterManager.#teardown);
    import('prexit')
      .then((x) => x.default)
      .then((prexit) => {
        this.#prexit = prexit;
        prexit(AfterManager.#teardown);
      });
  }
  public add(queueName: string, handler: TAfterHandler<void>): boolean {
    const queue = this.queue(queueName, true);
    if (!queue.includes(handler)) {
      queue.push(handler);
      return true;
    }
    return false;
  }
  public remove(queueName: string, handler: TAfterHandler<void>): boolean {
    const q = this.queue(queueName);
    const index = q?.indexOf(handler);
    if (typeof index === 'number' && index !== -1) {
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
    return new Promise(async (resolve, reject) => {
      try {
        const handlers = this.queue(signalName, false);
        if (!handlers) {
          return;
        }
        const promises = handlers.map((handler) => handler());
        const completed = await Promise.race([
          Promise.all(promises),
          new Promise((resolve) =>
            setTimeout(() => {
              const timedOut = { __brand: AfterManager.#brand };
              resolve(timedOut);
            }, AfterManager.#TIMEOUT),
          ), // Timeout after
        ]);
        if (
          typeof completed === 'object' &&
          !!completed &&
          (('__brand' in completed &&
            completed.__brand === AfterManager.#brand) ||
            (Array.isArray(completed) &&
              typeof completed[0] === 'object' &&
              completed[0].__brand === AfterManager.#brand))
        ) {
          log((l) =>
            l.warn(
              `AfterManager ${signalName} timed out before all registered callbacks completed`,
            ),
          );
          resolve();
        }
      } catch (error) {
        reject(
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: `AfterManager signal ${signalName}`,
          }),
        );
      }
      console.log(`Signal received: ${signalName}`);
      resolve(); // Replace with actual resolution logic
    });
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