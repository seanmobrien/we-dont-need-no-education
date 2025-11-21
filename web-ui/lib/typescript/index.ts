/**
 * @module @suetheschool/typescript
 *
 * This module serves as a collection of utility functions and types for the application.
 * It contains typeguars, type predicates, and other utility functions that are essential
 * for ensuruing code reusability and consistency.
 *
 * @remarks
 * Funtionality is divided into the following categories:
 * - _guards - TypeGuards used to ensure type safety
 * - _generics - Generic utility functions.
 * - _types - Magical utility types that allow for type manipulation and extraction.
 */
export * from './_guards';
export type {
  IsNotNull,
  ExcludeExactMatch,
  ReturnTypeOfMethods,
  MethodsOf,
  KeysOfMethods,
  FunctionArguments,
  FirstParameter,
  ICancellablePromiseExt,
  ICancellablePromise,
  UnwrapPromise,
  KeyOf,
  KebabToCamelCase,
  PartialExceptFor,
  PickField,
  ArrayElement,
  UnionToObject,
  TupleToUnion,
  UnionToTuple,
} from './_types';
export * from './_record-decorators';
export * from './_generics';
export type { OperationCancelledError } from './abortable-promise';
export { AbortablePromise } from './abortable-promise';
export { zodToStructure } from './zod-to-json-structure';
export {
  SingletonProvider,
  globalSingleton,
  globalSingletonAsync,
  type SingletonConfig,
} from './singleton-provider';
