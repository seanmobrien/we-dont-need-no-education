
declare module '@compliance-theater/logger/error/types' {


/**
 * Error context for logging and reporting
 */
export type ErrorContext = {
  userId?: string;
  sessionId?: string;
  source?: string;
  userAgent?: string;
  url?: string;
  timestamp?: Date;
  componentStack?: string;
  errorBoundary?: string;
  breadcrumbs?: string[];
  additionalData?: Record<string, unknown>;
  error?: Error;
} & Record<string, unknown>;
/**
 * Context enricher interface for errors that can provide additional context
 */
export interface IContextEnricher {
  enrichContext(context: ErrorContext): Promise<ErrorContext>;
}

  /**
 * PostgresError represents the shape of an error object returned by
 * PostgreSQL drivers (for example node-postgres / pg) and by wrappers such
 * as Drizzle/driver adapters. It extends the standard JavaScript `Error`
 * with Postgres-specific fields (many mapped from the server's error
 * response) and with optional driver/wrapper additions.
 *
 * This interface is intentionally permissive: most properties are
 * optional because different drivers, connection pools, and Postgres
 * server versions populate different subsets of fields. Code that
 * consumes `PostgresError` should therefore treat fields as possibly
 * `undefined` and use safe checks (optional chaining / strict equality)
 * when making decisions based on the error contents.
 *
 * Common usage patterns:
 * - Inspect `code` (SQLSTATE) to branch on specific error classes
 *   (e.g. '23505' => unique_violation).
 * - Use `detail`, `hint`, and `constraint` for richer diagnostics
 *   (useful when logging or surfacing errors to developers).
 * - The `query` and `parameters` fields (driver/wrapper additions)
 *   may be present and are helpful for retry logic and observability,
 *   but should never be logged in full in production if they contain
 *   sensitive data.
 *
 * Example:
 * ```ts
 * function handleDbError(err: unknown) {
 *   if ((err as PostgresError)?.code === '23505') {
 *     // unique violation - handle conflict
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
 *
 * Notes:
 * - `code` is the SQLSTATE error code (string). See
 *   https://www.postgresql.org/docs/current/errcodes-appendix.html for
 *   semantic meanings (e.g. '23505' = unique_violation).
 * - `position` and `internalPosition` are character offsets (as strings)
 *   returned by the server for parse/compile/runtime errors; they are
 *   usually present for syntax errors only.
 * - Driver/wrapper fields (`query`, `parameters`, `cause`, `originalError`)
 *   are non-standard and may be added by library layers around the raw
 *   driver. Treat them as optional and implementation-specific.
 */
  export interface IPostgresError extends Error {
    /**
     * Always 'DrizzleError' for errors thrown by Drizzle or its adapters.
     */
    name: 'DrizzleError';
    /**
     * SQLSTATE error code reported by Postgres (string). See Postgres
     * documentation for values (e.g. '23505' = unique_violation).
     */
    code?: string;
    /** Severity reported by Postgres (e.g. "ERROR", "FATAL", "PANIC"). */
    severity?: string;
    /** Detailed human-readable error message from Postgres. */
    detail?: string;
    /** An optional hint from Postgres about how to resolve the error. */
    hint?: string;
    /** Position (character offset) of error within the query string (when present). */
    position?: string;
    /** Internal position within a nested/internal query (when present). */
    internalPosition?: string;
    /** The text of the internally generated query (when present). */
    internalQuery?: string;
    /** Where the error occurred (context text), if the server provided it. */
    where?: string;
    /** Schema name related to the error (if applicable). */
    schema?: string;
    /** Table name related to the error (if applicable). */
    table?: string;
    /** Column name related to the error (if applicable). */
    column?: string;
    /** Data type name related to the error (if applicable). */
    dataType?: string;
    /** Constraint name when the error is a constraint violation. */
    constraint?: string;
    /** Source filename reported by Postgres server (internal). */
    file?: string;
    /** Source line number reported by Postgres server (internal). */
    line?: string;
    /** Source routine reported by Postgres server (internal). */
    routine?: string;
    /** The SQL text the driver executed (if the wrapper recorded it). */
    query?: string;
    /** The bound parameters for `query`, if recorded by the wrapper/driver. */
    parameters?: unknown[];
    /** Cause or wrapped error object (when an adapter wraps the original error). */
    cause?: unknown;
    /** Original lower-level error if the wrapper preserved it. */
    originalError?: unknown;
  }
}
