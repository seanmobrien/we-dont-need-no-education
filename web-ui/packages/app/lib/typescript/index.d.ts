/**
 * Type declarations for TypeScript utilities module.
 *
 * @module @suetheschool/typescript
 *
 * This module serves as a collection of utility functions and types for the application.
 * It contains typeguards, type predicates, and other utility functions that are essential
 * for ensuring code reusability and consistency.
 *
 * @remarks
 * Functionality is divided into the following categories:
 * - _guards - TypeGuards used to ensure type safety
 * - _generics - Generic utility functions.
 * - _types - Magical utility types that allow for type manipulation and extraction.
 */

declare module '@/lib/typescript' {
  // Re-export type guards
  export {
    isOperationCancelledError,
    isAbortablePromise,
    isKeyOf,
    isMemberOfUnion,
    isPromise,
    isNotNull,
  } from '@/lib/typescript/_guards';

  // Re-export utility types
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
  } from '@/lib/typescript/_types';

  // Re-export record decorators
  export {
    getDecoratorSymbols,
    isRecordWithDirtyState,
    isRecordDirty,
    setRecordDirty,
    isRecordWithUuid,
    getUuid,
    newUuid,
    setUuid,
  } from '@/lib/typescript/_record-decorators';

  export type {
    RecordWithDirtyState,
    RecordWithUuid,
  } from '@/lib/typescript/_record-decorators';

  // Re-export generics
  export { forOneOrMany } from '@/lib/typescript/_generics';
  export type { OneOrMany } from '@/lib/typescript/_generics';

  // Re-export abortable promise
  export type { OperationCancelledError } from '@/lib/typescript/abortable-promise';
  export { AbortablePromise } from '@/lib/typescript/abortable-promise';

  // Re-export zod utilities
  export { zodToStructure } from '@/lib/typescript/zod-to-json-structure';

  // Re-export singleton provider
  export {
    SingletonProvider,
    globalSingleton,
  } from '@/lib/typescript/singleton-provider';
  export type { SingletonConfig } from '@/lib/typescript/singleton-provider';

  // Re-export DualKeyMap
  export { DualKeyMap } from '@/lib/typescript/dual-key-map';
}
