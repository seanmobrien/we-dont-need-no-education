import type { SimpleLogger, ILogger } from './types';
import { log } from './core';

type SimpleScoppedLogRecord = {
  /**
   * The source or context for all log messages from this logger.
   * This is typically a string that identifies the part of the application
   */
  source: string;
  /**
   * The timestamp when the log message was created, in ISO format.
   */
  timestamp: string;
  /**
   * The main log message, which can be a string or an object.
   * If an object is provided, it will be serialized to JSON.
   */
  message: string | object;
  /**
   * Optional additional data to include with the log message.
   * This can be any type of data, but is typically an array of unknown values.
   */
  data?: unknown[];
};

type SimpleScopedLoggerProps = {
  /**
   * The source or context for all log messages from this logger.
   * This is typically a string that identifies the part of the application.
   */
  source: string;
  /**
   * Optional function to format the log record before logging.
   * This function takes a SimpleScoppedLogRecord and returns an object to log.
   */
  format?: (msg: SimpleScoppedLogRecord) => object;
};

interface SimpleScopedLoggerOverloads {
  /**
   * Creates a SimpleLogger with a specified source and optional formatting function.
   * @param {SimpleScopedLoggerProps} props - An object containing the source and optional format function.
   * @return {SimpleLogger} A SimpleLogger instance with debug, info, warn, and error methods.
   */
  (props: SimpleScopedLoggerProps): SimpleLogger;
  /**
   * Creates a SimpleLogger with a specified source string.
   * @param {string} source - The source or context for all log messages from this logger.
   * @return {SimpleLogger} A SimpleLogger instance with debug, info, warn, and error methods.
   */
  (source: string): SimpleLogger;
}

export const simpleScopedLogger: SimpleScopedLoggerOverloads = (
  sourceOrProps: string | SimpleScopedLoggerProps,
): SimpleLogger => {
  /**
   * Internal configuration for the scoped logger, including source and optional format function.
   */
  const scopedLoggerConfig =
    typeof sourceOrProps === 'string'
      ? { source: sourceOrProps }
      : { ...sourceOrProps };

  /**
   * Internal helper to format and send log messages to the underlying logger.
   *
   * @param action - The log method to call (debug, info, warn, error).
   * @param args - Arguments passed to the logger method.
   */
  const writeToLog = (
    action: (l: ILogger, msg: object) => void,
    args: unknown[],
  ) => {
    if (args.length === 0) {
      return;
    }
    const msg: SimpleScoppedLogRecord = {
      source: scopedLoggerConfig.source,
      timestamp: new Date().toISOString(),
      message: typeof args[0] === 'object' ? (args[0] ?? {}) : String(args[0]),
    };
    if (args.length > 1) {
      msg['data'] = args.slice(1);
    }
    const valueToLog: object = scopedLoggerConfig.format
      ? scopedLoggerConfig.format(msg)
      : msg;

    if (valueToLog) {
      Array.from(Object.entries(valueToLog)).forEach(([key, value]) => {
        // Remove empty arrays or objects from the log - this should get rid of the
        // 'invalid attribute value set for key....' log noise.
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            if (!value.length) {
              delete valueToLog[key as keyof typeof valueToLog];
            }
          } else if (Object.keys(value).length === 0) {
            delete valueToLog[key as keyof typeof valueToLog];
          }
        }
      });
    }

    log((l) => action(l, valueToLog));
  };
  /**
   * Returns a SimpleLogger with standard log level methods.
   * Each method logs with the configured source and optional formatting.
   */
  return {
    debug: (...args: unknown[]) => writeToLog((l, msg) => l.debug(msg), args),
    info: (...args: unknown[]) => writeToLog((l, msg) => l.info(msg), args),
    warn: (...args: unknown[]) => writeToLog((l, msg) => l.warn(msg), args),
    error: (...args: unknown[]) => writeToLog((l, msg) => l.error(msg), args),
  };
};
