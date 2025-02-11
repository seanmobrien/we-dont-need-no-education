import { isNeonDbError } from 'lib/neondb/_guards';

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
}) => Record<string, unknown> = ({ error, source, include }) => {
  const ret: Record<string, unknown> = {
    source,
    ...(include ?? {}),
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
    if (isNeonDbError(error)) {
      loggedError = {
        ...loggedError,
        name: error.name,
        code: error.code,
        detail: error.detail,
        severity: error.severity,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
      };
      if (error.sourceError) {
        loggedError.sourceError = {
          message: error.sourceError.message,
          stack: error.sourceError.stack,
        };
      }
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
