import { ICancellablePromiseExt } from "./types";

export const abortablePromise: unique symbol = Symbol("abortablePromise");
const chainInitToken: unique symbol = Symbol("chainInit");

export type OperationCancelledError = Error & { [abortablePromise]: true };
type AbortablePromiseExecutor<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void,
  signal: AbortSignal
) => void;
type ChainInit<T> = {
  [chainInitToken]: true;
  promise: Promise<T>;
  controller: AbortController;
  isMe: symbol;
  toStringTag: string;
};

const noopExecutor: AbortablePromiseExecutor<unknown> = () => {};

export class AbortablePromise<T> implements ICancellablePromiseExt<T> {
  static #cancelledErrors = new WeakSet<Error>();

  static isOperationCancelledError(e: unknown): e is OperationCancelledError {
    return e instanceof Error && AbortablePromise.#cancelledErrors.has(e);
  }
  static isAbortablePromise<T = unknown>(e: unknown): e is AbortablePromise<T> {
    return e instanceof AbortablePromise;
  }

  #promise!: Promise<T>;
  #isMe!: symbol;
  [Symbol.toStringTag]!: string;
  [abortablePromise] = true;
  #controller!: AbortController;

  #chain<TNext>(promise: Promise<TNext>): AbortablePromise<TNext> {
    return new AbortablePromise<TNext>(
      noopExecutor as AbortablePromiseExecutor<TNext>,
      {
        [chainInitToken]: true,
        promise,
        controller: this.#controller,
        isMe: this.#isMe,
        toStringTag: this[Symbol.toStringTag],
      }
    );
  }

  constructor(
    executor: AbortablePromiseExecutor<T>,
    chainInit?: ChainInit<T>
  ) {
    if (chainInit?.[chainInitToken]) {
      this.#promise = chainInit.promise;
      this.#controller = chainInit.controller;
      this.#isMe = chainInit.isMe;
      this[Symbol.toStringTag] = chainInit.toStringTag;
      this[abortablePromise] = true;
      return;
    }

    this.#isMe = Symbol("AbortablePromise");
    this[Symbol.toStringTag] = this.#isMe.toString();

    const controllerValue = new AbortController();
    this.#controller = controllerValue;
    let onAbortCallback: (() => void) | undefined;
    let settled = false;

    this.#promise = new Promise<T>((resolve, reject) => {
      const wrappedResolve = (value: T | PromiseLike<T>) => {
        settled = true;
        resolve(value);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrappedReject = (reason?: any) => {
        settled = true;
        reject(reason);
      };

      onAbortCallback = () => {
        if (!settled) {
          const error = new Error("Promise was cancelled", {
            cause: this.#isMe,
          }) as OperationCancelledError;
          error[abortablePromise] = true;
          AbortablePromise.#cancelledErrors.add(error);
          wrappedReject(error);
        }
      };
      controllerValue.signal.addEventListener("abort", onAbortCallback);
      executor(wrappedResolve, wrappedReject, controllerValue.signal);
    }).finally(() => {
      if (onAbortCallback) {
        controllerValue.signal.removeEventListener("abort", onAbortCallback);
        onAbortCallback = undefined;
      }
    });
  }

  isMyAbortError(e: unknown): e is OperationCancelledError {
    return (
      AbortablePromise.isOperationCancelledError(e) && e.cause === this.#isMe
    );
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): ICancellablePromiseExt<TResult1 | TResult2> {
    const nextPromise = this.#promise.then(onfulfilled, (e) => {
      if (this.isMyAbortError(e)) {
        return Promise.reject(e);
      }
      if (!onrejected) {
        return Promise.reject(e);
      }
      return onrejected(e);
    });
    return this.#chain(nextPromise);
  }

  catch<TResult = never>(
    onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
  ): ICancellablePromiseExt<T | TResult> {
    // Don't catch cancellation errors - those should only be handled by cancelled()
    const nextPromise = this.#promise.catch((e) => {
      if (this.isMyAbortError(e)) {
        return Promise.reject(e);
      }
      if (!onrejected) {
        return Promise.reject(e);
      }
      return onrejected(e);
    });
    return this.#chain(nextPromise);
  }

  finally(
    onfinally?: (() => void) | null | undefined
  ): ICancellablePromiseExt<T> {
    return this.#chain(this.#promise.finally(onfinally));
  }

  cancel(): void {
    this.#controller.abort();
  }

  cancelled<TResult = never>(
    onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
  ): ICancellablePromiseExt<T | TResult> {
    const nextPromise = this.#promise.catch((e) => {
      if (this.isMyAbortError(e)) {
        return onrejected ? onrejected(e) : Promise.reject(e);
      }
      return Promise.reject(e);
    });
    return this.#chain(nextPromise);
  }

  get awaitable(): Promise<T> {
    return this.#promise;
  }
}
