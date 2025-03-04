import { PaginatedResultset, PaginationStats } from '@/data-models';
import { PartialExceptFor } from '../typescript';

/**
 * Parameters for making a paginated request to the API.
 *
 * @property {number} num - The number of items per page.
 * @property {number} page - The current page number.
 */
export type PaginatedRequestApiParams = {
  num?: number;
  page?: number;
};

/**
 * A generic repository interface for managing objects of type `T`.
 *
 * @template T - The type of the objects managed by the repository.
 * @template K - The key of the unique identifier property in type `T`.
 */
export type ObjectRepository<T, K extends keyof T> = {
  /**
   * Retrieves a list of objects with optional pagination.
   *
   * @param pagination - Optional pagination parameters.
   * @returns A promise that resolves to a paginated result set of partial objects of type `T`.
   */
  list: (
    pagination?: PaginationStats
  ) => Promise<PaginatedResultset<Partial<T>>>;

  /**
   * Retrieves a single object by its unique identifier.
   *
   * @param recordId - The unique identifier of the object to retrieve.
   * @returns A promise that resolves to the object of type `T` or `null` if not found.
   */
  get: (recordId: T[K]) => Promise<T | null>;

  /**
   * Creates a new object.
   *
   * @param model - The object to create, excluding the unique identifier property.
   * @returns A promise that resolves to the created object of type `T`.
   */
  create: (model: Omit<T, K>) => Promise<T>;

  /**
   * Updates an existing object.
   *
   * @param model - The object to update, with all properties optional except for the unique identifier property.
   * @returns A promise that resolves to the updated object of type `T`.
   */
  update: (model: PartialExceptFor<T, K>) => Promise<T>;

  /**
   * Deletes an object by its unique identifier.
   *
   * @param recordId - The unique identifier of the object to delete.
   * @returns A promise that resolves to `true` if the object was successfully deleted, or `false` otherwise.
   */
  delete: (recordId: T[K]) => Promise<boolean>;
};
/**
 * A function type that transforms a record of unknown values into a partial object of type `T`.
 *
 * @template T - The type of the object to be returned.
 * @param record - A record with string keys and unknown values.
 * @returns A partial object of type `T`.
 */
export type RecordToSummaryImpl<T extends object> = (
  record: Record<string, unknown>
) => Partial<T>;

/**
 * A type alias for a function that converts a record with string keys and unknown values
 * to an object of type T.
 *
 * @template T - The type of the object to be returned.
 * @param record - The record with string keys and unknown values to be converted.
 * @returns An object of type T.
 */
export type RecordToObjectImpl<T extends object> = (
  record: Record<string, unknown>
) => T;
