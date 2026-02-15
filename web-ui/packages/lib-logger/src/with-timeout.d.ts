/**
 * Type declarations for timeout wrapper utilities.
 *
 * @module @compliance-theater/logger/with-timeout
 */

declare module '@compliance-theater/logger/with-timeout' {
  /**
   * Result envelope returned by `withTimeout`.
   *
   * - When timed out: `timedOut` is true and `value` is undefined.
   * - When completed: `value` contains the resolved result and `timedOut` is false/omitted.
   */
  export type AwaitedWithTimeout<T> =
    | {
        value: Awaited<T>;
        timedOut?: false;
      }
    | {
        timedOut: true;
        value?: undefined;
      };

  /**
   * Races an operation against a timeout and returns a structured result.
   *
   * @template T - Promise resolution type.
   * @param promise - Operation promise to race.
   * @param timeoutMs - Timeout duration in milliseconds.
   * @param operation - Optional operation name included in timeout logs.
   * @returns A result indicating timeout state and (when available) the resolved value.
   */
  export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation?: string,
  ): Promise<AwaitedWithTimeout<T>>;

  /**
   * Races an operation against a timeout and throws `TimeoutError` if exceeded.
   *
   * @template T - Promise resolution type.
   * @param promise - Operation promise to race.
   * @param timeoutMs - Timeout duration in milliseconds.
   * @param operation - Optional operation name included in the thrown message.
   * @returns The resolved operation value.
   * @throws TimeoutError when timeout is exceeded.
   */
  export function withTimeoutAsError<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation?: string,
  ): Promise<T>;
}