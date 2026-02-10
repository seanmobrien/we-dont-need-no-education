/**
 * Core logging functionality
 * @module @compliance-theater/logger/core
 */

import type { ILogger, LogEventOverloads } from './types';
declare module '@compliance-theater/logger/core' {
  /**
   * Returns a promise that resolves to an instance of ILogger.
   *
   * Creates a configured Pino logger instance with server/client-specific settings.
   * The logger is cached globally and reused across calls.
   *
   * @returns A promise that resolves to an ILogger instance
   */
  export const logger: () => Promise<ILogger>;

  /**
   * Executes a callback function with the provided logger instance.
   *
   * If the logger is already initialized, executes the callback immediately.
   * Otherwise, initializes the logger first before executing the callback.
   *
   * @param cb - A callback function that takes a logger instance as an argument
   * @returns A promise that resolves to the callback's return value
   *
   * @example
   * ```typescript
   * log(l => l.info('Application started'));
   * log(l => l.error('Error occurred', { error }));
   * ```
   */
  export const log: (cb: (l: ILogger) => void) => Promise<void>;

  /**
   * Logs custom application events with optional measurements and severity.
   *
   * This helper function provides multiple overloads for logging events with varying
   * levels of detail and severity. See {@link LogEventOverloads} for all signatures.
   *
   * @example
   * ```typescript
   * // Log simple event
   * logEvent('UserLoggedIn');
   *
   * // Log event with measurements
   * logEvent('ApiCall', { duration: 123, status: 200 });
   *
   * // Log event with severity
   * logEvent('error', 'ErrorOccurred');
   *
   * // Log event with severity and measurements
   * logEvent('warn', 'SlowQuery', { duration: 5000 });
   * ```
   */
  export const logEvent: LogEventOverloads;
}
