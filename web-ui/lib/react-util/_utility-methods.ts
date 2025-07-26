/**
 * @module _utility-methods
 *
 * A collection of utility methods for use in React applications.
 */

import { log } from "../logger";
import { LoggedError } from "./errors";


/**
 * Generates a unique identifier string.
 *
 * @returns {string} A unique identifier consisting of 7 alpha-numeric characters.
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Checks if the given value is an instance of the Error object.
 *
 * @param value - The value to check.
 * @returns True if the value is an Error object, otherwise false.
 */
export function isError(value: unknown): value is Error {
  return (
    !!value &&
    typeof value === 'object' &&
    (value instanceof Error ||
      ('message' in value && 'name' in value && 'stack' in value))
  );
}

/**
 * Checks if the given value is a DOMException with the name 'AbortError'.
 *
 * @param value - The value to check.
 * @returns True if the value is a DOMException with the name 'AbortError', otherwise false.
 */
export function isAbortError(value: unknown): value is Error {
  return value instanceof DOMException && value.name === 'AbortError';
}

/**
 * Type guard to check if a value is a TemplateStringsArray.
 *
 * @param value - The value to check.
 * @returns True if the value is a TemplateStringsArray, false otherwise.
 */
export function isTemplateStringsArray(
  value: unknown,
): value is TemplateStringsArray {
  return Array.isArray(value) && 'raw' in value;
}

/**
 * Determines if a given value is truthy.
 *
 * This function evaluates the provided value and returns a boolean indicating
 * whether the value is considered "truthy". If the value is `undefined` or `null`,
 * the function returns the specified default value.
 *
 * For string values, the function considers the following strings as truthy:
 * - "true"
 * - "1"
 * - "yes"
 * (case insensitive and trimmed)
 *
 * @param value - The value to evaluate.
 * @param defaultValue - The default boolean value to return if the value is `undefined` or `null`. Defaults to `false`.
 * @returns `true` if the value is considered truthy, otherwise `false`.
 */
export function isTruthy(
  value: unknown,
  defaultValue: boolean = false,
): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase();
    return (
      trimmedValue === 'true' ||
      trimmedValue === '1' ||
      trimmedValue === 'yes' ||
      trimmedValue === 'y'
    );
  } else if (Array.isArray(value)) {
    return value.length > 0;
    // If we have a completely empty object that's as good as false, and certainly not truthy
  } else if (typeof value === 'object' && Object.keys(value).length === 0) {
    return false;
  }
  return Boolean(value);
}

/**
 * Checks if the given value is an indexable record (aka object)
 *
 * @param check - The value to check.
 * @returns True if the value is an object, otherwise false.
 */
export function isRecord(check: unknown): check is Record<string, unknown> {
  return check !== null && typeof check === 'object';
}

/**
 * A unique symbol used for type branding.
 */
export const TypeBrandSymbol: unique symbol = Symbol('TypeBrandSymbol');

/**
 * Checks if the given value is type branded with the specified brand.
 *
 * @param check - The value to check.
 * @param brand - The brand symbol to check against.
 * @returns True if the value is type branded with the specified brand, otherwise false.
 */
export const isTypeBranded = <TResult>(
  check: unknown,
  brand: symbol,
): check is TResult =>
  typeof check === 'object' &&
  check !== null &&
  TypeBrandSymbol in check &&
  check[TypeBrandSymbol] === brand;

type CategorizedPromiseResult<T> = {
  fulfilled: Array<T>;
  rejected: Array<unknown>;
  pending: Array<Promise<T>>;
};

/**
 * Waits for all promises to settle and categorizes their results.
 *
 * @param promises - An array of promises to wait for.
 * @param timeoutMs - The timeout duration in milliseconds.
 * @returns An object categorizing the promises into fulfilled, rejected, and pending.
 */
export const getResolvedPromises = async <T>(
  promises: Promise<T>[],
  timeoutMs: number = 60 * 1000,
): Promise<CategorizedPromiseResult<T>> => {
  // Use a unique symbol to identify timeouts
  const TIMEOUT_SYMBOL = Symbol('timeout');

  // Race each promise against a timeout that RESOLVES with the symbol
  const racedPromises = promises.map((promise) =>
    Promise.race([
      promise,
      new Promise<typeof TIMEOUT_SYMBOL>((resolve) =>
        setTimeout(() => resolve(TIMEOUT_SYMBOL), timeoutMs),
      ),
    ]),
  );

  // Wait for all races to complete
  const results = await Promise.allSettled(racedPromises);

  // Categorize results with clear logic
  return results.reduce(
    (acc, result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value === TIMEOUT_SYMBOL) {
          // This promise timed out, still pending
          acc.pending.push(promises[index]);
        } else {
          // This promise resolved (even if value is null/undefined)
          acc.fulfilled.push(result.value);
        }
      } else {
        // This promise rejected
        acc.rejected.push(result.reason);
      }
      return acc;
    },
    { fulfilled: [], rejected: [], pending: [] } as CategorizedPromiseResult<T>,
  );
};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <R, T extends (...args: any[]) => R>(
  func: T,
  delay: number | { wait: number, timeout?: number },
): ((...args: Parameters<T>) =>  Promise<R>) & { cancel: () => void } => {

  const wait = typeof delay === 'number' ? delay : delay.wait;
  const timeout = typeof delay === 'object' && delay.timeout ? delay.timeout : 500;

  let timeoutId: NodeJS.Timeout | number | null = null;
  let maxDebounceTimeoutId: NodeJS.Timeout | null = null;
  let rejectPending: ((reason?: unknown) => void) | null = null;
  const cancelTimeout = (reason: string | unknown = '') => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxDebounceTimeoutId) {
      clearTimeout(maxDebounceTimeoutId);
      maxDebounceTimeoutId = null;
    }
    if (rejectPending) {
      if (reason !== '') {        
        rejectPending(reason);
      }
      rejectPending = null;
    }
  };
  const cb = (...args: Parameters<T>) => {
    // Cancel any existing timeout and pending rejection
    cancelTimeout('Deferred');
    const when = new Promise<R>((resolve, reject) => {
      rejectPending = reject;
      maxDebounceTimeoutId = setTimeout(() => cancelTimeout('Timeout'), wait + timeout);
      timeoutId = setTimeout(async () => {
        // Cancelling timeout w/out an error code will clean up the timeout timeout, etc
        try{
          timeoutId = null;
          const resolved = await func(...args);
          cancelTimeout();
          resolve(resolved);
        } catch (error) {
          cancelTimeout(error);
        }
      }, wait);
    });
    when.catch((reason) => {
      if (isError(reason)) {
        LoggedError.isTurtlesAllTheWayDownBaby(reason, {
          message: 'Debounced function failed',
          context: {
            functionName: func.name,
            args,
            wait,
          },
          log: true,
        });
      }else {
        log(l => l.silly('Debounced function timed out or was deferred:', reason));
      }
    });
    return when;
  };
  cb.cancel = () => {
    cancelTimeout('Cancelled');
  };
  return cb;
};
