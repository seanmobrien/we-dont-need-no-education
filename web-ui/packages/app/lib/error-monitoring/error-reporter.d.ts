import { ErrorSeverity, KnownEnvironmentType, ErrorContext, ErrorReport, ErrorReporterConfig, ErrorReporterInterface, ErrorReportResult } from './types';
export { ErrorSeverity };
export type { KnownEnvironmentType, ErrorContext, ErrorReport, ErrorReporterConfig, ErrorReporterInterface, };
export declare class ErrorReporter implements ErrorReporterInterface {
    #private;
    private config;
    private debounceCache;
    private circuitBreaker;
    private constructor();
    static createInstance: (config: Partial<ErrorReporterConfig>) => ErrorReporterInterface;
    static getInstance: (config?: Partial<ErrorReporterConfig>) => ErrorReporterInterface;
    private shouldDebounce;
    createErrorReport(error: Error | unknown, severity?: ErrorSeverity, context?: Partial<ErrorContext>): Promise<ErrorReport>;
    reportError(error: Error | unknown, severity?: ErrorSeverity, context?: Partial<ErrorContext>): Promise<ErrorReportResult>;
    reportBoundaryError(error: Error, errorInfo: {
        componentStack?: string;
        errorBoundary?: string;
    }, severity?: ErrorSeverity): Promise<ErrorReportResult>;
    reportUnhandledRejection(reason: unknown, promise: Promise<unknown>): Promise<ErrorReportResult>;
    setupGlobalHandlers(): void;
    removeGlobalHandlers(): void;
    private normalizeError;
    private enrichContext;
    generateFingerprint(error: Error, context: ErrorContext): string;
    subscribeToErrorReports(): void;
    unsubscribeFromErrorReports(): void;
    private generateTags;
    getStoredErrors(): ErrorReport[];
    clearStoredErrors(): void;
}
interface ErrorReporterInstanceOverloads {
    (): ErrorReporterInterface;
    <TCallback extends (reporter: ErrorReporterInterface) => any extends infer TResult ? TResult : never>(cb: TCallback): ReturnType<TCallback>;
}
export declare const errorReporter: ErrorReporterInstanceOverloads;
//# sourceMappingURL=error-reporter.d.ts.map