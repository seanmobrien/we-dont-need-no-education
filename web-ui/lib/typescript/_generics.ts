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
