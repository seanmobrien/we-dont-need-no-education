/**
 * @fileoverview LoggedError - Enhanced error handling with automatic logging and reporting
 *
 * This module provides the `LoggedError` class, which extends standard JavaScript errors
 * with automatic logging, error reporting, and enhanced debugging capabilities. It includes
 * sophisticated error normalization, recursive error handling, and integration with the
 * application's logging and monitoring infrastructure.
 *
 * Key features:
 * - Automatic error logging with configurable severity levels
 * - Integration with error reporting services
 * - Recursive error wrapping and normalization
 * - Stack trace preservation and enhancement
 * - Support for critical vs non-critical error classification
 * - Abort signal handling for canceled operations
 * - Dynamic property cloning from wrapped errors
 *
 * @module LoggedError
 * @version 1.0.0
 * @since 2024
 *
 * @example
 * ```typescript
 * // Basic usage
 * try {
 *   throw new Error('Something went wrong');
 * } catch (e) {
 *   const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(e, {
 *     log: true,
 *     source: 'MyModule'
 *   });
 *   throw loggedError;
 * }
 *
 * // Direct construction
 * const criticalError = new LoggedError('Critical failure', {
 *   error: originalError,
 *   critical: true
 * });
 *
 * // Check error type
 * if (LoggedError.isLoggedError(someError)) {
 *   console.log('This is a logged error:', someError.critical);
 * }
 * ```
 */

import { errorLogFactory, log } from '@/lib/logger';
import { isAbortError, isError } from '../utility-methods';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
import { asKnownSeverityLevel } from '@/lib/logger/constants';
import { reporter } from './logged-error-reporter';

/**
 * A unique symbol used to brand `LoggedError` class instances for runtime type checking.
 *
 * This symbol ensures that `LoggedError` instances can be reliably identified even
 * across different JavaScript execution contexts or when serialized/deserialized.
 *
 * @internal
 * @readonly
 */
const brandLoggedError: unique symbol = Symbol('LoggedError');

/**
 * Configuration options for creating a `LoggedError` instance.
 *
 * Extends the standard `ErrorOptions` interface to include additional
 * properties specific to logged error handling and reporting.
 *
 * @interface LoggedErrorOptions
 * @extends {ErrorOptions}
 *
 * @property {Error} error - The underlying error object to wrap. This is required
 *   and serves as the source of the error message, stack trace, and other properties.
 *
 * @property {boolean} [critical=true] - Indicates whether this error should be
 *   treated as critical. Critical errors may trigger additional alerting,
 *   monitoring, or recovery procedures.
 *
 * @example
 * ```typescript
 * const options: LoggedErrorOptions = {
 *   error: new Error('Database connection failed'),
 *   critical: true,
 *   cause: originalError
 * };
 * ```
 */
export type LoggedErrorOptions = ErrorOptions & {
  error: Error;
  critical?: boolean;
};

/**
 * Parameters for the recursive error handling method `isTurtlesAllTheWayDownBaby`.
 *
 * This type defines the configuration options for the sophisticated error wrapping
 * and logging functionality. It includes options for logging behavior, error
 * classification, and contextual information.
 *
 * @internal
 * @interface TurtleRecurisionParams
 *
 * @property {boolean} log - Whether to automatically log the error when wrapping it.
 *   When true, the error will be logged with appropriate severity level and
 *   reported to monitoring services.
 *
 * @property {string} [source] - The source context where the error occurred.
 *   This helps identify the module, function, or operation that generated the error.
 *   Defaults to 'Turtles, baby' if not specified.
 *
 * @property {string} [message] - Additional message to include with the error.
 *   This can provide context about what operation was being performed when the error occurred.
 *
 * @property {boolean} [critical] - Whether to mark the wrapped error as critical.
 *   Critical errors may trigger additional alerting or recovery procedures.
 *
 * @property {boolean} [logCanceledOperation=false] - Whether to log errors that are
 *   identified as abort/cancellation errors. Typically, canceled operations are
 *   not logged to reduce noise, but this can be overridden.
 *
 * @example
 * ```typescript
 * const params: TurtleRecurisionParams = {
 *   log: true,
 *   source: 'DatabaseService',
 *   message: 'Failed to connect to database',
 *   critical: true,
 *   userId: 'user123'
 * };
 * ```
 */
