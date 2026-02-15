/**
 * Type declarations for timeout-related error helpers.
 *
 * @module @compliance-theater/logger/timeout-error
 */

declare module '@compliance-theater/logger/timeout-error' {
  /**
   * Error type thrown for timeout conditions.
   *
   * @example
   * ```typescript
   * throw new TimeoutError('Request timed out after 5000ms');
   * ```
   */
  export class TimeoutError extends Error {
    /**
     * Creates a timeout error.
     *
     * @param message - Optional custom message. Defaults to `A timeout has occurred`.
     */
    constructor(message?: string);

    /**
     * Type guard for TimeoutError.
     *
     * @param error - Value to inspect.
     * @returns True when `error` is a TimeoutError instance.
     */
    static isTimeoutError(error: unknown): error is TimeoutError;
  }
}