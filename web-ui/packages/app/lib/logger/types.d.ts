/**
 * Type definitions for logging interfaces and severity levels
 * @module @/lib/logger/types
 */

declare module '@/lib/logger/types' {
  /**
   * Represents a simple logging interface with methods for different log levels.
   *
   * This interface defines four primary logging methods: `info`, `warning`, `error`, and `debug`.
   * Each method accepts a variable number of arguments of any type.
   *
   * @example
   * ```typescript
   * const logger: SimpleLogger = ...;
   * logger.info('Application started');
   * logger.warning('Low disk space');
   * logger.error('Unhandled exception', error);
   * logger.debug('User data', user);
   * ```
   */
  export interface SimpleLogger {
    /**
     * Logs an informational message.
     * This method can accept a variable number of arguments, supporting the signature of `console.info`.
     *
     * @param args - Variable number of arguments to log
     */
    info(...args: unknown[]): void;

    /**
     * Logs a warning message.
     * This method can accept a variable number of arguments, supporting the signature of `console.warn`.
     *
     * @param args - Variable number of arguments to log
     */
    warn(...args: unknown[]): void;

    /**
     * Logs an error message.
     * This method can accept a variable number of arguments, supporting the signature of `console.error`.
     *
     * @param args - Variable number of arguments to log
     */
    error(...args: unknown[]): void;

    /**
     * Logs a debug message.
     * This method can accept a variable number of arguments, supporting the signature of `console.debug`.
     *
     * @param args - Variable number of arguments to log
     */
    debug(...args: unknown[]): void;
  }

  /**
   * Defines a contract for logging messages at various severity levels.
   *
   * Implementations of this interface should provide methods to log messages
   * for informational, error, warning, debug, fatal, verbose, silly, and trace events.
   * Each method accepts a message (string or object) and optional additional arguments.
   */
  export interface ILogger extends SimpleLogger {
    /**
     * Logs an informational message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    info(message: string | object, ...args: unknown[]): void;

    /**
     * Logs an error message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    error(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a warning message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    warn(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a debug message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    debug(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a fatal error message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    fatal(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a verbose message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    verbose(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a silly message. This is the one you put the swear words in.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    silly(message: string | object, ...args: unknown[]): void;

    /**
     * Logs a trace message.
     *
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    trace(message: string | object, ...args: unknown[]): void;
  }

  /**
   * Represents the severity levels of events as defined by the keys of the `ILogger` interface.
   * This type is useful for ensuring that only valid logger severity levels are used throughout the application.
   */
  export type EventSeverity = keyof ILogger;

  /**
   * Provides overloads for logging events with varying levels of detail and severity.
   *
   * Supports four call patterns:
   * 1. Log event by name only
   * 2. Log event with name and measurements
   * 3. Log event with severity and name
   * 4. Log event with severity, name, and measurements
   */
  export interface LogEventOverloads {
    /**
     * Logs an event with the specified name and measurements.
     *
     * @param eventName - The name of the event to log
     * @param measurements - A record of measurements associated with the event
     * @returns A promise that resolves when the event is logged
     */
    (
      eventName: string,
      measurements?: Record<string, number | string>,
    ): Promise<void>;

    /**
     * Logs an event with the specified severity, name, and measurements.
     *
     * @param severity - The severity level of the event
     * @param eventName - The name of the event to log
     * @param measurements - A record of measurements associated with the event
     * @returns A promise that resolves when the event is logged
     */
    (
      severity: EventSeverity,
      eventName: string,
      measurements?: Record<string, number | string>,
    ): Promise<void>;
  }
  /**
   * Interface representing a custom Application Insights event.
   */
  export type ICustomAppInsightsEvent = {
    event: string;
    measurements?: Record<string, string | number>;
    dispose?: () => void;
  };
  /**
   * Payload emitted to custom event listeners.
   */
  export type SendCustomEventPayload = {
    event: ICustomAppInsightsEvent;
    severity: EventSeverity;
    processed: boolean;
  };

  /**
   * Listener invoked when a custom event is emitted.
   */
  export type SendCustomEventListener = (
    payload: SendCustomEventPayload,
  ) => void | Promise<void>;
}
