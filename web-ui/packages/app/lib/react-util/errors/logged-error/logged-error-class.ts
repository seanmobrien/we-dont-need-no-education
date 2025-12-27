// Documentation is authoritative in: lib/react-util/errors/logged-error.d.ts
// The runtime implementation remains here. Keep implementation edits minimal.

import { errorLogFactory as standardErrorLogFactory, log, safeSerialize } from '@repo/lib-logger';
import {
  isAbortError,
  isError,
  isProgressEvent,
} from './../../utility-methods';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
import { asKnownSeverityLevel } from '@repo/lib-logger/constants';
import type { TurtleRecursionParams, LoggedErrorOptions, ErrorReportArgs, ErrorLogFactory } from './types';
import { ProgressEventError } from '../progress-event-error';
import mitt from 'next/dist/shared/lib/mitt';

/**
 * A unique symbol used to brand `LoggedError` class instances for runtime type checking.
 *
 * This symbol ensures that `LoggedError` instances can be reliably identified even
 * across different JavaScript execution contexts or when serialized/deserialized.
 *
 * @private
 * @readonly
 */
const brandLoggedError: unique symbol = Symbol.for('@no-education/LoggedError');
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
const INNER_ERROR: unique symbol = Symbol.for('@no-education/LoggedError::InnerError');
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
const CRITICAL: unique symbol = Symbol.for('@no-education/LoggedError::CriticalFlag');


// LoggedError class implementation.  Type and extensive documentation in .d.ts.
export class LoggedError extends Error {
  static #errorReportEmitter = mitt();
  static subscribeToErrorReports(callback: (args: ErrorReportArgs) => void) {
    this.#errorReportEmitter.on('errorReported', callback);
  }
  static unsubscribeFromErrorReports(callback: (args: ErrorReportArgs) => void) {
    this.#errorReportEmitter.off('errorReported', callback);
  }
  static clearErrorReportSubscriptions() {
    // no good way to clear/enumerate mitt subscriptions, but we can create a
    // new emitter and throw away the old one.
    this.#errorReportEmitter = mitt();
  }


  // Type guard to check if an object is a LoggedError instance.
  static isLoggedError(e: unknown): e is LoggedError {
    return (
      e instanceof LoggedError ||
      (typeof e === 'object' &&
        !!e &&
        brandLoggedError in e &&
        e[brandLoggedError] === true)
    );
  }

  // Recursively unwraps nested errors and ensures the result is a LoggedError.
  // We know the name isn't professional.  9 out of 10 programming dentists agree
  // it's still really funny, and we're keeping it...drop it Gemini/Copilot/Claude.
  static isTurtlesAllTheWayDownBaby(
    e: unknown,
    options?: TurtleRecursionParams,
  ): LoggedError {
    const {
      log: logFromProps = false,
      relog = false,
      logCanceledOperation = false,
      source = 'Turtles, baby',
      message,
      critical,
      ...itsRecusionMan
    } = options ?? ({ log: false } as TurtleRecursionParams)
    let shouldLog = logFromProps;
    const isArgLoggedError = LoggedError.isLoggedError(e);
    const isArgError = !isArgLoggedError && isError(e);
    const isArgProgressEvent = !isArgLoggedError && !isArgError && isProgressEvent(e);

    if (
      // If e is a non-null object
      typeof e === 'object' && e !== null &&
      // And it's not a logged error, error, or progress event
      (!(isArgLoggedError || isArgError || isArgProgressEvent))
      // And it has an error property
      && 'error' in e
      // And that error property is an error
      && isError(e.error)
    ) {
      // Then we've been passed a composite error object...extract the error from error and try again.
      const { error: theError, ...allTheRest } = e;
      return LoggedError.isTurtlesAllTheWayDownBaby(
        theError,
        {
          log: false,
          ...allTheRest,
          ...(options ?? {})
        }
      );
    }
    // If the shouldLog bit is true, we need to determine if this instance should be emitted for logging 
    if (shouldLog) {
      // If this is a logged error we by default do not want to re-log
      if (isArgLoggedError) {
        // So we reset the shouldLog bit based on the relog option
        shouldLog = relog === true;
      } else if (isArgError) {
        // If this is an abort error and logCanceledOperation is disabled, skip logging
        if (!logCanceledOperation && isAbortError(e)) {
          shouldLog = false;
        }
      } else {
        // If this is not an error then check to see if it's a progress event
        if (isArgProgressEvent) {
          // and if so wrap it in an ProgressEventError and pass it back to the turtles
          return LoggedError.isTurtlesAllTheWayDownBaby(
            new ProgressEventError(e),
            {
              log: shouldLog,
              relog,
              logCanceledOperation,
              source,
              message,
              critical,
              ...itsRecusionMan,
            },
          );
        }
        // Otherwise we are not a logged error, we are not an error, we are not a progress event,
        // and we are not a wrapped composite error object - Not really sure what use case this is.
        log((l) =>
          l.warn(`Some bonehead threw a not-error. Input: ${safeSerialize(e)
            }\nStack Trace: ${getStackTrace({ skip: 1, myCodeOnly: true })
            }`)
        );
        // We will log this using best-effort conversion to a LoggedError
      }
    }
    // Create the LoggedError instance from our input
    let newLoggedError: LoggedError;
    if (isArgLoggedError) {
      // If we already have a LoggedError this is a passthrough
      newLoggedError = e;
    } else if (isArgError) {
      // If we have a traditional Error instance then construct a LoggedError from it
      newLoggedError = new LoggedError(e, { critical });
    } else {
      // Otherwise we have the "bonehead threw a non-error" use case...Convert the input
      // as a string and use it as the message for a new Error instance.
      newLoggedError = new LoggedError(new Error(String(e)), { critical });
    }
    // Now we have our error and we know whether it's eligible for emitting...all thats left
    // to do is actually emit it :)
    if (shouldLog) {
      newLoggedError.writeToLog({
        source,
        message,
        ...itsRecusionMan,
      });
    }
    // And finally return the fancy new LoggedError instance
    return newLoggedError;
  }

