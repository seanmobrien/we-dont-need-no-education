import type {
  ErrorReporterInterface,
  ErrorSeverity,
  ErrorContext,
} from './types';

/**
 * React hook that returns the shared ErrorReporter instance and convenience helpers.
 *
 * Usage:
 * const { reportError, reportBoundaryError } = useErrorReporter();
 */
export declare function useErrorReporter(): {
  reporter: ErrorReporterInterface;
  reportError: (
    error: Error | unknown,
    severity?: ErrorSeverity,
    context?: Partial<ErrorContext>,
  ) => Promise<void>;
  reportBoundaryError: (
    error: Error,
    errorInfo: { componentStack?: string; errorBoundary?: string },
    severity?: ErrorSeverity,
  ) => Promise<void>;
};
