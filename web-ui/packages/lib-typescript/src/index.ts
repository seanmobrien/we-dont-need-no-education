/**
 * @module @suetheschool/typescript
 *
 * This module serves as a collection of utility functions and types for the application.
 * It contains typeguars, type predicates, and other utility functions that are essential
 * for ensuruing code reusability and consistency.
 *
 * @remarks
 * Funtionality is divided into the following categories:
 * - guards - TypeGuards used to ensure type safety
 * - generics - Generic utility functions.
 * - types - Magical utility types that allow for type manipulation and extraction.
 */
export {
  isOperationCancelledError,
  isAbortablePromise,
  isKeyOf,
  isMemberOfUnion,
  isPromise,
  isNotNull,
  isValidUuid,
} from "./guards";
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
} from "./types";
export {
  getDecoratorSymbols,
  isRecordWithDirtyState,
  isRecordDirty,
  setRecordDirty,
  isRecordWithUuid,
  getUuid,
  newUuid,
  setUuid,
  type RecordWithDirtyState,
  type RecordWithUuid,
} from "./record-decorators";
export {
  type OneOrMany,
  type ServiceInstanceOverloads,
  forOneOrMany,
  serviceInstanceOverloadsFactory,
  unwrapPromise,
} from "./generics";

export {
  AbortablePromise,
  type OperationCancelledError,
} from "./abortable-promise";
export { zodToStructure } from "./zod-to-json-structure";
export {
  SingletonProvider,
  globalSingleton,
  globalRequiredSingleton,
  globalSingletonAsync,
  globalRequiredSingletonAsync,
  type SingletonConfig,
  type WeakReferenceStorage,
  type StrongReferenceStorage,
} from "./singleton-provider";
