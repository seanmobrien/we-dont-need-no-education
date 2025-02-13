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

/**
 * Picks a specific field type from an object type `T` by key `K`.
 *
 * @template T - The object type.
 * @template K - The key of the field to pick.
 * @example
 * ```typescript
 * type MyObject = { a: string; b: number; c: boolean };
 * type FieldType = PickField<MyObject, 'b'>; // number
 * ```
 */
export type PickField<T, K extends keyof T> = Pick<T, K>[K];

/**
 * Converts a kebab-case string to camelCase.
 *
 * This utility type recursively transforms a kebab-case string literal type
 * into a camelCase string literal type. Each hyphen (`-`) in the input string
 * is removed, and the character immediately following the hyphen is
 * capitalized.
 *
 * @template S - The kebab-case string to be transformed.
 * @example
 * ```typescript
 * type CamelCase = KebabToCamelCase<'kebab-case-string'>; // 'kebabCaseString'
 * ```
 */
export type KebabToCamelCase<S extends string> =
  S extends `${infer T}-${infer U}`
    ? `${T}${Capitalize<KebabToCamelCase<U>>}`
    : S;
