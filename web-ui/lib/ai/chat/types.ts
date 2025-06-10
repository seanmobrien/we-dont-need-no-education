/**
 * Represents information about an error that may occur during a retryable operation.
 *
 * This type is a discriminated union that describes the state of an operation
 * with respect to errors and retry logic.
 *
 * - If `isError` is `false`, the input was not an error object and no retry or failure information is available.
 * - If `isError` is `true`, additional properties indicate whether a retry is possible,
 *   the error details, and the recommended retry delay.
 *
 * Variants:
 * - No error:
 *   - `isError: false`
 *   - `isRetry: never`
 *   - `error: never`
 *   - `retryAfter: never`
 * - Error with retry:
 *   - `isError: true`
 *   - `isRetry: true`
 *   - `error: APICallError`
 *   - `retryAfter: number` (milliseconds to wait before retrying)
 * - Error without retry:
 *   - `isError: true`
 *   - `isRetry: false`
 *   - `error: Error | APICallError`
 *   - `retryAfter: never`
 * - Generic error state (optional retry):
 *   - `isError: boolean`
 *   - `isRetry?: boolean`
 *   - `error?: APICallError | Error`
 *   - `retryAfter?: number`
 */
import { APICallError } from 'ai';

export type RetryErrorInfo =
  | {
      isError: boolean;
      isRetry?: boolean;
      error?: APICallError | Error;
      retryAfter?: number;
    }
  | {
      isError: false;
      isRetry: never;
      error?: never;
      retryAfter?: never;
    }
  | {
      isError: true;
      isRetry: true;
      error: APICallError;
      retryAfter: number;
    }
  | {
      isError: true;
      isRetry: false;
      error?: Error | APICallError;
      retryAfter?: never;
    };
