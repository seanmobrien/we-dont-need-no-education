// Simple stack trace helper to avoid external dependencies
export const getStackTrace = (options?: { skip?: number }): string => {
  const stack = new Error().stack || '';
  if (!options?.skip) return stack;
  const lines = stack.split('\n');
  return lines.slice(options.skip + 1).join('\n');
};

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

const extractDbError = (val: unknown): DbError | undefined => {
  if (!val || typeof val !== 'object') return undefined;
  const e = val as MaybeWrappedError & { name?: string };
  if (e.name === 'PostgresError') return val as DbError;

  // Walk standard wrapping locations
  const fromCause = extractDbError(e.cause);
  return fromCause ? fromCause : extractDbError(e.error);
};

export const getDbError = (error: unknown): DbError | undefined =>
  extractDbError(error);

export const errorLogFactory: (props: {
  error: unknown;
  source: string;
  message?: string;
  include?: object;
  severity?: string;
} & Record<string, unknown>) => Record<string, unknown> = ({
  error,
  source,
  include,
  message: messageFromProps,
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
        message: messageFromProps,
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
      const message = messageFromProps
        ? `${messageFromProps}: ${error['message']?.toString() ?? defaultError}`
        : error['message']?.toString() ?? defaultError;
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
      ret.message ??= (messageFromProps ?? defaultError);
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
