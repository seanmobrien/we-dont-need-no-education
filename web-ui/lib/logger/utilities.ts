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
import { getStackTrace } from '../nextjs-util/get-stack-trace';

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
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return typeof obj['message'] === 'string';
};

/**
 * Recursively extract a Postgres-like error instance from common wrappers.
 * Checks the value itself, then `.cause`, `.cause.error`, and `.error`.
 */
const extractDbError = (val: unknown): DbError | undefined => {
  if (!val || typeof val !== 'object') return undefined;
  const e = val as MaybeWrappedError & { name?: string };
  if (e.name === 'PostgresError') return val as DbError;

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
export const getDbError = (error: unknown): DbError | undefined =>
  extractDbError(error);

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
  if (typeof error === 'string') {
    return errorLogFactory({
      error: { message: error },
      source,
      include,
      ...params,
    });
  }
  const defaultError = 'An unexpected error occurred.';
  // if it has a message, it's error-like enough for us
  if (isErrorLike(error)) {
    const stack =
      typeof error['stack'] === 'string'
        ? (error['stack']?.toString() ?? getStackTrace({ skip: 2 }))
        : '';
    const message =
      error['message']?.toString() ?? 'An unknown error occurred.';
    let loggedError: Record<string, unknown> = {
      message,
      stack,
      ...(('cause' in error &&
      typeof error['cause'] === 'object' &&
      error['cause'] !== null
        ? { cause: JSON.stringify(error['cause']) }
        : {}) as Record<string, unknown>),
    };

    const dbError = getDbError(error);
    if (dbError) {
      loggedError = {
        ...loggedError,
        name: 'name' in dbError ? dbError.name : undefined,
        code: dbError.code,
        detail: dbError.detail,
        severity: dbError.severity,
        internalQuery:
          dbError.query ?? dbError.internal_query ?? dbError.internalQuery,
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
    ret.error = JSON.stringify(error ?? 'null');
    ret.message ??= defaultError;
  }
  if (!ret.severity) {
    ret.severity = 'error';
  }
  if (
    ret.error &&
    typeof ret.error === 'object' &&
    Object.keys(ret.error).length === 0
  ) {
    ret.error = {
      message:
        typeof ret.context === 'object' &&
        ret.context &&
        'message' in ret.context &&
        ret.context
          ? (ret.context.message ?? defaultError)
          : defaultError,
    };
  }
  return ret;
};
