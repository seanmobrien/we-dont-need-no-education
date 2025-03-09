/* eslint-disable @typescript-eslint/no-explicit-any */

import { ICancellablePromiseExt } from './_types';

const abortablePromise: unique symbol = Symbol('abortablePromise');

export type OperationCancelledError = Error & { [abortablePromise]: true };

export class AbortablePromise<T> implements ICancellablePromiseExt<T> {
  static isOperationCancelledError(e: unknown): e is OperationCancelledError {
    return (
      e instanceof Error &&
      abortablePromise in e &&
      e[abortablePromise] === true
    );
  }

  #promise: Promise<T>;
  readonly #isMe: symbol = Symbol('AbortablePromise');
  [Symbol.toStringTag]: string = this.#isMe.toString();
  [abortablePromise] = true;
  readonly #controller: AbortController;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      signal: AbortSignal
    ) => void
  ) {
    this.#controller = new AbortController();
    this.#promise = new Promise<T>((resolve, reject) => {
      this.#controller.signal.addEventListener('abort', () => {
        const error = new Error('Promise was cancelled', {
          cause: this.#isMe,
        }) as OperationCancelledError;
        error[abortablePromise] = true;
        reject(error);
      });
      executor(resolve, reject, this.#controller.signal);
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
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): ICancellablePromiseExt<TResult1 | TResult2> {
    this.#promise = this.#promise.then(onfulfilled, onrejected) as Promise<T>;
    return this as ICancellablePromiseExt<TResult1 | TResult2>;
  }
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): ICancellablePromiseExt<T | TResult> {
    this.#promise = this.#promise.catch(onrejected) as Promise<T>;
    return this as ICancellablePromiseExt<T | TResult>;
  }
  finally(
    onfinally?: (() => void) | null | undefined
  ): ICancellablePromiseExt<T> {
    this.#promise = this.#promise.finally(onfinally);
    return this;
  }
  cancel(): void {
    this.#controller.abort();
  }
  cancelled<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): ICancellablePromiseExt<T | TResult> {
    this.#promise = this.#promise.catch((e) =>
      this.isMyAbortError(e) ? onrejected?.(e) : Promise.reject(e)
    ) as Promise<T>;
    return this as ICancellablePromiseExt<T | TResult>;
  }

  get native(): Promise<T> {
    return this.#promise;
  }
}

/**
 * A type that represents a function which can take either a single input or an array of inputs,
 * and returns either a single output or an array of outputs respectively.
 *
 * @template TInput - The type of the input value(s).
 * @template TOutput - The type of the output value(s). Defaults to the same type as TInput.
 *
 * @param input - A single input value of type TInput.
 * @returns A single output value of type TOutput.
 *
 * @param input - An array of input values of type TInput.
 * @returns An array of output values of type TOutput.
 */
export type OneOrMany<TInput, TOutput = TInput> = {
  (input: TInput): TOutput;
  (input: Array<TInput>): Array<TOutput>;
};

export const forOneOrMany = <TInput, TOutput>(
  forOne: (input: TInput) => TOutput,
  input: TInput | Array<TInput>
): TInput extends Array<TInput> ? Array<TOutput> : TOutput => {
  if (Array.isArray(input)) {
    return input.map(forOne) as TInput extends Array<TInput>
      ? Array<TOutput>
      : TOutput;
  }
  return forOne(input) as TInput extends Array<TInput>
    ? Array<TOutput>
    : TOutput;
};
