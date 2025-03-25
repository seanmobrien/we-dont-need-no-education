import type { PostgresError, RowList } from 'postgres';
import type { IResultset } from './types';
import { Resultset } from './index-postgres';

/**
 * Type guard to check if an error is a PostgresError.
 *
 * @param error - The error to check.
 * @returns True if the error is a PostgresError, false otherwise.
 */
export const isDbError = (error: unknown): error is PostgresError =>
  !!error &&
  typeof error === 'object' &&
  'name' in error &&
  error.name === 'PostgresError';

/**
 * Type guard function to check if a given value is an instance of `IResultset<T>`.
 *
 * @template T - The type of the records in the result set.
 * @param check - The value to be checked.
 * @returns `true` if the value is an instance of `IResultset<T>`, otherwise `false`.
 */
export const isResultset = <T extends Record<string, unknown>>(
  check: unknown,
): check is IResultset<T> => Resultset.isResultset<T>(check);

/**
 * Checks if the provided value is a RowList of a specific type.
 *
 * @template T - The type of the records in the RowList.
 * @param check - The value to check.
 * @returns `true` if the value is a RowList of type T, otherwise `false`.
 */
export const isRowList = <T extends Record<string, unknown>>(
  check: unknown,
): check is RowList<Array<T>> => Resultset.isRowList<T>(check);
