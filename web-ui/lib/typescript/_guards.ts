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
  <T extends object>(key: unknown): key is keyof T;
  <T extends string>(key: unknown, check: Array<T>): key is keyof T;
  <T>(key: unknown, check: T): key is keyof T;
}

/**
 * Determines if a value is a key of a given type.
 * @param key - The value to check.
 * @returns True if the value is a key of the given type, false otherwise.
 */
export const isKeyOf: IsKeyOfGuard = <T>(
  key: unknown,
  check?: T | Array<T>,
): key is keyof T => {
  if (check === undefined || check === null) {
    return false;
  }
  if (
    typeof key === 'string' ||
    typeof key === 'number' ||
    typeof key === 'symbol'
  ) {
    if (Array.isArray(check)) {
      return check.includes(key as T);
    }
    if (typeof check === 'object') {
      return key in check;
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