type TurtleRecurisionParams = Record<string, unknown> & {
  log: boolean;
  source?: string;
  message?: string;
  critical?: boolean;
  logCanceledOperation?: boolean;
};

/**
 * Enhanced error class that provides automatic logging, error reporting, and debugging capabilities.
 *
 * `LoggedError` wraps standard JavaScript errors with additional functionality including:
 * - Automatic logging with configurable severity levels
 * - Integration with error reporting services
 * - Stack trace preservation and enhancement
 * - Critical vs non-critical error classification
 * - Dynamic property cloning from wrapped errors
 * - Recursive error handling and normalization
 *
 * The class implements the standard `Error` interface while adding enhanced functionality
 * for enterprise-grade error handling. It's designed to be used throughout the application
 * as a replacement for standard `Error` objects when additional logging and monitoring
 * capabilities are needed.
 *
 * @class LoggedError
 * @implements {Error}
 *
 * @example
 * ```typescript
 * // Wrap an existing error with logging
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
 *     log: true,
 *     source: 'UserService',
 *     critical: true
 *   });
 * }
 *
 * // Create a new logged error
 * const error = new LoggedError('Operation failed', {
 *   error: new Error('Underlying cause'),
 *   critical: false
 * });
 *
 * // Check error properties
 * if (error.critical) {
 *   await alertOnCallPersonnel();
 * }
 * ```
 *
 * @public
 */
