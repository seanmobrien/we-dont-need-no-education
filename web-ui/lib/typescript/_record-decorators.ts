import { v4 as uuidv4 } from 'uuid';

/**
 * A unique symbol used to mark a record as dirty.
 *
 * This symbol can be used as a key to indicate that a record has been modified
 * and needs to be saved or processed. It is typically used in conjunction with
 * decorators or other metadata mechanisms to track changes to objects.
 */
const RecordIsDirty = Symbol('RecordIsDirty');
/**
 * A unique symbol used to identify a record by its UUID.
 *
 * @remarks
 * This symbol can be used as a unique key or identifier for records within the application.
 *
 * @example
 * ```typescript
 * const myRecord = {
 *   [RecordUuid]: '123e4567-e89b-12d3-a456-426614174000'
 * };
 * ```
 */
const RecordUuid = Symbol('RecordUuid');


export const getDecoratorSymbols = () => ({
  dirty: RecordIsDirty,
  uuid: RecordUuid,
});

/**
 * A type that extends a given object type `T` with an optional `RecordIsDirty` property.
 * This property is a boolean that indicates whether the record is considered "dirty" (i.e., has unsaved changes).
 *
 * @template T - The base object type that is being extended.
 */
export type RecordWithDirtyState<T extends object> = T & {
  [RecordIsDirty]?: boolean;
};

/**
 * A type that extends a given object type `T` with an optional `RecordUuid` property.
 * The `RecordUuid` property can be a string or null.
 *
 * @template T - The base object type to extend.
 */
export type RecordWithUuid<T extends object> = T & {
  [RecordUuid]?: string | null;
};


export const isRecordWithDirtyState = <T extends object>(
  check: unknown
): check is RecordWithDirtyState<T> => {
  const record = check as RecordWithDirtyState<T>;
  return record[RecordIsDirty] !== undefined;
};


export const isRecordDirty = (record: object): boolean =>
  isRecordWithDirtyState(record) && record[RecordIsDirty] === true;


export const setRecordDirty = <T extends object>(
  record: object,
  isDirty: boolean = true
): record is RecordWithDirtyState<T> => {
  (record as RecordWithDirtyState<T>)[RecordIsDirty] = isDirty;
  return true;
};


export const isRecordWithUuid = <T extends object>(
  check: T | unknown
): check is RecordWithUuid<T> =>
  (check &&
    typeof check === 'object' &&
    (check as RecordWithUuid<T>)[RecordUuid] !== undefined) == true;


export const getUuid = (record: unknown): string | null | undefined =>
  isRecordWithUuid(record) ? record[RecordUuid] : undefined;


export const newUuid = () => uuidv4();


export const setUuid = <T extends object>(
  record: T,
  uuid?: string | null
): RecordWithUuid<T> => {
  const work = record as RecordWithUuid<T>;
  work[RecordUuid] = uuid === undefined ? newUuid() : uuid;
  return work;
};
