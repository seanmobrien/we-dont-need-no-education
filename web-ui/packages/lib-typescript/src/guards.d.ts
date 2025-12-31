import type { IsNotNull, UnionToTuple } from "./types";
import type {
  AbortablePromise,
  OperationCancelledError,
} from "./abortable-promise";

/**
 * Type declarations for type guard utilities.
 *
 * @module GuardUtilities
 *
 * A collection of narrow, reusable type guards and runtime checks used across the
 * application to improve safety when interacting with dynamic values, external
 * data, or asynchronous operations. Each helper promotes explicit intent and
 * preserves strong typing by exposing refined TypeScript predicates.
 */

declare module "@compliance-theater/typescript/guards" {
  /**
   * Checks whether the provided error instance represents an aborted async
   * operation.
   *
   * This re-exports {@link AbortablePromise.isOperationCancelledError} so the
   * guard can be consumed without importing the concrete promise implementation.
   *
   * @param error - Arbitrary error or rejection value to examine.
   * @returns `true` when the error was triggered by a cancellation signal; otherwise `false`.
   *
   * @example
   * ```typescript
   * try {
   *   await fetchData();
   * } catch (error) {
   *   if (isOperationCancelledError(error)) {
   *     console.log('Operation was cancelled by user');
   *   } else {
   *     console.error('Unexpected error:', error);
   *   }
   * }
   * ```
   */
  export function isOperationCancelledError(
    error: unknown
  ): error is OperationCancelledError;

  /**
   * Tests whether the supplied value is an {@link AbortablePromise} instance.
   *
   * @template T - Expected resolution type of the promise
   * @param obj - Unknown value that may or may not be an abortable promise.
   * @returns `true` when `obj` exposes the abort-aware promise API; otherwise `false`.
   *
   * @example
   * ```typescript
   * if (isAbortablePromise(promise)) {
   *   // Safe to call .cancel()
   *   promise.cancel();
   * }
   * ```
   */
  export function isAbortablePromise<T = unknown>(
    obj: unknown
  ): obj is AbortablePromise<T>;

  /**
   * Runtime signature for the {@link isKeyOf} guard, capturing the overloads
   * needed to work with concrete objects as well as literal key collections.
   */
  interface IsKeyOfGuard {
    /**
     * When called with a readonly array/tuple of literal keys, narrow the key to that array's element type
     */
    <T extends readonly (string | number | symbol)[]>(
      key: unknown,
      check: T
    ): key is T[number];
    /**
     * Allow calling with no second argument or an explicit undefined/null to check only the key shape
     */
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
   *
   * @example
   * ```typescript
   * const config = { host: 'localhost', port: 3000 };
   * const key: string = getUserInput();
   *
   * if (isKeyOf(key, config)) {
   *   // key is now typed as 'host' | 'port'
   *   console.log(config[key]);
   * }
   * ```
   *
   * @example
   * ```typescript
   * const allowedKeys = ['name', 'email', 'age'] as const;
   * if (isKeyOf(userInput, allowedKeys)) {
   *   // userInput is now typed as 'name' | 'email' | 'age'
   *   processField(userInput);
   * }
   * ```
   */
  export const isKeyOf: IsKeyOfGuard;

  /**
   * Type guard that confirms a value is contained within a discriminated union
   * by comparing against a tuple representation of the union's members.
   *
   * @template T - Union member type (string, number, or symbol).
   * @template TCheck - Tuple derived from {@link UnionToTuple} that enumerates every union value.
   * @param check - Value to validate against the union definition.
   * @param union - Runtime tuple describing the allowable union values.
   * @returns `true` when the value is present in the tuple; otherwise `false`.
   *
   * @example
   * ```typescript
   * type Status = 'pending' | 'active' | 'complete';
   * const statuses: UnionToTuple<Status> = ['pending', 'active', 'complete'];
   *
   * if (isMemberOfUnion(userInput, statuses)) {
   *   // userInput is now typed as Status
   *   updateStatus(userInput);
   * }
   * ```
   */
  export function isMemberOfUnion<
    T extends string | number | symbol,
    TCheck extends UnionToTuple<T> = UnionToTuple<T>,
  >(check: unknown, union: TCheck): check is T;

  /**
   * Determines whether a value conforms to the standard `Promise` interface.
   *
   * @template T - Optional resolution type for the promise.
   * @param check - Unknown value to inspect.
   * @returns `true` if the object exposes `then`, `catch`, and `finally` handlers; otherwise `false`.
   *
   * @example
   * ```typescript
   * if (isPromise(value)) {
   *   // value is typed as Promise<unknown>
   *   await value;
   * }
   * ```
   *
   * @example
   * ```typescript
   * function processValue(value: unknown) {
   *   if (isPromise<string>(value)) {
   *     return value.then(str => str.toUpperCase());
   *   }
   *   return Promise.resolve('default');
   * }
   * ```
   */
  export function isPromise<T = void>(check: unknown): check is Promise<T>;

  /**
   * Eliminates `null` and `undefined` values from a type union at runtime and compile time.
   *
   * @template T - Type that may include `null` or `undefined`.
   * @param value - The value to evaluate.
   * @returns `true` when `value` is not `null` or `undefined`, allowing TypeScript to narrow the type to {@link IsNotNull}.
   *
   * @example
   * ```typescript
   * const values: (string | null | undefined)[] = ['hello', null, 'world', undefined];
   * const filtered = values.filter(isNotNull); // string[]
   * ```
   *
   * @example
   * ```typescript
   * function processUser(user: User | null | undefined) {
   *   if (isNotNull(user)) {
   *     // user is typed as User
   *     console.log(user.name);
   *   }
   * }
   * ```
   */
  export function isNotNull<T>(
    value: T | null | undefined
  ): value is IsNotNull<T>;

  /**
   * A branded type representing a valid UUID string.
   *
   * @example
   * ```typescript
   * const uuid: BrandedUuid = '123e4567-e89b-12d3-a456-426614174000';
   * ```
   */
  export type BrandedUuid = `${string}-${string}-${string}-${string}-${string}`;

  /**
   * Type guard that verifies a candidate value is a valid UUID string.
   *
   * @param check - Unknown value to validate.
   * @returns `true` when the value matches the UUID format; otherwise `false`.
   *
   * @example
   * ```typescript
   * if (isValidUuid(value)) {
   *   // value is now typed as BrandedUuid
   *   console.log(value);
   * }
   * ```
   */
  export function isValidUuid(check: unknown): check is BrandedUuid;
}
