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
 * Extracts keys for all members that resolve to a function
 * @template T - The type to extract members from
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