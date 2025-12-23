/**
 * @module GenericUtilities
 *
 * Shared compile-time helpers for modeling generic call signatures.
 * These utilities help reduce duplication when authoring APIs that
 * accept either scalar or array inputs.
 */
import { isPromise } from "./_guards";


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


export interface ServiceInstanceOverloads<TService> {
  (): TService;
  <TResult>(callback: (service: TService) => TResult): TResult;
}

export const serviceInstanceOverloadsFactory =
  <TService>(serviceFactory: () => TService): ServiceInstanceOverloads<TService> =>
    <TResult>(
      callback?: (service: TService) => TResult
    ): TResult | TService => {
      if (typeof callback === 'function') {
        return callback(serviceFactory());
      }
      return serviceFactory();
    };

export const unwrapPromise = async <T>(value: T | Promise<T>): Promise<T> => {
  let res: T | Promise<T> = value;
  while (res && isPromise(res)) {
    res = await res;
  }
  return res as T;
};

