import type { TurtleRecursionParams, LoggedErrorOptions, ErrorReportArgs, ErrorLogFactory } from './types';
declare const brandLoggedError: unique symbol;
declare const INNER_ERROR: unique symbol;
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