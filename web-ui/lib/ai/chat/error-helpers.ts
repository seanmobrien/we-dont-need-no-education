import { APICallError } from 'ai';
import { isError } from '/lib/react-util/utility-methods';
import type { RetryErrorInfo } from './types';

/**
 * Extracts retry-related error information from a given error object.
 *
 * This function inspects the provided error and attempts to determine if it is a retryable API call error,
 * specifically checking for HTTP 429 (Too Many Requests) errors and extracting the `Retry-After` header if present.
 * It recursively traverses nested error properties (`cause`, `lastError`, `error`) to find retryable errors.
 *
 * @param error - The error object to inspect. Can be of any type.
 * @returns A `RetryErrorInfo` object containing details about whether the error is retryable,
 *          the retry delay (if applicable), and the original error. If the input is not an error,
 *          returns an object indicating no error information is available.
 */
export const getRetryErrorInfo = (
  error: unknown,
): RetryErrorInfo | undefined => {
  // Absolutely must be an error to have retry error info
  if (isError(error)) {
    // Also really need to be an APICallError
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 429) {
        if (error.responseHeaders) {
          const retryAfterHeader = parseInt(
            error.responseHeaders['retry-after'] ?? '60',
          );
          const retryAfter = isNaN(retryAfterHeader) ? 60 : retryAfterHeader;
          return {
            isError: true,
            isRetry: true,
            error,
            retryAfter,
          };
        }
      }
    }
    // If not, there's a chance we have an error nested inside us
    if (error.cause) {
      const cause = getRetryErrorInfo(error.cause);
      if (cause?.isRetry) {
        return cause;
      }
    }
    if ('lastError' in error) {
      const lastError = getRetryErrorInfo(error.lastError);
      if (lastError?.isRetry) {
        return lastError;
      }
    }
    if ('error' in error) {
      const errorInfo = getRetryErrorInfo(error.error);
      if (errorInfo?.isRetry) {
        return errorInfo;
      }
    }
    // Otherwise, we're just a boring old error
    return {
      isError: true,
      isRetry: false,
      error,
    };
  }
  // The only way we could possibly be a retry from here is if we are a non-null / undefined value with a child property named 'error'.
  if (error && typeof error === 'object' && 'error' in error) {
    const errorInfo = getRetryErrorInfo(error.error);
    if (errorInfo?.isError || errorInfo?.isRetry) {
      return errorInfo;
    }
  }
  // If we get here, we have no retry error info or error info at all
  return {
    isError: false,
  };
};
