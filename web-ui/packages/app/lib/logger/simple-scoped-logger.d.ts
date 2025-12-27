import type { SimpleLogger } from './types';
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
export declare const simpleScopedLogger: SimpleScopedLoggerOverloads;
export {};
//# sourceMappingURL=simple-scoped-logger.d.ts.map