export class LoggedError implements Error {
  /**
   * Runtime type guard to determine if an unknown value is a `LoggedError` instance.
   *
   * This method uses the internal branding symbol to reliably identify `LoggedError`
   * instances, even across different JavaScript execution contexts. It's more reliable
   * than `instanceof` checks which can fail with serialized/deserialized objects
   * or objects from different realms.
   *
   * @static
   * @method isLoggedError
   *
   * @param {unknown} e - The value to check. Can be any type including null, undefined,
   *   primitives, objects, or error instances.
   *
   * @returns {e is LoggedError} Type predicate that narrows the type to `LoggedError`
   *   if the check passes. Returns `true` if the value is a `LoggedError`, `false` otherwise.
   *
   * @example
   * ```typescript
   * function handleError(error: unknown) {
   *   if (LoggedError.isLoggedError(error)) {
   *     // TypeScript now knows error is LoggedError
   *     console.log('Critical error:', error.critical);
   *     console.log('Source error:', error.error.message);
   *   } else {
   *     console.log('Unknown error type:', error);
   *   }
   * }
   * ```
   *
   * @since 1.0.0
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
   * Comprehensive error wrapping and normalization method with automatic logging and reporting.
   *
   * This is the primary method for handling errors throughout the application. It provides
   * sophisticated error handling capabilities including:
   * - Automatic error normalization (converts any value to a proper Error)
   * - Recursive error unwrapping and rewrapping
   * - Configurable logging with severity detection
   * - Integration with error reporting services
   * - Abort signal detection and handling
   * - Stack trace enhancement
   *
   * The whimsical method name "isTurtlesAllTheWayDownBaby" is a reference to the
   * cosmological metaphor "turtles all the way down," representing infinite recursive
   * structures. In this context, it humorously indicates the method's ability to
   * handle arbitrarily nested error structures and ensure consistent error handling
   * no matter how deep the error chain goes.
   *
   * @static
   * @method isTurtlesAllTheWayDownBaby
   *
   * @param {unknown} e - The error or value to be wrapped. Can be:
   *   - An existing `LoggedError` (returned as-is)
   *   - A standard `Error` object (wrapped in LoggedError)
   *   - A composite error object with `error` property
   *   - Any other value (converted to Error then wrapped)
   *
   * @param {TurtleRecurisionParams} [options] - Configuration options for error handling:
   * @param {boolean} [options.log=false] - Whether to log the error automatically
   * @param {boolean} [options.logCanceledOperation=false] - Whether to log abort/cancel errors
   * @param {string} [options.source='Turtles, baby'] - Source context for the error
   * @param {string} [options.message] - Additional context message
   * @param {boolean} [options.critical] - Whether to mark the error as critical
   * @param {...unknown} [options.itsRecusionMan] - Additional metadata to include
   *
   * @returns {LoggedError} A `LoggedError` instance wrapping the input error,
   *   with all specified logging and reporting completed.
   *
   * @example
   * ```typescript
   * // Basic error wrapping with logging
   * try {
   *   await dangerousOperation();
   * } catch (error) {
   *   throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
   *     log: true,
   *     source: 'PaymentProcessor',
   *     critical: true
   *   });
   * }
   *
   * // Handle composite error objects
   * const compositeError = {
   *   error: new Error('Connection failed'),
   *   critical: true,
   *   userId: 'user123'
   * };
   * const wrapped = LoggedError.isTurtlesAllTheWayDownBaby(compositeError);
   *
   * // Non-error values are automatically converted
   * const stringError = LoggedError.isTurtlesAllTheWayDownBaby(
   *   'Something went wrong',
   *   { log: true }
   * );
   * ```
   *
   * @throws {never} This method never throws; it always returns a LoggedError
   *
   * @since 1.0.0
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
    return isError(e)
      ? new LoggedError(e, { critical })
      : new LoggedError(new Error(String(e)));
  }

  /**
   * Constructs an error message from various input types.
   *
   * This utility method normalizes different types of input into a consistent
   * string error message. It handles various edge cases and input types gracefully,
   * ensuring that a meaningful message can always be extracted.
   *
   * @static
   * @method buildMessage
   *
   * @param {unknown} options - The input to extract a message from. Can be:
   *   - `null` or `undefined` (returns default message)
   *   - An `Error` object (returns the `message` property)
   *   - An object with an `error` property (recursively extracts from the error)
   *   - Any other value (converted to string representation)
   *
   * @returns {string} A string representation of the error message. Never returns
   *   null or undefined; always provides a meaningful string.
   *
   * @example
   * ```typescript
   * // Handle various input types
   * LoggedError.buildMessage(null); // "null or undefined error"
   * LoggedError.buildMessage(new Error('Failed')); // "Failed"
   * LoggedError.buildMessage({ error: new Error('Nested') }); // "Nested"
   * LoggedError.buildMessage('String error'); // "String error"
   * LoggedError.buildMessage(42); // "42"
   *
   * // Use in error construction
   * const message = LoggedError.buildMessage(unknownError);
   * const error = new LoggedError(message, { error: baseError });
   * ```
   *
   * @since 1.0.0
   */
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
      return this.buildMessage(options.error, visited);
    }
    return options.toString();
  }

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
  #critical: boolean;

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
  #error: Error;

  /**
   * Branding property for runtime type identification.
   *
   * This readonly property allows the static `isLoggedError` method to reliably
   * identify LoggedError instances even across different execution contexts.
   *
   * @readonly
   * @internal
   */
  readonly [brandLoggedError] = true;

  /**
   * Symbol.toStringTag implementation for better debugging.
   *
   * This property affects how the object appears in `Object.prototype.toString.call()`
   * and debugging tools, making LoggedError instances easily identifiable.
   *
   * @readonly
   */
  [Symbol.toStringTag]: string = 'LoggedError';
  /**
   * Constructs a new `LoggedError` instance with enhanced error handling capabilities.
   *
   * The constructor provides flexible initialization options, accepting various
   * combinations of messages, errors, and configuration options. It automatically
   * handles error normalization and property cloning from the underlying error.
   *
   * @constructor
   *
   * @param {string | LoggedErrorOptions | Error} message - The error initialization parameter:
   *   - `string`: Error message (requires `options` with `error` property)
   *   - `LoggedErrorOptions`: Complete configuration object with required `error` property
   *   - `Error`: Existing error to wrap (marked as critical by default)
   *
   * @param {Object} [options] - Additional configuration options:
   * @param {Error} [options.error] - Required when `message` is a string; the underlying error
   * @param {boolean} [options.critical=true] - Whether to mark this error as critical
   * @param {unknown} [options.cause] - The cause of this error (standard ErrorOptions)
   *
   * @throws {TypeError} Thrown when the constructor cannot determine a valid Error object
   *   to wrap. This happens when:
   *   - `message` is a string but `options.error` is not provided
   *   - The resolved error object is null or undefined
   *
   * @example
   * ```typescript
   * // Create from string message and error
   * const error1 = new LoggedError('Operation failed', {
   *   error: new Error('Database connection lost'),
   *   critical: true
   * });
   *
   * // Wrap existing error
   * const originalError = new Error('Network timeout');
   * const error2 = new LoggedError(originalError); // Automatically critical
   *
   * // Use complete options object
   * const error3 = new LoggedError({
   *   error: new Error('Validation failed'),
   *   critical: false,
   *   cause: originalCause
   * });
   *
   * // String with options (error required)
   * const error4 = new LoggedError('Custom message', {
   *   error: new Error('Underlying issue')
   * });
   * ```
   *
   * @since 1.0.0
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
    if (
      isError(this.#error.cause) &&
      this.#error.cause.name === 'PostgresError'
    ) {
      Object.entries(this.#error).forEach(([key, value]) => {
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
  /**
   * Index signature to allow dynamic property access from the wrapped error.
   *
   * This enables the LoggedError to act as a transparent proxy to the underlying
   * error object, allowing access to any additional properties that may have
   * been set on the original error. Properties are copied during construction.
   *
   * @example
   * ```typescript
   * const originalError = new Error('Failed');
   * originalError.code = 'ERR_CONNECTION';
   * originalError.details = { host: 'localhost', port: 5432 };
   *
   * const loggedError = new LoggedError(originalError);
   * console.log(loggedError.code); // 'ERR_CONNECTION'
   * console.log(loggedError.details); // { host: 'localhost', port: 5432 }
   * ```
   */
  [key: string | symbol]: unknown;

  /**
   * Gets the underlying Error object that this LoggedError wraps.
   *
   * This provides access to the original error that was wrapped by the LoggedError.
   * The returned error contains the original message, stack trace, and any other
   * properties that were present on the source error.
   *
   * @readonly
   * @returns {Error} The underlying Error object with all its original properties
   *
   * @example
   * ```typescript
   * const original = new Error('Database connection failed');
   * const logged = new LoggedError(original);
   *
   * console.log(logged.error === original); // true
   * console.log(logged.error.message); // 'Database connection failed'
   * ```
   *
   * @since 1.0.0
   */
  get error(): Error {
    return this.#error;
  }

  /**
   * Gets the critical classification of this error.
   *
   * Critical errors indicate serious system failures that may require immediate
   * attention, monitoring alerts, or special handling procedures. Non-critical
   * errors are typically logged for debugging purposes but don't trigger
   * emergency response protocols.
   *
   * @readonly
   * @returns {boolean} `true` if this error is classified as critical, `false` otherwise
   *
   * @example
   * ```typescript
   * const criticalError = new LoggedError('Payment processing failed', {
   *   error: new Error('Gateway timeout'),
   *   critical: true
   * });
   *
   * if (criticalError.critical) {
   *   await sendAlertToOnCallTeam();
   *   await initiateFailoverProcedure();
   * }
   * ```
   *
   * @since 1.0.0
   */
  get critical(): boolean {
    return this.#critical;
  }

  /**
   * Gets the name of the underlying error.
   *
   * This property proxies to the underlying error's `name` property, which
   * typically indicates the error type (e.g., 'Error', 'TypeError', 'ReferenceError').
   *
   * @readonly
   * @returns {string} The name/type of the underlying error
   *
   * @example
   * ```typescript
   * const typeError = new TypeError('Invalid argument');
   * const logged = new LoggedError(typeError);
   * console.log(logged.name); // 'TypeError'
   * ```
   *
   * @since 1.0.0
   */
  get name(): string {
    const ret = this.#error?.name;
    if (
      ret === 'Error' &&
      this.#error.cause &&
      isError(this.#error.cause) &&
      this.#error.cause.name === 'PostgresError'
    ) {
      return this.#error.cause.name;
    }
    return this.#error.name ?? 'Error';
  }

  /**
   * Gets the cause of the underlying error, if any.
   *
   * This property provides access to the error chain, allowing investigation
   * of the root cause of a failure. The cause property is part of the standard
   * Error interface and may contain another Error object or other value.
   *
   * @readonly
   * @returns {unknown} The cause of the underlying error, or undefined if no cause was set
   *
   * @example
   * ```typescript
   * const rootCause = new Error('Network unreachable');
   * const intermediate = new Error('Connection failed', { cause: rootCause });
   * const logged = new LoggedError(intermediate);
   *
   * console.log(logged.cause === rootCause); // true
   * ```
   *
   * @since 1.0.0
   */
  get cause() {
    return this.#error.cause;
  }

  /**
   * Gets the stack trace of the underlying error.
   *
   * The stack trace provides detailed information about the call stack at the
   * time the error was created, including file names, line numbers, and function
   * names. This is essential for debugging and error investigation.
   *
   * @readonly
   * @returns {string} The stack trace string, or a fallback message if no stack is available
   *
   * @example
   * ```typescript
   * const error = new LoggedError('Something failed', {
   *   error: new Error('Root cause')
   * });
   *
   * console.log(error.stack);
   * // Output:
   * // Error: Root cause
   * //     at Object.<anonymous> (/path/to/file.js:10:15)
   * //     at Module._compile (module.js:456:26)
   * //     ...
   * ```
   *
   * @since 1.0.0
   */
  get stack(): string {
    return this.#error.stack ?? 'no stack trace available';
  }

  /**
   * Gets the error message from the underlying error.
   *
   * This property provides access to the human-readable error message that
   * describes what went wrong. The message comes from the underlying error
   * object and should provide meaningful context about the failure.
   *
   * @readonly
   * @returns {string} The error message describing what went wrong
   *
   * @example
   * ```typescript
   * const logged = new LoggedError('Custom wrapper message', {
   *   error: new Error('Actual error details')
   * });
   *
   * console.log(logged.message); // 'Actual error details'
   * ```
   *
   * @since 1.0.0
   */
  get message(): string {
    return this.#error.message;
  }
}

