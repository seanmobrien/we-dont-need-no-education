/**
 * Types for the error reporting module.
 *
 * These are extracted so other modules (and tests) can consume the
 * ErrorReporter surface without importing the implementation.
 */

/**
 * Error severity levels for reporting and prioritization
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Known environment strings used by the reporter
 */
export type KnownEnvironmentType = 'development' | 'staging' | 'production';

/**
 * Error context information for better debugging
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  source?: string;
  userAgent?: string;
  url?: string;
  timestamp?: Date;
  componentStack?: string;
  errorBoundary?: string;
  breadcrumbs?: string[];
  additionalData?: Record<string, unknown>;
  error?: Error;
}

/**
 * Error report structure for external monitoring services
 */
export interface ErrorReport {
  error: Error;
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint?: string;
  tags?: Record<string, string>;
}

/**
 * Configuration for error reporting
 */
export interface ErrorReporterConfig {
  enableStandardLogging: boolean;
  enableConsoleLogging: boolean;
  enableExternalReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  environment: KnownEnvironmentType;
}

/**
 * Interface describing the runtime surface of the ErrorReporter class.
 *
 * Implementations should match this shape so callers can depend on the
 * contract rather than the concrete class.
 */
export interface ErrorReporterInterface {
  reportError(
    error: Error | unknown,
    severity?: ErrorSeverity,
    context?: Partial<ErrorContext>,
  ): Promise<void>;

  reportBoundaryError(
    error: Error,
    errorInfo: { componentStack?: string; errorBoundary?: string },
    severity?: ErrorSeverity,
  ): Promise<void>;

  reportUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>,
  ): Promise<void>;

  setupGlobalHandlers(): void;

  getStoredErrors(): ErrorReport[];

  clearStoredErrors(): void;
}

export type IContextEnricher = {
  enrichContext: (context: ErrorContext) => Promise<ErrorContext>;
};
