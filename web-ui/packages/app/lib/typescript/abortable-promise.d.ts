/**
 * Type declarations for abortable promise implementation.
 *
 * This module provides a Promise implementation that supports cancellation through
 * the AbortController/AbortSignal pattern. Useful for managing long-running async
 * operations that may need to be cancelled.
 *
 * @module lib/typescript/abortable-promise
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '@/lib/typescript/abortable-promise' {
  import type { ICancellablePromiseExt } from '@/lib/typescript/_types';

  /**
   * Unique symbol identifying abortable promise instances and their errors.
   * Used as a brand to distinguish operation cancelled errors from other errors.
   */
  export const abortablePromise: unique symbol;

  /**
   * Error type thrown when an AbortablePromise is cancelled.
   * Tagged with the abortablePromise symbol for type-safe error handling.
   */
  export type OperationCancelledError = Error & { [abortablePromise]: true };

  /**
   * Promise implementation supporting cancellation via AbortController.
   *
   * AbortablePromise extends the standard Promise API with cancellation capabilities.
   * When cancelled, the promise rejects with an OperationCancelledError that can be
   * distinguished from other errors.
   *
   * Key features:
   * - **Cancellation**: Call cancel() to abort the operation
   * - **AbortSignal integration**: Executor receives an AbortSignal for cleanup
   * - **Type-safe error handling**: Distinguish cancellation from other errors
   * - **Chaining**: Supports then/catch/finally like standard promises
   * - **Specialized handlers**: Use cancelled() to handle only cancellation errors
   *
   * @template T - The type that the promise resolves to
   *
   * @example
   * ```typescript
   * const promise = new AbortablePromise<string>((resolve, reject, signal) => {
   *   const timeoutId = setTimeout(() => resolve('done'), 5000);
   *   signal.addEventListener('abort', () => {
   *     clearTimeout(timeoutId);
   *   });
   * });
   *
   * // Cancel after 1 second
   * setTimeout(() => promise.cancel(), 1000);
   *
   * promise
   *   .cancelled(() => console.log('Operation was cancelled'))
   *   .catch(err => console.error('Other error:', err));
   * ```
   */
  export class AbortablePromise<T> implements ICancellablePromiseExt<T> {
    /**
     * Type guard to check if an error is an OperationCancelledError.
     *
     * @param e - The error to check
     * @returns True if the error was caused by promise cancellation
     *
     * @example
     * ```typescript
     * try {
     *   await abortableOperation();
     * } catch (error) {
     *   if (AbortablePromise.isOperationCancelledError(error)) {
     *     console.log('User cancelled the operation');
     *   } else {
     *     console.error('Unexpected error:', error);
     *   }
     * }
     * ```
     */
    static isOperationCancelledError(e: unknown): e is OperationCancelledError;

    /**
     * Type guard to check if a value is an AbortablePromise instance.
     *
     * @template T - Expected resolution type
     * @param e - The value to check
     * @returns True if the value is an AbortablePromise
     *
     * @example
     * ```typescript
     * if (AbortablePromise.isAbortablePromise(promise)) {
     *   // Can safely call cancel()
     *   promise.cancel();
     * }
     * ```
     */
    static isAbortablePromise<T = unknown>(
      e: unknown,
    ): e is AbortablePromise<T>;

    /**
     * Creates a new AbortablePromise.
     *
     * @param executor - Function that initializes the promise. Receives resolve, reject,
     *                   and an AbortSignal that fires when cancel() is called.
     *
     * @example
     * ```typescript
     * const fetchWithCancel = new AbortablePromise<Response>((resolve, reject, signal) => {
     *   fetch(url, { signal })
     *     .then(resolve)
     *     .catch(reject);
     * });
     * ```
     */
    constructor(
      executor: (
        resolve: (value: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void,
        signal: AbortSignal,
      ) => void,
    );

    /**
     * Checks if an error was caused by cancelling this specific promise instance.
     *
     * @param e - The error to check
     * @returns True if the error is from this promise's cancellation
     *
     * @example
     * ```typescript
     * promise.catch(error => {
     *   if (promise.isMyAbortError(error)) {
     *     // This promise was cancelled
     *   }
     * });
     * ```
     */
    isMyAbortError(e: unknown): e is OperationCancelledError;

    /**
     * Registers callbacks for promise resolution and rejection.
     *
     * @template TResult1 - Type returned by fulfilled handler
     * @template TResult2 - Type returned by rejected handler
     * @param onfulfilled - Handler called when promise resolves
     * @param onrejected - Handler called when promise rejects
     * @returns A new AbortablePromise for chaining
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | null
        | undefined,
      onrejected?:
        | ((reason: any) => TResult2 | PromiseLike<TResult2>)
        | null
        | undefined,
    ): ICancellablePromiseExt<TResult1 | TResult2>;

    /**
     * Registers a callback for handling promise rejection.
     *
     * @template TResult - Type returned by the rejection handler
     * @param onrejected - Handler called when promise rejects
     * @returns A new AbortablePromise for chaining
     */
    catch<TResult = never>(
      onrejected?:
        | ((reason: any) => TResult | PromiseLike<TResult>)
        | null
        | undefined,
    ): ICancellablePromiseExt<T | TResult>;

    /**
     * Registers a callback to run after promise settles (resolved or rejected).
     *
     * @param onfinally - Handler called when promise completes
     * @returns A new AbortablePromise for chaining
     */
    finally(
      onfinally?: (() => void) | null | undefined,
    ): ICancellablePromiseExt<T>;

    /**
     * Cancels the promise, triggering the AbortSignal and rejecting with OperationCancelledError.
     *
     * @example
     * ```typescript
     * const operation = startLongRunningTask();
     * setTimeout(() => operation.cancel(), 5000); // Cancel after 5 seconds
     * ```
     */
    cancel(): void;

    /**
     * Registers a callback specifically for handling cancellation.
     * Only invoked if this promise is cancelled, not for other rejections.
     *
     * @template TResult - Type returned by the cancellation handler
     * @param onrejected - Handler called only when promise is cancelled
     * @returns A new AbortablePromise for chaining
     *
     * @example
     * ```typescript
     * promise
     *   .cancelled(() => {
     *     console.log('User cancelled');
     *     return 'Cancelled by user';
     *   })
     *   .catch(err => console.error('Real error:', err));
     * ```
     */
    cancelled<TResult = never>(
      onrejected?:
        | ((reason: any) => TResult | PromiseLike<TResult>)
        | null
        | undefined,
    ): ICancellablePromiseExt<T | TResult>;

    /**
     * The native awaitable promise object.
     * Use this to await the promise in contexts that don't support custom thenables.
     */
    readonly awaitable: Promise<T>;
  }
}
