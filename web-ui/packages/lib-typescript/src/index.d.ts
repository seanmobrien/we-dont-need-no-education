/**
 * Type declarations for TypeScript utilities module.
 *
 * @module @suetheschool/typescript
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

export type { BrandedUuid } from "./guards";

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
} from "./record-decorators";

export type { RecordWithDirtyState, RecordWithUuid } from "./record-decorators";

export {
  AbortablePromise,
  type OperationCancelledError,
} from "./abortable-promise";

export { zodToStructure } from "./zod-to-json-structure";

export { SingletonProvider, globalSingleton } from "./singleton-provider";
export type { SingletonConfig } from "./singleton-provider";

export { DualKeyMap } from "./dual-key-map";

export type {
  OneOrMany,
  ServiceInstanceOverloads,
} from "./generics";

export {
  forOneOrMany,
  serviceInstanceOverloadsFactory,
  unwrapPromise,
} from "./generics";
