export interface SimpleLogger {
    /**
     * Logs an informational message.
     * This method can accept a variable number of arguments, supporting the signature of `console.info`.
     * @param args - Variable number of arguments to log.
     */
    info(...args: unknown[]): void;
    /**
     * Logs a warning message.
     * This method can accept a variable number of arguments, supporting the signature of `console.warn`.
     * @param args - Variable number of arguments to log.
     */
    warn(...args: unknown[]): void;
    /**
     * Logs an error message.
     * This method can accept a variable number of arguments, supporting the signature of `console.error`.
     * @param args - Variable number of arguments to log.
     */
    error(...args: unknown[]): void;
    /**
     * Logs a debug message.
     * This method can accept a variable number of arguments, supporting the signature of `console.debug`.
     * @param args - Variable number of arguments to log.
     */
    debug(...args: unknown[]): void;
}
export interface ILogger extends SimpleLogger {
    /**
     * Logs an informational message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    info(message: string | object, ...args: unknown[]): void;
    /**
     * Logs an error message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    error(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a warning message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    warn(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a debug message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    debug(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a fatal error message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    fatal(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a verbose message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    verbose(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a silly message. This is the one you put the swear words in.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    silly(message: string | object, ...args: unknown[]): void;
    /**
     * Logs a trace message.
     * @param {string | object} message - The message to log.
     * @param args - Additional arguments to log.
     */
    trace(message: string | object, ...args: unknown[]): void;
}
export type EventSeverity = keyof ILogger;
export interface LogEventOverloads {
    /**
     * Logs an event with the specified name and measurements.
     * @param {string} eventName - The name of the event to log.
     * @param {Record<string, number>} measurements - A record of measurements associated with the event.
     * @returns {Promise<void>} A promise that resolves when the event is logged.
     */
    (eventName: string, measurements?: Record<string, number | string>): Promise<void>;
    /**
     * Logs an event with the specified severity, name, and measurements.
     * @param {EventSeverity} severity - The severity level of the event.
     * @param {string} eventName - The name of the event to log.
     * @param {Record<string, number>} measurements - A record of measurements associated with the event.
     * @returns {Promise<void>} A promise that resolves when the event is logged.
     */
    (severity: EventSeverity, eventName: string, measurements?: Record<string, number | string>): Promise<void>;
}
export type ICustomAppInsightsEvent = {
    event: string;
    measurements?: Record<string, string | number>;
    [Symbol.dispose]?: () => void;
    increment: (name: string, value?: number) => void;
    startTimer: (name: string) => void;
    stopTimer: (name: string) => void;
};
export type SendCustomEventPayload = {
    event: ICustomAppInsightsEvent;
    severity: EventSeverity;
    processed: boolean;
};
export type SendCustomEventListener = (payload: SendCustomEventPayload) => void | Promise<void>;
//# sourceMappingURL=types.d.ts.map