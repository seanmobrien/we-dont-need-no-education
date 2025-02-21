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

/**
 * Returns an object containing symbols used as decorators.
 *
 * @returns An object with the following properties:
 * - `dirty`: A symbol representing if a record is dirty.
 * - `uuid`: A symbol representing the UUID of a record.
 */
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

/**
 * Checks if a given object has a dirty state.
 *
 * @template T - The type of the object.
 * @param check - The object to check.
 * @returns {boolean} - Returns `true` if the object has a dirty state, otherwise `false`.
 */
export const isRecordWithDirtyState = <T extends object>(
  check: unknown
): check is RecordWithDirtyState<T> => {
  const record = check as RecordWithDirtyState<T>;
  return record[RecordIsDirty] !== undefined;
};

/**
 * Checks if a given record is marked as dirty.
 *
 * @param record - The record to check.
 * @returns {boolean} - Returns `true` if the record is dirty, otherwise `false`.
 */
export const isRecordDirty = (record: object): boolean =>
  isRecordWithDirtyState(record) && record[RecordIsDirty] === true;

/**
 * Marks a given record as dirty by setting a `RecordIsDirty` property.
 *
 * @template T - The type of the record.
 * @param {object} record - The record to be marked as dirty.
 * @param {boolean} [isDirty=true] - A boolean flag indicating whether the record is dirty. Defaults to `true`.
 * @returns {record is RecordWithDirtyState<T>} - Returns `true` if the record has successfully had a dirty flag applied.
 */
export const setRecordDirty = <T extends object>(
  record: object,
  isDirty: boolean = true
): record is RecordWithDirtyState<T> => {
  (record as RecordWithDirtyState<T>)[RecordIsDirty] = isDirty;
  return true;
};

/**
 * Checks if a given object has a uuid flag
 *
 * @template T - The type of the object.
 * @param check - The object to check.
 * @returns {boolean} - Returns `true` if the object has a uuid, otherwise `false`.
 */
export const isRecordWithUuid = <T extends object>(
  check: T | unknown
): check is RecordWithUuid<T> =>
  (check &&
    typeof check === 'object' &&
    (check as RecordWithUuid<T>)[RecordUuid] !== undefined) == true;

/**
 * Retrieves the UUID from a record if it contains one.
 *
 * @param record - The record from which to retrieve the UUID.
 * @returns The UUID as a string if the record contains one, otherwise `undefined`.
 */
export const getUuid = (record: unknown): string | null | undefined =>
  isRecordWithUuid(record) ? record[RecordUuid] : undefined;

/**
 * Generates a new UUID (Universally Unique Identifier).
 *
 * If the code is running in a Node.js environment (where `window` is undefined),
 * it generates a UUID using a random string based on `Math.random()`.
 * If the code is running in a browser environment, it uses the `crypto.randomUUID()` method
 * to generate a more secure UUID.
 *
 * @returns {string} A new UUID string.
 */
export const newUuid = () => uuidv4();

/**
 * Sets a UUID on the given record.
 *
 * @template T - The type of the record.
 * @param {T} record - The record to set the UUID on.
 * @param {string | null} [uuid] - The UUID to set. If not provided, a new UUID will be generated.
 * @returns {RecordWithUuid<T>} The record with the UUID set.
 */
export const setUuid = <T extends object>(
  record: T,
  uuid?: string | null
): RecordWithUuid<T> => {
  const work = record as RecordWithUuid<T>;
  work[RecordUuid] = uuid === undefined ? newUuid() : uuid;
  return work;
};
