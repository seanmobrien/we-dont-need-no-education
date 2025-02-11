import { UnionToTuple } from './_types';

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
  check?: T | Array<T>
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

export const isMemberOfUnion = <
  T extends string | number | symbol,
  TCheck extends UnionToTuple<T> = UnionToTuple<T>
>(
  check: unknown,
  union: TCheck
): check is T => {
  return union.includes(check as T);
};
