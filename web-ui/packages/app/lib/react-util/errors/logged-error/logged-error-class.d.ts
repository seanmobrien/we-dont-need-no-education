import type { TurtleRecursionParams, LoggedErrorOptions, ErrorReportArgs, ErrorLogFactory } from './types';
/**
 * A unique symbol used to brand `LoggedError` class instances for runtime type checking.
 *
 * This symbol ensures that `LoggedError` instances can be reliably identified even
 * across different JavaScript execution contexts or when serialized/deserialized.
 *
 * @private
 * @readonly
 */
declare const brandLoggedError: unique symbol;
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
declare const INNER_ERROR: unique symbol;
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
declare const CRITICAL: unique symbol;
export declare class LoggedError extends Error {
    #private;
    static subscribeToErrorReports(callback: (args: ErrorReportArgs) => void): void;
    static unsubscribeFromErrorReports(callback: (args: ErrorReportArgs) => void): void;
    static clearErrorReportSubscriptions(): void;
    static isLoggedError(e: unknown): e is LoggedError;
    static isTurtlesAllTheWayDownBaby(e: unknown, options?: TurtleRecursionParams): LoggedError;
    writeToLog({ source, message, errorLogFactory, ...itsRecusionMan }: {
        source: string;
        message?: string;
        errorLogFactory?: ErrorLogFactory;
        [key: string]: unknown;
    }): void;
    static buildMessage(options: unknown): string;
    get [Symbol.toStringTag](): string;
    constructor(message: string | LoggedErrorOptions | Error, options?: (Omit<LoggedErrorOptions, 'error'> & Partial<Pick<LoggedErrorOptions, 'error'>>) | Error);
    [CRITICAL]: boolean;
    [INNER_ERROR]: Error;
    [brandLoggedError]: boolean;
    [key: string | symbol]: unknown;
    get error(): Error;
    get critical(): boolean;
    get name(): string;
    get cause(): unknown;
    get stack(): string;
    get message(): string;
}
export declare const dumpError: (e: unknown) => string;
export {};
//# sourceMappingURL=logged-error-class.d.ts.map