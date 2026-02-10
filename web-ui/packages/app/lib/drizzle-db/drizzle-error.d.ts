/**
 * PostgreSQL error types and utilities
 * @module @/lib/drizzle-db/drizzle-error
 */

declare module '@/lib/drizzle-db/drizzle-error' {
  /**
   * PostgresError represents the shape of an error object returned by
   * PostgreSQL drivers and Drizzle adapters. It extends the standard Error
   * with Postgres-specific fields from the server's error response.
   *
   * This interface is intentionally permissive: most properties are optional
   * because different drivers and Postgres versions populate different subsets.
   *
   * @example
   * ```typescript
   * function handleDbError(err: unknown) {
   *   if ((err as PostgresError)?.code === '23505') {
   *     // unique_violation - handle conflict
   *   }
   *   const pgErr = err as PostgresError;
   *   console.error('DB error', {
   *     sqlstate: pgErr.code,
   *     table: pgErr.table,
   *     constraint: pgErr.constraint,
   *     hint: pgErr.hint,
   *   });
   * }
   * ```
   */
  export interface PostgresError extends Error {
    name: 'DrizzleError';
    code?: string;
    severity?: string;
    detail?: string;
    hint?: string;
    position?: string;
    internalPosition?: string;
    internalQuery?: string;
    where?: string;
    schema?: string;
    table?: string;
    column?: string;
    dataType?: string;
    constraint?: string;
    file?: string;
    line?: string;
    routine?: string;
    query?: string;
    parameters?: unknown[];
    cause?: unknown;
    originalError?: unknown;
  }

  /**
   * Type guard to check if an error is a DrizzleError.
   *
   * @param error - The error to check
   * @returns True if the error is a DrizzleError, false otherwise
   */
  export const isDrizzleError: (error: unknown) => error is PostgresError;

  /**
   * Canonical mapping of PostgreSQL SQLSTATE codes to short descriptions.
   * Contains the most commonly encountered SQLSTATE codes.
   */
  export const PG_ERROR_CODE_DESCRIPTIONS: Record<string, string>;

  /**
   * Return a short canonical description for the provided SQLSTATE code.
   *
   * @param code - SQLSTATE code (case-insensitive, may include whitespace)
   * @returns Canonical description string (e.g. 'unique_violation') or undefined
   *
   * @example
   * ```typescript
   * errorFromCode('23505'); // -> 'unique_violation'
   * errorFromCode(' 22p02 '); // -> 'invalid_text_representation'
   * ```
   */
  export const errorFromCode: (
    code: string | undefined | unknown,
  ) => string | undefined;
}
