/**
 * Type declarations for generic utility functions.
 *
 * @module GenericUtilities
 *
 * Shared compile-time helpers for modeling generic call signatures.
 * These utilities help reduce duplication when authoring APIs that
 * accept either scalar or array inputs.
 */

declare module '@/lib/typescript/_generics' {
  /**
   * Describes a callable that can process either a single input value or an array
   * of values, returning the corresponding singular or array output.
   *
   * @template TInput - Incoming value type.
   * @template TOutput - Outgoing value type (defaults to {@link TInput}).
   *
   * @example
   * ```typescript
   * // Define a function that works with single or multiple values
   * const double: OneOrMany<number> = (input) => {
   *   if (Array.isArray(input)) {
   *     return input.map(n => n * 2);
   *   }
   *   return input * 2;
   * };
   *
   * double(5); // 10
   * double([1, 2, 3]); // [2, 4, 6]
   * ```
   */
  export type OneOrMany<TInput, TOutput = TInput> = {
    (input: TInput): TOutput;
    (input: Array<TInput>): Array<TOutput>;
  };

  /**
   * Executes a unary function against either a single value or an array of
   * values, mirroring the input shape in the output.
   *
   * @template TInput - Type of the incoming value(s).
   * @template TOutput - Type produced by the mapping function.
   * @param forOne - Handler invoked for each single value.
   * @param input - Value or array to process.
   * @returns A single transformed value when `input` is scalar, otherwise an array of transformed values.
   *
   * @example
   * ```typescript
   * const double = (n: number) => n * 2;
   *
   * forOneOrMany(double, 5); // 10
   * forOneOrMany(double, [1, 2, 3]); // [2, 4, 6]
   * ```
   *
   * @example
   * ```typescript
   * // Transform objects
   * const toUpperCase = (s: string) => s.toUpperCase();
   *
   * forOneOrMany(toUpperCase, 'hello'); // 'HELLO'
   * forOneOrMany(toUpperCase, ['hello', 'world']); // ['HELLO', 'WORLD']
   * ```
   */
  export function forOneOrMany<TInput, TOutput>(
    forOne: (input: TInput) => TOutput,
    input: TInput | Array<TInput>,
  ): TInput extends Array<TInput> ? Array<TOutput> : TOutput;

  /**
   * Useful for normalizing return types from functions that may return either a value or a promise.
   * Unwraps a value or promise to a consistently awaitable promise, with nested promises being flattened.
   *
   * @template T - Type of the value or promise.
   * @param value - Value or promise to unwrap.
   * @returns A promise resolving to the value.
   *
   * @example
   * ```typescript
   * const result = await unwrapPromise('hello'); // Promise<'hello'>
   * const result2 = await unwrapPromise(Promise.resolve('hello')); // Promise<'hello'>
   * ```
   */
  export function unwrapPromise<T>(value: T | Promise<T>): Promise<T>;
}
