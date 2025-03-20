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

export type EventSeverity = keyof ILogger;

/**
 * Interface representing the overloads for logging events.
 *
 * @interface LogEventOverloads
 *
 * @method
 * @name LogEventOverloads#(eventName: string): Promise<ILogger>
 * @description Logs an event with the specified name.
 * @param {string} eventName - The name of the event to log.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @name LogEventOverloads#(eventName: string, measurements: Record<string, number>): Promise<ILogger>
 * @description Logs an event with the specified name and measurements.
 * @param {string} eventName - The name of the event to log.
 * @param {Record<string, number>} measurements - A record of measurements associated with the event.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @name LogEventOverloads#(severity: EventSeverity, eventName: string): Promise<ILogger>
 * @description Logs an event with the specified severity and name.
 * @param {EventSeverity} severity - The severity level of the event.
 * @param {string} eventName - The name of the event to log.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @name LogEventOverloads#(severity: EventSeverity, eventName: string, measurements: Record<string, number>): Promise<ILogger>
 * @description Logs an event with the specified severity, name, and measurements.
 * @param {EventSeverity} severity - The severity level of the event.
 * @param {string} eventName - The name of the event to log.
 * @param {Record<string, number>} measurements - A record of measurements associated with the event.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 */
export interface LogEventOverloads {
  (eventName: string): Promise<void>;
  (eventName: string, measurements: Record<string, number>): Promise<void>;
  (severity: EventSeverity, eventName: string): Promise<void>;
  (
    severity: EventSeverity,
    eventName: string,
    measurements: Record<string, number>,
  ): Promise<void>;
}
