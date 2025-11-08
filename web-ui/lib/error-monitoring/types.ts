/**
 * @see ./types.ts for type definitions and documentation
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type KnownEnvironmentType = 'development' | 'staging' | 'production';

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

export interface ErrorReport {
  error: Error;
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint?: string;
  tags?: Record<string, string>;
}

export type ErrorReporterConfigDebounceParams = {
  debounceIntervalMs: number;
  debounceCleanupIntervalMs: number;
};

export interface ErrorReporterConfig {
  enableStandardLogging: boolean;
  enableConsoleLogging: boolean;
  enableExternalReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  environment: KnownEnvironmentType;
  debounce?: ErrorReporterConfigDebounceParams;
}

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
/**
 * Configuration for error suppression patterns
 */
export interface ErrorSuppressionRule {
  /** Unique identifier for this rule */
  id: string;
  /** Pattern to match against error messages (string contains or regex) */
  pattern: string | RegExp;
  /** Optional: match against error source/filename */
  source?: string | RegExp;
  /** Whether to completely suppress (no logging) or just prevent UI display */
  suppressCompletely?: boolean;
  /** Description of why this error is suppressed */
  reason?: string;
}

export type SuppressionResult = {
  suppress: boolean;
  rule?: ErrorSuppressionRule;
  completely?: boolean;
};
