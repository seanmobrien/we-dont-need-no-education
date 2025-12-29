/**
 * @module GuardUtilities
 *
 * A collection of narrow, reusable type guards and runtime checks used across the
 * application to improve safety when interacting with dynamic values, external
 * data, or asynchronous operations. Each helper promotes explicit intent and
 * preserves strong typing by exposing refined TypeScript predicates.
 */
import { IsNotNull, UnionToTuple } from "./types";
import { AbortablePromise } from "./abortable-promise";

export const isOperationCancelledError =
  AbortablePromise.isOperationCancelledError;

export const isAbortablePromise = AbortablePromise.isAbortablePromise;

/**
 * Runtime signature for the {@link isKeyOf} guard, capturing the overloads
 * needed to work with concrete objects as well as literal key collections.
 */
interface IsKeyOfGuard {
  // When called with a readonly array/tuple of literal keys, narrow the key to that array's element type
  <T extends readonly (string | number | symbol)[]>(
    key: unknown,
    check: T
  ): key is T[number];
  // Allow calling with no second argument or an explicit undefined/null to check only the key shape
  <T extends object>(key: unknown, check?: undefined | null): key is keyof T;
  <T extends object>(key: unknown): key is keyof T;
  <T extends object>(key: unknown, check: T): key is keyof T;
}

export const isKeyOf: IsKeyOfGuard = (
  key: unknown,
  check?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): key is any => {
  if (check === undefined || check === null) {
    return false;
  }
  if (
    typeof key === "string" ||
    typeof key === "number" ||
    typeof key === "symbol"
  ) {
    if (Array.isArray(check)) {
      // runtime: check if any element equals the key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (check as any[]).some((v) => v === key);
    }
    if (check && typeof check === "object") {
      return key in (check as Record<PropertyKey, unknown>);
    }
  }
  return false;
};

export const isMemberOfUnion = <
  T extends string | number | symbol,
  TCheck extends UnionToTuple<T> = UnionToTuple<T>,
>(
  check: unknown,
  union: TCheck
): check is T => {
  return !!union?.includes(check as T);
};

export const isPromise = <T = void>(check: unknown): check is Promise<T> =>
  !!check &&
  typeof check === "object" &&
  "then" in check &&
  typeof check.then === "function" &&
  "catch" in check &&
  typeof check.catch === "function" &&
  "finally" in check &&
  typeof check.finally === "function";

export const isNotNull = <T>(
  value: T | null | undefined
): value is IsNotNull<T> => !!value;

export type BrandedUuid = `${string}-${string}-${string}-${string}-${string}`;

export const isValidUuid = (check: unknown): check is BrandedUuid => {
  const uuidRegex =
    /[0-9a-z]{8}-[0-9a-z]{4}-4[0-9a-z]{3}-[89ABab][0-9a-z]{3}-[0-9a-z]{12}/i;
  return typeof check === "string" && uuidRegex.test(check);
};
