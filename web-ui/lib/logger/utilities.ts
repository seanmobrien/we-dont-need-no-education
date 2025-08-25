/**
 * Logger utilities
 *
 * Provides helpers to detect nested Postgres errors and to generate
 * normalized, serializable error log payloads.
 *
 * Highlights:
 * - getDbError: finds a Postgres-like error in error/cause chains
 * - errorLogFactory: builds a consistent error object with DB details when present
 */
import { getStackTrace } from "../nextjs-util/get-stack-trace";

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
  // Vendor-specific or alternative field names we may remap from
  schema_name?: string;
  column_name?: string;
  table_name?: string;
  query?: string;
  internal_query?: string;
  cause?: unknown;
};

/**
 * Narrow object type used when walking potentially wrapped errors.
 */
interface MaybeWrappedError {
  name?: unknown;
  cause?: unknown;
  error?: unknown;
}

type ErrorLike = { message: string; stack?: string };

const isErrorLike = (val: unknown): val is ErrorLike => {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return typeof obj["message"] === "string";
};

/**
 * Recursively extract a Postgres-like error instance from common wrappers.
 * Checks the value itself, then `.cause`, `.cause.error`, and `.error`.
 */
const extractDbError = (val: unknown): DbError | undefined => {
  if (!val || typeof val !== "object") return undefined;
  const e = val as MaybeWrappedError & { name?: string };
  if (e.name === "PostgresError") return val as DbError;

  // Walk standard wrapping locations
  const fromCause = extractDbError(e.cause);
  if (fromCause) return fromCause;
  /*
  if (e.cause && typeof e.cause === "object") {
    const maybeDeeper = extractDbError((e.cause as MaybeWrappedError).error);
    if (maybeDeeper) return maybeDeeper;
  }
    */
  return extractDbError(e.error);
};

/**
 * Attempts to extract a Postgres/DB error from an unknown thrown value.
 *
 * Supported shapes (any depth):
 * - { name: 'PostgresError', ... }
 * - { cause: { name: 'PostgresError', ... } }
 * - { cause: { error: { name: 'PostgresError', ... } } }
 * - { error: { name: 'PostgresError', ... } }
 *
 * @param error Unknown thrown value (Error, wrapped error, or other)
 * @returns The detected DbError if present, otherwise undefined
 */
export const getDbError = (error: unknown): DbError | undefined => extractDbError(error);

/**
 * Creates a normalized error log payload.
 *
 * Behavior:
 * - If `error` looks like an Error (has `message`), produce `{ message, stack }`
 *   - Use the provided `error.stack` if available
 *   - Otherwise synthesize a stack via `getStackTrace({ skip: 3 })`
 * - If `error` contains a recognized DB error (see `getDbError`), include DB-specific fields:
 *   - name, code, detail, severity
 *   - internalQuery (from `query` or `internal_query`)
 *   - where, schema, table, column, cause
 * - Merge `include` and any extra named params into the top-level object
 * - Derive a top-level `message` for convenience
 *
 * @param params Composite parameters
 * @param params.error The error value to format
 * @param params.source Logical source of the error (logger scope, module, etc.)
 * @param params.include Optional additional fields to merge into the payload
 * @returns A serializable error log object
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
} & Record<string, unknown>) => Record<string, unknown> = ({
  error,
  source,
  include,
  ...params
}) => {
  const ret: Record<string, unknown> = {
    source,
    ...(include ?? {}),
    ...(params ?? {}),
  };
  if (typeof error === 'string'){
    return errorLogFactory({ error: { message: error }, source, include, ...params });
  }
  // if it has a message, it's error-like enough for us
  if (isErrorLike(error)) {
    const hasStack = typeof (error as Record<string, unknown>)["stack"] === "string";
    const stack = hasStack ? (error as { stack: string }).stack : getStackTrace({ skip: 3 });
    let loggedError: Record<string, unknown> = {
      message: error.message,
      stack,
    };
    const dbError = getDbError(error);
    if (dbError) {
      loggedError = {
        ...loggedError,
        name: dbError.name,
        code: dbError.code,
        detail: dbError.detail,
        severity: dbError.severity,
        internalQuery: dbError.query ?? dbError.internal_query ?? dbError.internalQuery,
        where: dbError.where,
        schema: dbError.schema_name ?? dbError.schema,
        table: dbError.table_name ?? dbError.table,
        column: dbError.column_name ?? dbError.column,
        cause: dbError.cause,
      };
    }
    ret.error = loggedError;
    ret.message = loggedError.message as string;
  } else {
    ret.error = error;
    ret.message ??= "Error occurred";
  }
  if (!ret.severity) {
    ret.severity = 'error';
  }
  return ret;
};
