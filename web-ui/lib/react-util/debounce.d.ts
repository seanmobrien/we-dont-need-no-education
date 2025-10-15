/**
 * @fileoverview Debounce utility function with timeout and cancellation support.
 * @module debounce
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'lib/react-util/debounce' {
  /**
   * Debounced function with cancellation capability.
   */
  export type DebouncedFunction<R, T extends (...args: any[]) => R> = ((
    ...args: Parameters<T>
  ) => Promise<R>) & { cancel: () => void };

  /**
   * Creates a debounced version of a function that delays invoking the function until after
   * the specified wait time has elapsed since the last time it was invoked. The debounced
   * function also includes a cancel method to abort pending invocations.
   *
   * The debounced function returns a Promise that resolves with the result of the original
   * function, or rejects if the invocation is cancelled, times out, or is deferred by a
   * new invocation.
   *
   * @template R - The return type of the function
   * @template T - The function type being debounced
   *
   * @param func - The function to debounce
   * @param delay - Either a number representing the wait time in milliseconds, or an object
   *                with `wait` (required) and optional `timeout` properties. If timeout is
   *                specified, the debounced function will reject after wait + timeout ms.
   *
   * @returns A debounced version of the function that returns a Promise and includes a
   *          `cancel()` method to abort pending invocations.
   *
   * @example
   * ```typescript
   * // Basic debouncing
   * const debouncedSearch = debounce(searchAPI, 300);
   * debouncedSearch('query').then(results => console.log(results));
   *
   * // With timeout
   * const debouncedSave = debounce(saveData, { wait: 500, timeout: 2000 });
   * debouncedSave(data).then(() => console.log('Saved!'));
   *
   * // Cancelling pending invocations
   * const debouncedUpdate = debounce(updateUser, 1000);
   * debouncedUpdate(userData).catch(err => console.log('Cancelled'));
   * debouncedUpdate.cancel(); // Cancels the pending invocation
   * ```
   */
  export function debounce<R, T extends (...args: any[]) => R>(
    func: T,
    delay: number | { wait: number; timeout?: number },
  ): DebouncedFunction<R, T>;
}
