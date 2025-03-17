/**
 * A type that represents a function which can take either a single input or an array of inputs,
 * and returns either a single output or an array of outputs respectively.
 *
 * @template TInput - The type of the input value(s).
 * @template TOutput - The type of the output value(s). Defaults to the same type as TInput.
 *
 * @param input - A single input value of type TInput.
 * @returns A single output value of type TOutput.
 *
 * @param input - An array of input values of type TInput.
 * @returns An array of output values of type TOutput.
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
