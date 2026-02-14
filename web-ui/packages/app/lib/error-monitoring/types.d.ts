import type { ErrorContext, IContextEnricher } from '@compliance-theater/logger';
export type { ErrorContext, IContextEnricher };
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export type KnownEnvironmentType = 'development' | 'staging' | 'production';
export type ErrorReport = {
    error: Error;
    severity: ErrorSeverity;
    context: ErrorContext;
    fingerprint?: string;
    tags?: Record<string, string>;
};
export type ErrorReporterConfigDebounceParams = {
    debounceIntervalMs: number;
    debounceCleanupIntervalMs: number;
};
export type ErrorReporterConfig = {
    enableStandardLogging: boolean;
    enableConsoleLogging: boolean;
    enableExternalReporting: boolean;
    enableLocalStorage: boolean;
    maxStoredErrors: number;
    environment: KnownEnvironmentType;
    debounce?: ErrorReporterConfigDebounceParams;
    triggerMax?: number;
    triggerTtl?: number;
    switchMax?: number;
    switchTtl?: number;
    triggerTimeout?: number;
};
export type CircuitBreakerConfig = {
    triggerMax: number;
    triggerTtl: number;
    switchMax: number;
    switchTtl: number;
    triggerTimeout: number;
};
export type ErrorReportResult = Omit<SuppressionResult, 'rule'> & {
    report: ErrorReport;
    rule: string | ErrorSuppressionRule;
    logged: boolean;
    console: boolean;
    stored: boolean;
    reported: boolean;
};
export interface ErrorReporterInterface {
    createErrorReport(error: Error | unknown, severity?: ErrorSeverity, context?: Partial<ErrorContext>): Promise<ErrorReport>;
    generateFingerprint(error: Error, context: ErrorContext): string;
    reportError(error: Error | unknown, severity?: ErrorSeverity, context?: Partial<ErrorContext>): Promise<ErrorReportResult>;
    reportBoundaryError(error: Error, errorInfo: {
        componentStack?: string;
        errorBoundary?: string;
    }, severity?: ErrorSeverity): Promise<ErrorReportResult>;
    reportUnhandledRejection(reason: unknown, promise: Promise<unknown>): Promise<ErrorReportResult>;
    setupGlobalHandlers(): void;
    subscribeToErrorReports(): void;
    unsubscribeFromErrorReports(): void;
    getStoredErrors(): ErrorReport[];
    clearStoredErrors(): void;
}
export type ErrorSuppressionRule = {
    id: string;
    pattern: string | RegExp;
    source?: string | RegExp;
    suppressCompletely?: boolean;
    reload?: boolean;
    reason?: string;
};
export type SuppressionResult = {
    suppress: boolean;
    rule?: ErrorSuppressionRule;
    completely?: boolean;
};
//# sourceMappingURL=types.d.ts.map