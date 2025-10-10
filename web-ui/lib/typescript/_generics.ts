/**
 * @module GenericUtilities
 *
 * Shared compile-time helpers for modeling generic call signatures.
 * These utilities help reduce duplication when authoring APIs that
 * accept either scalar or array inputs.
 */

/**
 * Describes a callable that can process either a single input value or an array
 * of values, returning the corresponding singular or array output.
 *
 * @template TInput - Incoming value type.
 * @template TOutput - Outgoing value type (defaults to {@link TInput}).
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
 */
export const forOneOrMany = <TInput, TOutput>(
  forOne: (input: TInput) => TOutput,
  input: TInput | Array<TInput>,
): TInput extends Array<TInput> ? Array<TOutput> : TOutput => {
  if (Array.isArray(input)) {
    return input.map(forOne) as TInput extends Array<TInput>
      ? Array<TOutput>
      : TOutput;
  }
  return forOne(input) as TInput extends Array<TInput>
    ? Array<TOutput>
    : TOutput;
};
