import { UnionToTuple } from './_types';
import { AbortablePromise } from './abortable-promise';

/**
 * Checks if the given error is an operation cancelled error.
 *
 * This function is a reference to `AbortablePromise.isOperationCancelledError`.
 * It can be used to determine if an error was caused by an operation being cancelled.
 *
 * @param error - The error to check.
 * @returns `true` if the error is an operation cancelled error, otherwise `false`.
 */
export const isOperationCancelledError =
  AbortablePromise.isOperationCancelledError;

/**
 * Checks if the given object is an instance of `AbortablePromise`.
 *
 * This function is a type guard that determines whether the provided
 * object is an `AbortablePromise`. It can be used to ensure that
 * certain operations are only performed on objects that are
 * `AbortablePromise` instances.
 *
 * @param obj - The object to check.
 * @returns `true` if the object is an `AbortablePromise`, otherwise `false`.
 */
export const isAbortablePromise = AbortablePromise.isAbortablePromise;

interface IsKeyOfGuard {
  // When called with a readonly array/tuple of literal keys, narrow the key to that array's element type
  <T extends readonly (string | number | symbol)[]>(
    key: unknown,
    check: T,
  ): key is T[number];
  // Allow calling with no second argument or an explicit undefined/null to check only the key shape
  <T extends object>(key: unknown, check?: undefined | null): key is keyof T;
  <T extends object>(key: unknown): key is keyof T;
  <T extends object>(key: unknown, check: T): key is keyof T;
}

/**
 * Determines if a value is a key of a given type.
 * @param key - The value to check.
 * @returns True if the value is a key of the given type, false otherwise.
 */
export const isKeyOf: IsKeyOfGuard = (
  key: unknown,
  check?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): key is any => {
  if (check === undefined || check === null) {
    return false;
  }
  if (
    typeof key === 'string' ||
    typeof key === 'number' ||
    typeof key === 'symbol'
  ) {
    if (Array.isArray(check)) {
      // runtime: check if any element equals the key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (check as any[]).some((v) => v === key);
    }
    if (check && typeof check === 'object') {
      return key in (check as Record<PropertyKey, unknown>);
    }
  }
  return false;
};

/**
 * Checks if a given value is a member of a specified union type.
 *
 * @template T - The union type to check against (string, number, or symbol).
 * @template TCheck - A tuple representation of the union type.
 *
 * @param {unknown} check - The value to check.
 * @param {TCheck} union - The tuple representation of the union type.
 *
 * @returns {check is T} - Returns true if the value is a member of the union type, otherwise false.
 */
export const isMemberOfUnion = <
  T extends string | number | symbol,
  TCheck extends UnionToTuple<T> = UnionToTuple<T>,
>(
  check: unknown,
  union: TCheck,
): check is T => {
  return !!union?.includes(check as T);
};

export const isPromise = <T = void>(check: unknown): check is Promise<T> =>
  !!check &&
  typeof check === 'object' &&
  'then' in check &&
  typeof check.then === 'function' &&
  'catch' in check &&
  typeof check.catch === 'function' &&
  'finally' in check &&
  typeof check.finally === 'function';
