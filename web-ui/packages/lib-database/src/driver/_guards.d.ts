/**
 * Type guard functions for PostgreSQL result types
 * @module @/lib/neondb/_guards
 */
import type { PostgresError, RowList } from 'postgres';
import type { IResultset } from './types';

declare module '@/lib/neondb/_guards' {
  /**
   * Type guard to check if an error is a PostgresError.
   *
   * PostgresError objects have a specific structure with properties like
   * `severity`, `code`, `detail`, and others that standard errors don't have.
   * This guard helps narrow the error type for better error handling.
   *
   * **Checked Properties:**
   * - Error must be an object
   * - Error must have a `name` property
   * - The `name` property must equal `'PostgresError'`
   *
   * @param error - The error to check
   * @returns `true` if the error is a PostgresError, `false` otherwise
   *
   * @example
   * ```typescript
   * try {
   *   await db`INSERT INTO users (email) VALUES (${email})`;
   * } catch (error) {
   *   if (isDbError(error)) {
   *     // error is now typed as PostgresError
   *     console.error(`DB Error [${error.code}]: ${error.message}`);
   *     if (error.code === '23505') {
   *       console.error('Unique constraint violation');
   *     }
   *   } else {
   *     // Regular error handling
   *     console.error('Unknown error:', error);
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Error handling with detailed PostgreSQL info
   * if (isDbError(error)) {
   *   console.log('Severity:', error.severity);    // 'ERROR', 'WARNING', etc.
   *   console.log('SQL State:', error.code);       // '23505', '42P01', etc.
   *   console.log('Detail:', error.detail);        // Additional error details
   *   console.log('Hint:', error.hint);            // Suggestions for fixing
   *   console.log('Table:', error.table);          // Affected table name
   *   console.log('Column:', error.column);        // Affected column name
   *   console.log('Constraint:', error.constraint); // Violated constraint name
   * }
   * ```
   */
  export function isDbError(error: unknown): error is PostgresError;

  /**
   * Type guard function to check if a given value is an instance of `IResultset<T>`.
   *
   * This guard verifies that a value conforms to the IResultset interface by checking
   * for the presence of required metadata properties. This is useful when working with
   * database results that may come from different sources or have been transformed.
   *
   * **What is checked:**
   * - Value must be an array
   * - Must have `fields` property (array of column metadata)
   * - Must have `command` property (SQL command type)
   * - Must have `statement` property (the SQL statement)
   * - Must have `count` property (number of rows)
   *
   * @template T - The type of records in the result set
   * @param check - The value to be checked
   * @returns `true` if the value is an instance of `IResultset<T>`, otherwise `false`
   *
   * @example
   * ```typescript
   * function processResult(result: unknown) {
   *   if (isResultset<User[]>(result)) {
   *     // result is now typed as IResultset<User[]>
   *     console.log(`Query: ${result.statement}`);
   *     console.log(`Rows returned: ${result.length}`);
   *     result.forEach(user => {
   *       console.log(user.name);
   *     });
   *   } else {
   *     console.error('Invalid result format');
   *   }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Safely process potentially transformed results
   * const cachedResult = await cache.get('users');
   *
   * if (isResultset<User[]>(cachedResult)) {
   *   // We have a valid resultset with metadata
   *   console.log('Command:', cachedResult.command);
   *   console.log('Fields:', cachedResult.fields.map(f => f.name));
   *   return cachedResult;
   * } else {
   *   // Need to query database
   *   return await db`SELECT * FROM users`;
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function isResultset<T extends readonly any[]>(
    check: unknown,
  ): check is IResultset<T>;

  /**
   * Checks if the provided value is a RowList of a specific type.
   *
   * RowList is the raw result type returned directly from the postgres.js driver.
   * Unlike IResultset (which is a wrapper), RowList uses `columns` instead of `fields`
   * and doesn't include the deprecated `count` and `rows` properties.
   *
   * **What is checked:**
   * - Value must be an array
   * - Must have `columns` property (array of column metadata)
   * - Must have `command` property (SQL command type)
   * - Must have `statement` property (the SQL statement)
   *
   * **Difference from IResultset:**
   * - RowList uses `columns` property
   * - IResultset uses `fields` property
   * - RowList is the raw postgres.js result
   * - IResultset is our wrapped result with additional features
   *
   * @template T - The type of records in the RowList
   * @param check - The value to check
   * @returns `true` if the value is a RowList of type T, otherwise `false`
   *
   * @example
   * ```typescript
   * async function queryUsers() {
   *   const result = await db`SELECT * FROM users`;
   *
   *   if (isRowList<User[]>(result)) {
   *     // result is typed as RowList<User[]>
   *     console.log('Columns:', result.columns.map(col => col.name));
   *     console.log('Command:', result.command);
   *     return result;
   *   }
   *
   *   throw new Error('Invalid result type');
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Convert RowList to IResultset
   * function normalizeResult<T extends readonly any[]>(
   *   result: unknown
   * ): IResultset<T> {
   *   if (isRowList<T>(result)) {
   *     // Convert raw RowList to our IResultset format
   *     return new Resultset(result);
   *   }
   *   if (isResultset<T>(result)) {
   *     // Already in correct format
   *     return result;
   *   }
   *   throw new Error('Invalid database result');
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function isRowList<T extends readonly any[]>(
    check: unknown,
  ): check is RowList<T>;
}
