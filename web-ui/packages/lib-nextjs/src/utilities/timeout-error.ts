/**
 * TimeoutError class for timeout-related errors
 * Copied from react-util to avoid circular dependency
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? 'A timeout has occurred');
    this.name = 'TimeoutError';
    // Don't use getStackTrace to avoid circular dependency
    Error.captureStackTrace?.(this, TimeoutError);
  }

  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }
}
