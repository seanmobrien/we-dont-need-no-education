/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @module _types
 * This module provides various utility types for TypeScript, including:
 * - Converting between union and tuple types.
 * - Transforming string literal types.
 * - Handling cancelable promises.
 */

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
export type ArrayElement<T extends readonly any[] | undefined> =
  T extends readonly (infer U)[] ? U : never;

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
 * Constructs a type by making all properties in `T` optional, except for the properties specified in `K` which are required.
 *
 * @template T - The base type.
 * @template K - The keys from `T` that should be required.
 */
export type PartialExceptFor<T, K extends keyof T> = Partial<T> &
  Required<Pick<T, K>>;

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

/**
 * Simple utility type for declaring keys of other types.
 */
export type KeyOf<T> = keyof T;

/**
 * Represents a promise that can be canceled.
 *
 * @template T - The type of the value that the promise resolves to.
 *
 * @extends {Promise<T>}
 *
 * @property {() => void} cancel - Cancels the promise.
 *
 * @example
 * ```typescript
 *
 * promise.then((value) => {
 *   console.log(value);
 * }).catch((error) => {
 *   console.error(error);
 * });
 *
 * // Cancel the promise
 * promise.cancel();
 * ```
 *
 * @property {Promise<T>} native - A wrapping native promise object
 */
export type ICancellablePromise<T> = Pick<
  Promise<T>,
  'then' | 'catch' | 'finally'
> & {
  cancel: () => void;

  /**
   * The native awaitable promise object.
   */
  readonly awaitable: Promise<T>;
};

/**
 * An extended version of `ICancellablePromise` that includes additional methods
 * for handling cancellation events.
 *
 * @template T - The type of the value that the promise resolves to.
 *
 * ```
 */
export type ICancellablePromiseExt<T> = Omit<
  ICancellablePromise<T>,
  'catch' | 'then' | 'finally'
> & {
  /**
   * Registers a callback to be invoked when the promise is canceled.
   *
   * @template TRet - The type of the value that the promise resolves to.
   * @template TSource - The chained type (if any) that the promise initially resolves to.
   * @param {ICanceledCallback} oncanceled - The (@link ICanceledCallback `callback`} to be invoked when the promise is canceled.
   * @returns {Promise<TRet>} A promise that resolves with the value returned by the callback.
   *
   * @example Behavior when the promise is canceled given a TSource of 'source':
   * ```typescript
   * const promise: ICancellablePromiseExt<string>;
   *
   * promise.cancelled((value) => {
   *   console.log('Cancelled:', value);
   *   return 'operation was cancelled.';
   * });
   *
   * promise.then((value) => {
   *   console.log('Then:', value);
   *   return 'operation completed.';
   * }).catch((error) => {
   *   console.log('Error:', value);
   *   return 'operation failed.';
   * });
   *
   * console.log(await promise);
   *
   * // Console output if the promise is canceled -
   * Cancelled: source
   * operation was cancelled.
   *
   * // Console output if the promise is completed -
   * Then: source
   * operation completed.
   *
   * // Console output if the promise fails -
   * Error: source
   * operation failed.
   * ```
   */
  cancelled<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined,
  ): ICancellablePromiseExt<T | TResult>;

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): ICancellablePromiseExt<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined,
  ): ICancellablePromiseExt<T | TResult>;
  finally(
    onfinally?: (() => void) | null | undefined,
  ): ICancellablePromiseExt<T>;
};

/**
 * Infers the type of the first parameter passed to a function.
 *
 * @template T - The function type.
 * @example
 * ```typescript
 * type MyFunction = (arg1: string, arg2: number) => void;
 * type FirstParamType = FirstParameter<MyFunction>; // string
 * ```
 */
export type FirstParameter<T extends (...args: any) => any> = T extends (
  arg1: infer P,
  ...args: any
) => any
  ? P
  : never;

/**
 * Extracts the arguments of a function type as a tuple.
 *
 * @template T - The function type.
 * @example
 * ```typescript
 * type MyFunction = (arg1: string, arg2: number) => void;
 * type ArgsTuple = FunctionArguments<MyFunction>; // [string, number]
 * ```
 */
export type FunctionArguments<T extends (...args: any) => any> = T extends (
  ...args: infer A
) => any
  ? A
  : never;

/**
 * Extracts the return type of a function type.
 * @template T - The function type.
 * @example
 *
 * ```typescript
 * type MyType = {
 *  a: string;
 *  b: number;
 *  c: boolean;
 *  d: () => void;
 * };
 * type KeysOfMethodsInMyType = KeysOfMethods<MyType>; // 'd'
 * ```
 */
export type KeysOfMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Extracts all methods from a given object type.
 * @template T - The object type.
 * @example
 *
 * ```typescript
 * type MyType = {
 * a: string;
 * b: () => number;
 * c: () => boolean;
 * };
 * type Methods = MethodsOf<MyType>; // { b: () => number; c: () => boolean; }
 * ```
 */
export type MethodsOf<T> = Pick<T, KeysOfMethods<T>>;

/**
 * Extracts the return type of methods from an object type.
 * @template T - The object type.
 * @example
 * ```typescript
 * type MyType = {
 *  a: string;
 *  b: () => number;
 *  c: () => boolean;
 * };
 * type Returns = ReturnTypeOfMethods<MyType>; // { b: number; c: boolean; }
 * ```
 */
export type ReturnTypeOfMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R ? R : never;
}[keyof MethodsOf<T>];