  writeToLog({
    source,
    message,
    errorLogFactory = standardErrorLogFactory,
    ...itsRecusionMan
  }: {
    source: string;
    message?: string;
    errorLogFactory?: ErrorLogFactory;
    [key: string]: unknown
  }) {
    // And if so, emit away!
    const logObject = errorLogFactory({
      error: this,
      include: itsRecusionMan,
      source,
      message,
    });
    LoggedError.#errorReportEmitter.emit('errorReported', {
      error: this,
      severity: asKnownSeverityLevel(logObject.severity),
      context: {
        stack: getStackTrace({ skip: 2 }),
        ...{
          ...logObject,
          error: undefined,
          source,
          message,
        },
      },
    });
  }

  // Builds a descriptive message from various input types, handling recursion and cycles.
  static buildMessage(options: unknown): string {
    if (!options) {
      return 'null or undefined error';
    }
    // For error we just use the message
    if (isError(options)) {
      return options.message;
    }
    // Otherwise if its an object...
    if (typeof options === 'object' && options !== null) {
      // Wrapping an error then return the wrapped error message
      if ('error' in options && isError(options.error)) {
        return options.error.message;
      }
      // Otherwise serialize the object
      const serialized = safeSerialize(options).trim();
      // If that had data then return it
      if (serialized.length) {
        return `Error: ${serialized}`;
      }
      // And if it was empty then return the stringified version
      return safeSerialize(options.toString(), 7000);
    }
    // Otherwise just return the stringified version
    return safeSerialize(options, 7000);
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

    return `LoggedError${_fingerprintValue ? ` (Fingerprint: ${_fingerprintValue}) ` : ''
      }${_sourceValue ? ` [Source: ${_sourceValue}] ` : ''}: ${this[CRITICAL] ? 'CRITICAL - ' : ''
      }${LoggedError.buildMessage(this)}`;
  }

  // Constructor overloads to handle various input scenarios.
  // IMPORTANT: Prefer LoggedError.isTurtlesAllTheWayDownBaby to calling constructor directly.
  constructor(
    message: string | LoggedErrorOptions | Error,
    options?:
      | (Omit<LoggedErrorOptions, 'error'> &
        Partial<Pick<LoggedErrorOptions, 'error'>>)
      | Error,
  ) {
    super();
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
    this[brandLoggedError] = true;
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
    ret = safeSerialize(e, {
      maxObjectDepth: 5,
      propertyFilter: LoggedError.isLoggedError(e)
        ? (_key, propertyPath) => propertyPath !== 'cause.cause'
        : undefined,
    });
  } else {
    ret = safeSerialize(e);
  }
  return ret;
};
