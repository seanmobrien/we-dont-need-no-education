// Documentation is authoritative in: lib/react-util/errors/logged-error.d.ts
// The runtime implementation remains here. Keep implementation edits minimal.

import { errorLogFactory, log } from '/lib/logger';
import { isAbortError, isError } from './../../utility-methods';
import { getStackTrace } from '/lib/nextjs-util/get-stack-trace';
import { asKnownSeverityLevel } from '/lib/logger/constants';
import { reporter } from './../logged-error-reporter';
import { TurtleRecursionParams, LoggedErrorOptions } from './types';

/**
 * A unique symbol used to brand `LoggedError` class instances for runtime type checking.
 *
 * This symbol ensures that `LoggedError` instances can be reliably identified even
 * across different JavaScript execution contexts or when serialized/deserialized.
 *
 * @private
 * @readonly
 */
const brandLoggedError = Symbol.for('@no-education/LoggedError');
/**
 * The underlying Error object that this LoggedError wraps.
 *
 * This contains the original error information including message, stack trace,
 * and other properties. The LoggedError acts as a proxy to this underlying error
 * while adding enhanced functionality.
 *
 * @private
 * @readonly
 */
const INNER_ERROR = Symbol.for('@no-education/LoggedError::InnerError');
/**
 * Whether this error is classified as critical.
 *
 * Critical errors indicate serious system failures that may require immediate
 * attention, alerting, or special handling procedures. Non-critical errors
 * are typically logged but don't trigger emergency responses.
 *
 * @private
 * @readonly
 */
const CRITICAL = Symbol.for('@no-education/LoggedError::CriticalFlag');

// LoggedError class implementation.  Type and extensive documentation in .d.ts.
export class LoggedError implements Error {
  // Type guard to check if an object is a LoggedError instance.
  static isLoggedError(e: unknown): e is LoggedError {
    return (
      typeof e === 'object' &&
      !!e &&
      brandLoggedError in e &&
      e[brandLoggedError] === true
    );
  }

  // Recursively unwraps nested errors and ensures the result is a LoggedError.
  static isTurtlesAllTheWayDownBaby(
    e: unknown,
    {
      log: shouldLog = false,
      relog = false,
      logCanceledOperation = false,
      source = 'Turtles, baby',
      message,
      critical,
      ...itsRecusionMan
    }: TurtleRecursionParams = { log: false },
  ): LoggedError {
    if (
      arguments.length === 1 &&
      typeof e === 'object' &&
      e !== null &&
      'error' in e &&
      isError(e.error) &&
      ('critical' in e || 'log' in e || 'source' in e)
    ) {
      // We've been passed a composite error object...extract error and try again
      const { error: theError, ...allTheRest } = e;
      return LoggedError.isTurtlesAllTheWayDownBaby(
        theError,
        allTheRest as TurtleRecursionParams,
      );
    }
    const isLoggedError = LoggedError.isLoggedError(e);
    if (shouldLog && (!isLoggedError || relog !== true)) {
      if (!isError(e)) {
        log((l) =>
          l.warn({ message: 'Some bonehead threw a not-error', error: e }),
        );
      }
      if (logCanceledOperation || !isAbortError(e)) {
        const logObject = errorLogFactory({
          error: e,
          source,
          message,
          ...itsRecusionMan,
        });
        reporter()
          .then((instance) => {
            instance.reportError({
              error: e,
              severity: asKnownSeverityLevel(logObject.severity),
              context: {
                source,
                message,
                stack: getStackTrace({ skip: 2 }),
                ...itsRecusionMan,
              },
            });
          })
          .catch((fail) => {
            log((l) => l.error('Failed to report error', { error: fail }));
          });
      }
    }
    if (isLoggedError) {
      return e;
    }
    return isError(e)
      ? new LoggedError(e, { critical })
      : new LoggedError(new Error(String(e)));
  }

  // Builds a descriptive message from various input types, handling recursion and cycles.
  static buildMessage(options: unknown, visited?: Set<unknown>): string {
    if (!options) {
      return 'null or undefined error';
    }
    if (isError(options)) {
      return options.message;
    }
    if (typeof options === 'object' && options !== null && 'error' in options) {
      if (!visited) {
        visited = new Set();
      }
      if (visited.has(options)) {
        return '[circular error reference]';
      }
      visited.add(options);
      return this.buildMessage(options.error as unknown, visited);
    }
    return options.toString();
  }

