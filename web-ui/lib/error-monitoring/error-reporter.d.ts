import type {
  ErrorSeverity,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
} from './types';

/**
 * Centralized error reporting system interface and class declaration.
 *
 * Use `ErrorReporter.getInstance()` or the exported `errorReporter` singleton
 * to report errors, wire up global handlers, and access stored reports.
 */
export declare class ErrorReporter implements ErrorReporterInterface {
  private constructor(config: ErrorReporterConfig);

  /** Create a configured instance (factory) */
  public static createInstance(
    config: Partial<ErrorReporterConfig>,
  ): ErrorReporterInterface;

  /** Get or create the global singleton instance */
  public static getInstance(
    config?: ErrorReporterConfig,
  ): ErrorReporterInterface;

  /** Report an arbitrary error with optional severity and context */
  public reportError(
    error: Error | unknown,
    severity?: ErrorSeverity,
    context?: Partial<ErrorContext>,
  ): Promise<void>;

  /** Report an error captured by a React error boundary */
  public reportBoundaryError(
    error: Error,
    errorInfo: { componentStack?: string; errorBoundary?: string },
    severity?: ErrorSeverity,
  ): Promise<void>;

  /** Report an unhandled promise rejection */
  public reportUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>,
  ): Promise<void>;

  /** Install global window error and rejection handlers (no-op on server) */
  public setupGlobalHandlers(): void;

  /** Retrieve errors previously stored in localStorage (client only) */
  public getStoredErrors(): ErrorReport[];

  /** Clear stored error reports from localStorage (client only) */
  public clearStoredErrors(): void;
}

/**
 * Singleton instance of the ErrorReporter (convenience export).
 * Use this for application-level reporting.
 */
export declare const errorReporter: ErrorReporterInterface;

export { ErrorSeverity };
export type {
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
};
