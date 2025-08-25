import { errorLogFactory, log } from '@/lib/logger';
import { isAbortError, isError } from '../_utility-methods';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
import { ErrorReporter } from '@/lib/error-monitoring/error-reporter';
import { asKnownSeverityLevel } from '@/lib/logger/constants';

/**
 * A unique symbol used to brand the `LoggedError` class instances.
 */
const brandLoggedError: unique symbol = Symbol('LoggedError');

const loggedErrorReporter = ErrorReporter.createInstance({ 
  enableStandardLogging: false,
  enableConsoleLogging: false,
  enableExternalReporting: typeof window === 'undefined',
  enableLocalStorage: false,
});

/**
 * Options for specifying details about a validation error.
 *
 * @property {string} [field] - The name of the field that caused the validation error.
 * @property {unknown} [value] - The value that failed validation.
 * @property {unknown} [expected] - The expected value or condition that the value failed to meet.
 * @property {string} [reason] - A human-readable explanation of why the validation failed.
 * @property {string} [source] - The source of the validation error, such as the function or module where it occurred.
 */
export type LoggedErrorOptions = ErrorOptions & {
  error: Error;
  critical?: boolean;
};

type TurtleRecurisionParams = Record<string, unknown> & {
  log: boolean;
  source?: string;
  message?: string;
  critical?: boolean;
  logCanceledOperation?: boolean;
};

/**
 * Represents a custom error that logs additional information.
 *
 * @remarks
 * This class extends the built-in `Error` class to provide additional logging capabilities.
 * It includes methods to check if an error is a `LoggedError`, wrap errors in a `LoggedError`,
 * and build error messages from options.
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Something went wrong');
 * } catch (e) {
 *   const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(e, { log: true });
 *   console.error(loggedError);
 * }
 * ```
 *
 * @public
 */
export class LoggedError implements Error {
  /**
   * Checks if the given error is an instance of `ValidationError`.
   *
   * @param {unknown} e - The error to check.
   * @returns {boolean} `true` if the error is an instance of `ValidationError`, otherwise `false`.
   */
  static isLoggedError(e: unknown): e is LoggedError {
    return (
      typeof e === 'object' &&
      !!e &&
      brandLoggedError in e &&
      e[brandLoggedError] === true
    );
  }

  /**
   * Determines if the provided error is an instance of `Error` and returns a `LoggedError` instance.
   * If the provided error is not an instance of `Error`, it creates a new `Error` with the string representation of the input.
   *
   * The function name "isTurtlesAllTheWayDownBaby" is a reference to the metaphorical expression "turtles all the way down",
   * which is used to illustrate the problem of infinite regress in cosmology and other fields. In this context, it humorously
   * suggests that the function will handle errors recursively, ensuring that any input is ultimately wrapped in a `LoggedError`.
   *
   * @param e - The error to be checked and wrapped.
   * @returns A `LoggedError` instance.
   */
  static isTurtlesAllTheWayDownBaby(
    e: unknown,
    {
      log: shouldLog = false,
      logCanceledOperation = false,
      source = 'Turtles, baby',
      message,
      critical,
      ...itsRecusionMan
    }: TurtleRecurisionParams = { log: false },
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
        allTheRest as TurtleRecurisionParams,
      );
    }
    if (LoggedError.isLoggedError(e)) {
      return e;
    }
    if (shouldLog) {
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
          stack: getStackTrace({ skip: 2 }),
          ...itsRecusionMan,
        });        
        loggedErrorReporter.reportError({
          error: e,
          severity: asKnownSeverityLevel(logObject.severity),
          context: {
            source,
            message,
            stack: getStackTrace({ skip: 2 }),
            ...itsRecusionMan,
          },
        });
        log((l) => l.error(logObject.message ?? 'Error occurred', logObject));
      }
    }
    return isError(e)
      ? new LoggedError(e, { critical })
      : new LoggedError(new Error(String(e)));
  }

  /**
   * Builds a Logged error message from the given options.
   *
   * @param {LoggedErrorOptions | Error} options - The options to build the message from.
   * @returns {string} The constructed Logged error message.
   */
  static buildMessage(options: LoggedErrorOptions | Error): string {
    return 'error' in options ? options.error.message : options.message;
  }

  #critical: boolean;
  #error: Error;
  readonly [brandLoggedError] = true;
  [Symbol.toStringTag]: string = 'LoggedError';
  /**
   * Constructs a new instance of `LoggedError`.
   *
   * @param {string | LoggedErrorOptions} message - The error message or options to build the message from.
   * @param {LoggedErrorOptions} [options] - Additional options for the Logged error.
   */
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
    this.#critical = ops.critical ?? true;
    this.#error = ops.error;
    this[Symbol.toStringTag] = this.message;
    if (!this.#error) {
      throw new TypeError("LoggedError requires an 'error' property");
    }
    Object.entries(this.#error).forEach(([key, value]) => {
      if (!(key in this) && typeof value !== 'function') {
        if (typeof key === 'string' || typeof key === 'symbol') {
          this[key as string | symbol] = value;
        }
      }
    });
  }
  /**
   * Index signature to allow dynamic property access, enabling 'cloning' of the error object.
   */
  [key: string | symbol]: unknown;

  /**
   * Gets the field associated with the Logged error.
   *
   * @returns {string} The field associated with the Logged error.
   */
  get error(): Error {
    return this.#error;
  }
  /**
   * Gets the source of the Logged error.
   *
   * @returns {string} The source of the Logged error.
   */
  get critical(): boolean {
    return this.#critical;
  }
  get name(): string {
    return this.#error.name;
  }
  get cause() {
    return this.#error.cause;
  }
  /**
   * Gets the stack trace associated with the Logged error.
   *
   * @returns {string} The stack trace associated with the Logged error.
   */
  get stack(): string {
    return this.#error.stack ?? 'no stack trace available';
  }
  /**
   * Gets the error message associated with the Logged error.
   *
   * @returns {string} The error message associated with the Logged error.
   */
  get message(): string {
    return this.#error.message;
  }
}

export const dumpError = (e: unknown): string => {
  let ret = '';
  if (isError(e)) {
    ret = e.message ?? 'no message';
    if (e.cause){
      ret += `\nCaused by: ${dumpError(e.cause)}`;
    }
  } else if (typeof e === 'object' && e !== null) {
    ret = JSON.stringify(e, null, 5);
  } else {
    ret = String(e);
  }
  return ret;
};

// Re-export utility functions for convenience
export { isAbortError } from '../_utility-methods';