/**
 * Recursively extracts and formats error information from any error-like value.
 *
 * This utility function provides comprehensive error information extraction,
 * handling nested error chains through the `cause` property and providing
 * fallback formatting for non-error values. It's particularly useful for
 * debugging complex error scenarios and logging detailed error information.
 *
 * The function recursively follows error chains, building a comprehensive
 * error report that includes all levels of causation. This is essential
 * for understanding the full context of failures in complex applications.
 *
 * @function dumpError
 *
 * @param {unknown} e - The error or value to extract information from. Can be:
 *   - An `Error` object (extracts message and recursively processes cause)
 *   - An object (serialized as JSON with pretty formatting)
 *   - A primitive value (converted to string)
 *   - `null` or `undefined` (handled gracefully)
 *
 * @returns {string} A formatted string containing comprehensive error information.
 *   For Error objects, includes the message and recursively processes the cause chain.
 *   For objects, returns pretty-printed JSON. For primitives, returns string representation.
 *
 * @example
 * ```typescript
 * // Simple error
 * const error = new Error('Connection failed');
 * console.log(dumpError(error));
 * // Output: "Connection failed"
 *
 * // Nested error chain
 * const rootCause = new Error('Network unreachable');
 * const intermediate = new Error('Database connection failed', { cause: rootCause });
 * const topLevel = new Error('User operation failed', { cause: intermediate });
 *
 * console.log(dumpError(topLevel));
 * // Output:
 * // User operation failed
 * // Caused by: Database connection failed
 * // Caused by: Network unreachable
 *
 * // Non-error values
 * console.log(dumpError({ status: 500, details: 'Server error' }));
 * // Output: Pretty-printed JSON of the object
 *
 * console.log(dumpError('Simple string error'));
 * // Output: "Simple string error"
 * ```
 *
 * @since 1.0.0
 */
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

/**
 * Re-exported utility functions for enhanced error handling and detection.
 *
 * These utility functions are re-exported from the utility-methods module
 * for convenient access when working with LoggedError. They provide essential
 * error detection capabilities that complement the LoggedError functionality.
 *
 * @namespace UtilityExports
 */

/**
 * Determines if an error represents an aborted/canceled operation.
 *
 * This utility function detects errors that result from operation cancellation
 * rather than actual failures. Such errors are typically not logged to reduce
 * noise in monitoring systems, as cancellations are often intentional user actions.
 *
 * @function isAbortError
 * @memberof UtilityExports
 *
 * @param {unknown} error - The error to check for abort/cancellation status
 * @returns {boolean} `true` if the error represents a canceled operation, `false` otherwise
 *
 * @example
 * ```typescript
 * import { isAbortError } from './logged-error';
 *
 * try {
 *   await fetchWithTimeout(url, { signal: abortController.signal });
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     console.log('Request was canceled by user');
 *   } else {
 *     console.error('Request failed:', error);
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */
// Re-export utility functions for convenience
export { isAbortError } from '../utility-methods';
