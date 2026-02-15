/**
 * Timeout-related error type.
 *
 * Use this error for operations that exceed an allowed duration.
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? 'A timeout has occurred');
    this.name = 'TimeoutError';
    Error.captureStackTrace?.(this, TimeoutError);
  }

  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }
}