/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Converts a union type `T` into a tuple type.
 *
 * This utility type takes a union type `T` and transforms it into a tuple type
 * where each element of the tuple corresponds to a member of the union.
 *
 * @template T - The union type to be converted into a tuple.
 *
 * @example
 * ```typescript
 * type Union = 'a' | 'b' | 'c';
 * type Tuple = UnionToTuple<Union>; // ['a', 'b', 'c']
 * ```
 */
export type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends (t: infer U) => any ? U : never
) extends { [K in any]: infer E }
  ? E[]
  : never;

/**
 * Converts a tuple type to a union type.
 *
 * @template T - A tuple type.
 * @example
 * ```typescript
 * type MyTuple = ['a', 'b', 'c'];
 * type MyUnion = TupleToUnion<MyTuple>; // 'a' | 'b' | 'c'
 * ```
 * @example
 * ```typescript
 * type MyTuple = [string, number, boolean];
 * type MyUnion = TupleToUnion<MyTuple>; // string | number | boolean
 * ```
 */
export type TupleToUnion<T extends any[]> = T[number];

/**
 * Converts a union type to an object type with keys from the union and values of type `any`.
 *
 * @template T - The union type to be converted into an object type.
 * @example
 * ```typescript
 * type MyUnion = 'a' | 'b' | 'c';
 * type MyObject = UnionToObject<MyUnion>; // { 'a': any; 'b': any; 'c': any }
 * ```
 */
export type UnionToObject<T extends string | number | symbol> = {
  [K in T]: any;
};

/**
 * Infers the element type of an array.
 *
 * @template T - The array type.
 * @example
 * ```typescript
 * type MyArray = string[];
 * type ElementType = ArrayElement<MyArray>; // string
 * ```
 * @example
 * ```typescript
 * type MyArray = (string | number)[];
 * type ElementType = ArrayElement<MyArray>; // string | number
 * ```
 */
export type ArrayElement<T extends readonly any[]> =
  T extends readonly (infer U)[] ? U : never;