  // Customizes the string tag for better identification in logs and debuggers.
  public get [Symbol.toStringTag](): string {
    const getWithFallback = (propName: string | symbol) => {
      const valueWithFallback =
        (propName in this
          ? (this as Record<string | symbol, unknown>)[propName]
          : undefined) ??
        (this[INNER_ERROR] && propName in this[INNER_ERROR]
          ? this[INNER_ERROR][propName as keyof Error]
          : undefined) ??
        undefined;
      return valueWithFallback ? String(valueWithFallback) : undefined;
    };
    const _fingerprintValue = getWithFallback('fingerprint');
    const _sourceValue = getWithFallback('source');

    return `LoggedError${
      _fingerprintValue ? ` (Fingerprint: ${_fingerprintValue}) ` : ''
    }${_sourceValue ? ` [Source: ${_sourceValue}] ` : ''}: ${
      this[CRITICAL] ? 'CRITICAL - ' : ''
    }${LoggedError.buildMessage(this)}`;
  }

  // Constructor overloads to handle various input scenarios.
  constructor(
    message: string | LoggedErrorOptions | Error,
    options?:
      | (Omit<LoggedErrorOptions, 'error'> &
          Partial<Pick<LoggedErrorOptions, 'error'>>)
      | Error,
  ) {
    let ops: LoggedErrorOptions;
    if (typeof message === 'string') {
      if (options) {
        if (isError(options)) {
          ops = { error: options, critical: true };
        } else if (options.error) {
          ops = options as LoggedErrorOptions;
        } else {
          throw new TypeError("LoggedError requires an 'error' property");
        }
      } else {
        ops = { error: new Error(message), critical: true };
      }
    } else {
      ops = isError(message) ? { error: message, critical: true } : message;
    }
    this[INNER_ERROR] = ops.error;
    this[CRITICAL] = ops.critical ?? true;

    if (!this[INNER_ERROR]) {
      throw new TypeError("LoggedError requires an 'error' property");
    }
    Object.entries(this[INNER_ERROR]).forEach(([key, value]) => {
      if (!(key in this) && typeof value !== 'function') {
        if (typeof key === 'string' || typeof key === 'symbol') {
          this[key as string | symbol] = value;
        }
      }
    });
    if (
      isError(this[INNER_ERROR].cause) &&
      this[INNER_ERROR].cause.name === 'PostgresError'
    ) {
      Object.entries(this[INNER_ERROR]).forEach(([key, value]) => {
        if (!(key in this) && !!value && typeof value !== 'function') {
          if (typeof key === 'string' || typeof key === 'symbol') {
            if (!this[key as string | symbol]) {
              this[key as string | symbol] = value;
            }
          }
        }
      });
    }
  }

  // Private properties to store error details and metadata.
  [CRITICAL]: boolean = true;
  // The original error being wrapped.
  [INNER_ERROR]: Error;
  // Branding symbol to identify instances of LoggedError.
  [brandLoggedError] = true;
  // Allow dynamic properties from the inner error to be accessible on this instance.
  [key: string | symbol]: unknown;
  // Proxy properties to access underlying error details.
  get error(): Error {
    return this[INNER_ERROR]!;
  }
  // Indicates if the error is critical.
  get critical(): boolean {
    return this[CRITICAL];
  }
  // Proxy standard Error properties to the inner error.
  get name(): string {
    const ret = this[INNER_ERROR]?.name;
    if (
      ret === 'Error' &&
      this[INNER_ERROR]?.cause &&
      isError(this[INNER_ERROR].cause) &&
      this[INNER_ERROR].cause.name === 'PostgresError'
    ) {
      return this[INNER_ERROR].cause.name;
    }
    return this[INNER_ERROR]?.name ?? 'Error';
  }
  // The cause of the error, if any.
  get cause() {
    return this[INNER_ERROR].cause;
  }
  // The stack trace of the error.
  get stack(): string {
    return this[INNER_ERROR].stack ?? 'no stack trace available';
  }
  // The error message.
  get message(): string {
    return this[INNER_ERROR]?.message ?? 'LoggedError: Missing logged error.';
  }
}
// Utility function to recursively dump error details for logging.
export const dumpError = (e: unknown): string => {
  let ret = '';
  if (isError(e)) {
    ret = e.message ?? 'no message';
    if (e.cause) {
      ret += `\nCaused by: ${dumpError(e.cause)}`;
    }
  } else if (typeof e === 'object' && e !== null) {
    ret = JSON.stringify(e, null, 5);
  } else {
    ret = String(e);
  }
  return ret;
};
