import { errorLogFactory, log } from '@/lib/logger';
import { isError } from '../_utility-methods';

/**
 * A unique symbol used to brand the `LoggedError` class instances.
 */
const brandLoggedError: unique symbol = Symbol('LoggedError');

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
};

export class LoggedError extends Error {
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
      source = 'Turtles, baby',
      message,
      critical,
      ...itsRecusionMan
    }: TurtleRecurisionParams = { log: false },
  ): LoggedError {
    if (LoggedError.isLoggedError(e)) {
      return e;
    }
    if (shouldLog) {
      if (!isError(e)) {
        log((l) =>
          l.warn({ message: 'Some bonehead threw a not-error', error: e }),
        );
      }
      const logObject = errorLogFactory({
        error: e,
        source,
        message,
        ...itsRecusionMan,
      });
      log((l) => l.error(logObject.message ?? 'Error occurred', logObject));
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
    super(
      typeof message === 'string' ? message : LoggedError.buildMessage(message),
      typeof message === 'object'
        ? isError(message)
          ? undefined
          : options
        : options,
    );
    let ops: LoggedErrorOptions;
    if (typeof message === 'string') {
      if (!options) {
        throw new Error('LoggedError requires an error object');
      }
      if (isError(options)) {
        ops = { error: options, critical: true };
      } else if (options.error) {
        ops = options as LoggedErrorOptions;
      } else {
        throw new TypeError("LoggedError requires an 'error' property");
      }
    } else {
      ops = isError(message) ? { error: message, critical: true } : message;
    }
    this.#critical = ops.critical ?? true;
    this.#error = ops.error;
    this[Symbol.toStringTag] = this.message;
  }

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

  /**
   * Gets the error message associated with the Logged error.
   *
   * @returns {string} The error message associated with the Logged error.
   */
  get message(): string {
    return this.#error.message;
  }
}
