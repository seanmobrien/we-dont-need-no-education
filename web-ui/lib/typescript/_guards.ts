/**
 * @module GuardUtilities
 *
 * A collection of narrow, reusable type guards and runtime checks used across the
 * application to improve safety when interacting with dynamic values, external
 * data, or asynchronous operations. Each helper promotes explicit intent and
 * preserves strong typing by exposing refined TypeScript predicates.
 */
import { IsNotNull, UnionToTuple } from './_types';
import { AbortablePromise } from './abortable-promise';

/**
 * Checks whether the provided error instance represents an aborted async
 * operation.
 *
 * This re-exports {@link AbortablePromise.isOperationCancelledError} so the
 * guard can be consumed without importing the concrete promise implementation.
 *
 * @param error - Arbitrary error or rejection value to examine.
 * @returns `true` when the error was triggered by a cancellation signal; otherwise `false`.
 */
export const isOperationCancelledError =
  AbortablePromise.isOperationCancelledError;

/**
 * Tests whether the supplied value is an {@link AbortablePromise} instance.
 *
 * @param obj - Unknown value that may or may not be an abortable promise.
 * @returns `true` when `obj` exposes the abort-aware promise API; otherwise `false`.
 */
export const isAbortablePromise = AbortablePromise.isAbortablePromise;

/**
 * Runtime signature for the {@link isKeyOf} guard, capturing the overloads
 * needed to work with concrete objects as well as literal key collections.
 */
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
 * Type guard that verifies a candidate key is valid for a specific object or
 * list of literal keys.
 *
 * @template TObject - Object whose keys should be considered valid.
 * @template TLiterals - Tuple containing the allowed literal keys.
 * @param key - Unknown value that should be validated as a property key.
 * @param check - Either an object used for shape checking or a literal tuple of permitted keys.
 * @returns `true` when `key` is safe to use as an index on the supplied `check` value.
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
 * Type guard that confirms a value is contained within a discriminated union
 * by comparing against a tuple representation of the union's members.
 *
 * @template T - Union member type (string, number, or symbol).
 * @template TCheck - Tuple derived from {@link UnionToTuple} that enumerates every union value.
 * @param check - Value to validate against the union definition.
 * @param union - Runtime tuple describing the allowable union values.
 * @returns `true` when the value is present in the tuple; otherwise `false`.
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

/**
 * Determines whether a value conforms to the standard `Promise` interface.
 *
 * @template T - Optional resolution type for the promise.
 * @param check - Unknown value to inspect.
 * @returns `true` if the object exposes `then`, `catch`, and `finally` handlers; otherwise `false`.
 */
export const isPromise = <T = void>(check: unknown): check is Promise<T> =>
  !!check &&
  typeof check === 'object' &&
  'then' in check &&
  typeof check.then === 'function' &&
  'catch' in check &&
  typeof check.catch === 'function' &&
  'finally' in check &&
  typeof check.finally === 'function';

/**
 * Eliminates `null` and `undefined` values from a type union at runtime and compile time.
 *
 * @template T - Type that may include `null` or `undefined`.
 * @param value - The value to evaluate.
 * @returns `true` when `value` is not `null` or `undefined`, allowing TypeScript to narrow the type to {@link IsNotNull}.
 */
export const isNotNull = <T>(
  value: T | null | undefined,
): value is IsNotNull<T> => !!value;
