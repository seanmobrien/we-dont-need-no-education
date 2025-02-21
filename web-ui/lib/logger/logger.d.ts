/**
 * Interface representing a logger with various logging levels.
 */
export interface ILogger {
  /**
   * Logs an informational message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  info(message: string | object, ...args: unknown[]): void;

  /**
   * Logs an error message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  error(message: string | object, ...args: unknown[]): void;

  /**
   * Logs a warning message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  warn(message: string | object, ...args: unknown[]): void;

  /**
   * Logs a debug message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  debug(message: string | object, ...args: unknown[]): void;

  /**
   * Logs a fatal error message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  fatal(message: string | object, ...args: unknown[]): void;

  /**
   * Logs a verbose message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  verbose(message: string | object, ...args: unknown[]): void;

  /**
   * Logs a silly message. This is the one you put the swear words in.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  silly(message: string | object, ...args: unknown[]): void;
  /**
   * Logs a trace message.
   * @param message - The message to log.
   * @param args - Additional arguments to log.
   */
  trace(message: string | object, ...args: unknown[]): void;
}

/**
 * Provides an instance of ILogger.
 * @returns A promise that resolves to an ILogger instance.
 */
export const logger = () => Promise<ILogger>;

/**
 * Executes a callback with an ILogger instance.
 * @param cb - The callback function that receives an ILogger instance.
 */
export const log: (cb: (l: ILogger) => void) => void;

/**
 * Factory function to create an error log object.
 *
 * @param {Object} params - The parameters for the error log.
 * @param {unknown} params.error - The error object or message.
 * @param {string} params.source - The source of the error (e.g., function name, module name).
 * @param {object} [params.include] - Optional additional information to include in the log.
 * @returns {Record<string, unknown>} - The constructed error log object.
 */
export const errorLogFactory: ({
  error,
  source,
  include,
}: {
  error: unknown;
  source: string;
  include?: object;
} & Record<string, unknown>) => Record<string, unknown>;
