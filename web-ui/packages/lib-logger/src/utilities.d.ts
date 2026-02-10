/**
 * Logger utilities
 *
 * Provides helpers to detect nested Postgres errors and to generate
 * normalized, serializable error log payloads.
 *
 * @module @compliance-theater/logger/utilities
 */

declare module '@compliance-theater/logger/utilities' {
  /**
   * Shape of a Postgres/DB error we want to extract and log.
   */
  export type DbError = Error & {
    code: number;
    detail: string;
    severity: number | string;
    internalQuery?: string;
    where?: string;
    schema?: string;
    table?: string;
    column?: string;
    schema_name?: string;
    column_name?: string;
    table_name?: string;
    query?: string;
    internal_query?: string;
    cause?: unknown;
  };

  /**
   * Attempts to extract a Postgres/DB error from an unknown thrown value.
   *
   * Recursively searches through error wrappers including:
   * - Direct PostgresError objects
   * - Errors with .cause property
   * - Errors with .error property
   *
   * @param error - Unknown thrown value (Error, wrapped error, or other)
   * @returns The detected DbError if present, otherwise undefined
   *
   * @example
   * ```typescript
   * try {
   *   await db.query('...');
   * } catch (error) {
   *   const dbError = getDbError(error);
   *   if (dbError) {
   *     console.log('DB Error:', dbError.code, dbError.detail);
   *   }
   * }
   * ```
   */
  export const getDbError: (error: unknown) => DbError | undefined;

  /**
   * Creates a normalized error log payload.
   *
   * Behavior:
   * - If `error` looks like an Error (has `message`), produce `{ message, stack }`
   * - Use the provided `error.stack` if available, otherwise synthesize a stack
   * - If `error` contains a recognized DB error, include DB-specific fields:
   *   - name, code, detail, severity
   *   - internalQuery, where, schema, table, column, cause
   * - Merge `include` and any extra named params into the top-level object
   * - Derive a top-level `message` for convenience
   *
   * @param params - Composite parameters
   * @param params.error - The error value to format
   * @param params.source - Logical source of the error (logger scope, module, etc.)
   * @param params.include - Optional additional fields to merge into the payload
   * @param params.severity - Optional severity level
   * @returns A serializable error log object
   *
   * @example
   * ```typescript
   * const errorLog = errorLogFactory({
   *   error: new Error('Connection failed'),
   *   source: 'database-connection',
   *   include: { retryCount: 3 }
   * });
   * logger.error(errorLog);
   * ```
   */
  export const errorLogFactory: ({
    error,
    source,
    include,
  }: {
    error: unknown;
    source: string;
    include?: object;
    severity?: string;
  } & Record<string, unknown>) => Record<string, unknown>;
}
