import { ICancellablePromiseExt } from './_types';

export const abortablePromise: unique symbol = Symbol('abortablePromise');

export type OperationCancelledError = Error & { [abortablePromise]: true };

export class AbortablePromise<T> implements ICancellablePromiseExt<T> {
  static isOperationCancelledError(e: unknown): e is OperationCancelledError {
    return (
      e instanceof Error &&
      abortablePromise in e &&
      e[abortablePromise] === true
    );
  }
  static isAbortablePromise<T = unknown>(e: unknown): e is AbortablePromise<T> {
    return e instanceof AbortablePromise;
  }

  #promise: Promise<T>;
  readonly #isMe: symbol = Symbol('AbortablePromise');
  [Symbol.toStringTag]: string = this.#isMe.toString();
  [abortablePromise] = true;
  readonly #controller: AbortController;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (reason?: any) => void,
      signal: AbortSignal,
    ) => void,
  ) {
    const controller = new AbortController();
    this.#controller = controller;
    let onAbortCallback: (() => void) | undefined;
    let settled = false;

    this.#promise = new Promise<T>((resolve, reject) => {
      const wrappedResolve = (value: T | PromiseLike<T>) => {
        settled = true;
        resolve(value);
      };
      const wrappedReject = (reason?: any) => {
        settled = true;
        reject(reason);
      };

      onAbortCallback = () => {
        if (!settled) {
          const error = new Error('Promise was cancelled', {
            cause: this.#isMe,
          }) as OperationCancelledError;
          error[abortablePromise] = true;
          wrappedReject(error);
        }
      };
      controller.signal.addEventListener('abort', onAbortCallback);
      executor(wrappedResolve, wrappedReject, controller.signal);
    }).finally(() => {
      if (onAbortCallback) {
        controller.signal.removeEventListener('abort', onAbortCallback);
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
    ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): ICancellablePromiseExt<TResult1 | TResult2> {
    this.#promise = this.#promise.then(onfulfilled, onrejected) as Promise<T>;
    return this as ICancellablePromiseExt<TResult1 | TResult2>;
  }

  catch<TResult = never>(
    onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined,
  ): ICancellablePromiseExt<T | TResult> {
    // Don't catch cancellation errors - those should only be handled by cancelled()
    this.#promise = this.#promise.catch((e) => {
      if (this.isMyAbortError(e)) {
        return Promise.reject(e);
      }
      return onrejected?.(e);
    }) as Promise<T>;
    return this as ICancellablePromiseExt<T | TResult>;
  }

  finally(
    onfinally?: (() => void) | null | undefined,
  ): ICancellablePromiseExt<T> {
    this.#promise = this.#promise.finally(onfinally);
    return this;
  }

  cancel(): void {
    this.#controller.abort();
  }

  cancelled<TResult = never>(
    onrejected?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined,
  ): ICancellablePromiseExt<T | TResult> {
    this.#promise = this.#promise.catch((e) => {
      if (this.isMyAbortError(e)) {
        return onrejected ? onrejected(e) : Promise.reject(e);
      }
      return Promise.reject(e);
    }) as Promise<T>;
    return this as ICancellablePromiseExt<T | TResult>;
  }

  get awaitable(): Promise<T> {
    return this.#promise;
  }
}
