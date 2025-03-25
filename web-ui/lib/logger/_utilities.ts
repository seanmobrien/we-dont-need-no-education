type DbError = Error & {
  code: number;
  detail: string;
  severity: number | string;
  internalQuery: string;
  where: string;
  schema: string;
  table: string;
  column: string;
  schema_name: string;
  column_name: string;
  table_name: string;
  query: string;
  internal_query: string;
};

export const isDbError = (error: unknown): error is DbError =>
  !!error &&
  typeof error === 'object' &&
  'name' in error &&
  error.name === 'PostgresError';

/**
 * Creates an error log object with the provided error, source, and additional information.
 *
 * @param {Object} params - The parameters for the error log.
 * @param {unknown} params.error - The error object to log.
 * @param {string} params.source - The source of the error.
 * @param {object} [params.include] - Additional information to include in the log.
 * @returns {Record<string, unknown>} The constructed error log object.
 */
export const errorLogFactory: ({
  error,
  source,
  include,
}: {
  error: unknown;
  source: string;
  include?: object;
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
  // if it has a message and a stack, it's error-like enough for us
  if (
    !!error &&
    typeof error === 'object' &&
    'message' in error &&
    'stack' in error
  ) {
    let loggedError: Record<string, unknown> = {
      message: error.message,
      stack: error.stack,
    };
    if (isDbError(error)) {
      loggedError = {
        ...loggedError,
        name: error.name,
        code: error.code,
        detail: error.detail,
        severity: error.severity,
        internalQuery: error.query ?? error.internal_query,
        where: error.where,
        schema: error.schema_name,
        table: error.table_name,
        column: error.column_name,
        cause: error.cause,
      };
    }
    ret.error = loggedError;
  } else {
    ret.error = error;
  }
  ret.message =
    !!ret.error && typeof ret.error === 'object' && 'message' in ret.error
      ? ret.error.message
      : 'Error occurred';
  return ret;
};
