import { log, safeSerialize } from "@compliance-theater/lib-logger";
import { TimeoutError } from "../react-util/errors/timeout-error";

export type AwaitedWithTimeout<T> = {
  value: Awaited<T>;
  timedOut?: false;
} | {
  timedOut: true;
  value?: undefined;
};

/**
   * Creates a timeout wrapper for async operations
   */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation?: string,
): Promise<AwaitedWithTimeout<T>> => {
  const OP_TIMEOUT: unique symbol = Symbol('OP_TIMEOUT');
  let resolved = false;
  return Promise.race([
    promise
      .catch((error) => {
        // If resolved = true then the timeout has already occurred and we need to 
        // log/suppress the error as the caller's promise has already been resolved
        if (resolved) {
          log(l => l.warn(`${operation ?? 'Operation'} threw an error after timeout expired.\n\tDetails: ${safeSerialize(error)}`));
          return OP_TIMEOUT as never;
        }
        throw error;
      }),
    new Promise<typeof OP_TIMEOUT>((resolve) => {
      setTimeout(() => {
        if (!resolved) {
          log(l => l.warn(`${operation ?? 'Operation'} timed out after ${timeoutMs}ms`));
        }
        resolved = true;
        resolve(OP_TIMEOUT);
      }, timeoutMs);
    }),
  ]).then(result => {
    // Set resolved to true so we know to suppress the initial promise if it fails
    resolved = true;
    // Return timeout result if we timed out
    if (typeof result === 'symbol' && result === OP_TIMEOUT) {
      return {
        timedOut: true as const,
      } as AwaitedWithTimeout<T>;
    }
    // Return the result otherwise
    return {
      value: result
    } as AwaitedWithTimeout<T>;
  });
};

/**
 * Creates a timeout wrapper for async operations that throws an error if the timeout is exceeded
 */
export const withTimeoutAsError = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation?: string,
): Promise<T> => {
  const result = await withTimeout(promise, timeoutMs, operation);
  if (result.timedOut) {
    throw new TimeoutError(`${operation ?? 'Operation'} timed out after ${timeoutMs}ms`);
  }
  return result.value;
};
