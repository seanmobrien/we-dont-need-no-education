/**
 * @fileoverview Type definitions for error monitoring and reporting system
 *
 * This module provides comprehensive types for tracking, categorizing, and reporting
 * errors throughout the application. It supports multiple reporting channels including
 * standard logging, console output, external monitoring services (Application Insights,
 * Google Analytics), and local storage for offline analysis.
 *
 * Key features:
 * - Severity-based error classification
 * - Rich contextual error information for debugging
 * - Fingerprinting for error deduplication
 * - Environment-aware reporting configuration
 * - Support for React error boundaries
 * - OpenTelemetry integration for distributed tracing
 *
 * @example
 * ```typescript
 * import { ErrorReporter, ErrorSeverity } from '@/lib/error-monitoring';
 *
 * const reporter = ErrorReporter.getInstance();
 * await reporter.reportError(new Error('Failed to load data'), ErrorSeverity.HIGH, {
 *   source: 'DataService',
 *   userId: '123',
 *   additionalData: { attemptCount: 3 }
 * });
 * ```
 *
 * @module @/lib/error-monitoring/types
 */
declare module '@/lib/error-monitoring/types' {
  /**
   * Error severity levels for reporting, prioritization, and alerting.
   *
   * These levels determine how errors are handled, logged, and routed to monitoring
   * systems. Higher severity errors may trigger immediate alerts while lower severity
   * errors are logged for analysis.
   *
   * ## Severity Guidelines
   *
   * - **LOW**: Minor issues that don't impact functionality (cosmetic bugs, deprecation warnings)
   * - **MEDIUM**: Non-critical errors that degrade user experience but have workarounds
   * - **HIGH**: Significant errors that prevent feature usage or corrupt data
   * - **CRITICAL**: System-wide failures, security breaches, or data loss events
   *
   * @example
   * ```typescript
   * // Log a validation error as medium severity
   * await reporter.reportError(
   *   new Error('Invalid email format'),
   *   ErrorSeverity.MEDIUM
   * );
   *
   * // Report authentication failure as high severity
   * await reporter.reportError(
   *   new Error('Auth token expired'),
   *   ErrorSeverity.HIGH,
   *   { source: 'AuthService' }
   * );
   *
   * // Critical database connection failure
   * await reporter.reportError(
   *   new Error('Database connection lost'),
   *   ErrorSeverity.CRITICAL,
   *   { source: 'DatabasePool' }
   * );
   * ```
   */
  export enum ErrorSeverity {
    /**
     * Low severity - informational errors that don't impact functionality.
     *
     * Use for: deprecation warnings, style issues, non-critical validation failures.
     */
    LOW = 'low',

    /**
     * Medium severity - errors that degrade user experience but have workarounds.
     *
     * Use for: failed API calls with retry logic, non-critical feature failures,
     * recoverable state inconsistencies.
     */
    MEDIUM = 'medium',

    /**
     * High severity - significant errors preventing feature usage.
     *
     * Use for: authentication failures, data corruption, critical API failures,
     * unhandled exceptions in important flows.
     */
    HIGH = 'high',

    /**
     * Critical severity - system-wide failures requiring immediate attention.
     *
     * Use for: database connection loss, security breaches, payment processing
     * failures, complete service unavailability.
     */
    CRITICAL = 'critical',
  }

  /**
   * Known deployment environment types for environment-specific error handling.
   *
   * Different environments may have different reporting behaviors:
   * - **development**: Full console logging, local storage, minimal external reporting
   * - **staging**: Balanced logging, external reporting to test environments
   * - **production**: Optimized logging, full external reporting, minimal console output
   *
   * @example
   * ```typescript
   * const config: ErrorReporterConfig = {
   *   environment: 'production',
   *   enableConsoleLogging: false,
   *   enableExternalReporting: true
   * };
   * ```
   */
  export type KnownEnvironmentType = 'development' | 'staging' | 'production';

  /**
   * Comprehensive error context information for debugging and analysis.
   *
   * This interface captures environmental, user, and application state at the time
   * of an error, providing essential information for reproduction and diagnosis.
   * All fields are optional to support partial context capture in constrained
   * environments (edge runtime, error boundaries, etc.).
   *
   * @example
   * ```typescript
   * const context: ErrorContext = {
   *   userId: 'user-123',
   *   source: 'MessageService',
   *   url: window.location.href,
   *   timestamp: new Date(),
   *   breadcrumbs: ['page-load', 'fetch-messages', 'render-list'],
   *   additionalData: {
   *     messageCount: 50,
   *     filterApplied: 'unread'
   *   }
   * };
   * ```
   */
  export interface ErrorContext {
    /**
     * Unique identifier for the user who encountered the error.
     *
     * Used to track error patterns per user, identify affected accounts,
     * and correlate errors with user actions.
     */
    userId?: string;

    /**
     * Unique identifier for the current user session.
     *
     * Enables grouping of errors within a single session to understand
     * error sequences and session-specific issues.
     */
    sessionId?: string;

    /**
     * Source component, service, or module where the error occurred.
     *
     * Helps quickly identify the origin of errors during triage and analysis.
     *
     * @example 'EmailService', 'MessageList', 'AuthProvider'
     */
    source?: string;

    /**
     * Browser user agent string for environment identification.
     *
     * Automatically captured in browser environments to track browser-specific
     * issues and compatibility problems.
     */
    userAgent?: string;

    /**
     * Full URL where the error occurred.
     *
     * Includes pathname, query parameters, and hash for precise error location.
     * Automatically captured in browser environments.
     */
    url?: string;

    /**
     * Timestamp when the error occurred.
     *
     * Automatically set by the error reporter if not provided. Used for
     * chronological analysis and time-based correlation.
     */
    timestamp?: Date;

    /**
     * React component stack trace from error boundary.
     *
     * Captured by React error boundaries to show the component hierarchy
     * leading to the error. Useful for diagnosing component interaction issues.
     *
     * @example
     * ```
     * at MessageList (MessageList.tsx:45)
     * at MainLayout (Layout.tsx:23)
     * at App (App.tsx:10)
     * ```
     */
    componentStack?: string;

    /**
     * Name or identifier of the error boundary that caught this error.
     *
     * Helps identify which error boundary caught the error and understand
     * error containment boundaries in the application.
     *
     * @example 'RootErrorBoundary', 'MessageListBoundary'
     */
    errorBoundary?: string;

    /**
     * Ordered list of user actions or events leading to the error.
     *
     * Provides a chronological trail of actions that led to the error,
     * essential for reproducing issues. Should be concise identifiers.
     *
     * @example ['login', 'navigate-to-messages', 'click-filter', 'fetch-failed']
     */
    breadcrumbs?: string[];

    /**
     * Additional context-specific data for debugging.
     *
     * Flexible field for attaching any relevant data that helps diagnose
     * the error. Should be JSON-serializable for storage and transmission.
     *
     * @example
     * ```typescript
     * {
     *   requestId: 'req-abc-123',
     *   retryCount: 3,
     *   cacheHit: false,
     *   queryParams: { page: 1, limit: 50 }
     * }
     * ```
     */
    additionalData?: Record<string, unknown>;

    /**
     * The Error object itself, if available.
     *
     * Included in context to allow custom enrichment by implementing
     * the {@link IContextEnricher} interface on custom error classes.
     */
    error?: Error;
  }

  /**
   * Complete error report structure for external monitoring services.
   *
   * Combines the error, severity, context, and metadata into a single
   * package suitable for transmission to monitoring systems like Application
   * Insights, Sentry, or Google Analytics.
   *
   * @example
   * ```typescript
   * const report: ErrorReport = {
   *   error: new Error('API call failed'),
   *   severity: ErrorSeverity.HIGH,
   *   context: {
   *     source: 'ApiClient',
   *     url: '/api/messages',
   *     breadcrumbs: ['mount', 'fetch']
   *   },
   *   fingerprint: 'a3f2c1b8e9d4',
   *   tags: {
   *     environment: 'production',
   *     errorType: 'NetworkError',
   *     url: '/api/messages'
   *   }
   * };
   * ```
   */
  export interface ErrorReport {
    /**
     * The Error object containing message, stack trace, and error metadata.
     *
     * Core error information used by all monitoring systems. May be
     * enriched with additional properties by custom error classes.
     */
    error: Error;

    /**
     * Severity level for prioritization and routing.
     *
     * Determines how the error is handled, logged, and whether it triggers
     * alerts in monitoring systems.
     */
    severity: ErrorSeverity;

    /**
     * Contextual information about the error environment and state.
     *
     * Enriched automatically by the error reporter with browser/server
     * information, user data, and application state.
     */
    context: ErrorContext;

    /**
     * Unique fingerprint for error deduplication and grouping.
     *
     * Generated from error name, message, and URL to group similar errors
     * together in monitoring dashboards. Errors with the same fingerprint
     * are considered duplicates.
     *
     * @example 'RXJyb3I6VXNlcg' (base64-encoded hash)
     */
    fingerprint?: string;

    /**
     * Key-value tags for categorization and filtering in monitoring systems.
     *
     * Used by external monitoring services to filter, search, and aggregate
     * errors. Common tags include environment, error type, URL, and user agent.
     *
     * @example
     * ```typescript
     * {
     *   environment: 'production',
     *   errorType: 'TypeError',
     *   url: '/messages',
     *   userAgent: 'Mozilla/5.0...',
     *   errorBoundary: 'RootBoundary'
     * }
     * ```
     */
    tags?: Record<string, string>;
  }

  /**
   * Configuration for error report debouncing to prevent duplicate reporting.
   *
   * Debouncing prevents the same error from being reported multiple times
   * in quick succession, reducing noise in monitoring systems and preventing
   * rate limit issues with external services.
   *
   * @example
   * ```typescript
   * const debounce: ErrorReporterConfigDebounceParams = {
   *   debounceIntervalMs: 5000,        // 5 seconds between duplicate reports
   *   debounceCleanupIntervalMs: 60000 // Clean fingerprint cache every minute
   * };
   * ```
   */
  export type ErrorReporterConfigDebounceParams = {
    /**
     * Minimum time in milliseconds between reports of the same error.
     *
     * Errors with the same fingerprint within this interval will be suppressed.
     * Set to 0 to disable debouncing.
     *
     * @default 60000 (60 seconds)
     */
    debounceIntervalMs: number;

    /**
     * Interval in milliseconds for cleaning up old fingerprint cache entries.
     *
     * Prevents the fingerprint cache from growing indefinitely by periodically
     * removing old entries that are outside the debounce window.
     *
     * @default 60000 (1 minute)
     */
    debounceCleanupIntervalMs: number;
  };

  /**
   * Configuration options for customizing error reporter behavior.
   *
   * Controls which reporting channels are enabled, storage limits, and
   * environment-specific settings. Different configurations can be used
   * for development, staging, and production environments.
   *
   * @example
   * ```typescript
   * // Development configuration
   * const devConfig: ErrorReporterConfig = {
   *   enableStandardLogging: true,
   *   enableConsoleLogging: true,
   *   enableExternalReporting: false,
   *   enableLocalStorage: true,
   *   maxStoredErrors: 100,
   *   environment: 'development'
   * };
   *
   * // Production configuration
   * const prodConfig: ErrorReporterConfig = {
   *   enableStandardLogging: true,
   *   enableConsoleLogging: false,
   *   enableExternalReporting: true,
   *   enableLocalStorage: false,
   *   maxStoredErrors: 50,
   *   debounce: {
   *     debounceIntervalMs: 5000,
   *     debounceCleanupIntervalMs: 60000
   *   },
   *   environment: 'production'
   * };
   * ```
   */
  export interface ErrorReporterConfig {
    /**
     * Enable logging through the standard application logger.
     *
     * When enabled, errors are logged using the application's logger utility
     * which may include OpenTelemetry tracing, structured logging, and
     * log aggregation integration.
     *
     * @default true
     */
    enableStandardLogging: boolean;

    /**
     * Enable console.error output for errors.
     *
     * When enabled, errors are logged to the browser console with formatted
     * output including severity, context, and tags. Useful for development
     * but typically disabled in production.
     *
     * @default true in development, false in production
     */
    enableConsoleLogging: boolean;

    /**
     * Enable reporting to external monitoring services.
     *
     * When enabled, errors are sent to Application Insights, Google Analytics,
     * and other configured monitoring services. Typically enabled in staging
     * and production environments.
     *
     * @default true in production, false in development
     */
    enableExternalReporting: boolean;

    /**
     * Enable storing errors in browser localStorage.
     *
     * When enabled, errors are stored locally for offline analysis and
     * debugging. Useful in development and for capturing errors when
     * external reporting is unavailable.
     *
     * @default true in development, false in production
     */
    enableLocalStorage: boolean;

    /**
     * Maximum number of errors to store in localStorage.
     *
     * Limits the localStorage usage by keeping only the most recent errors.
     * Older errors are automatically pruned when this limit is exceeded.
     *
     * @default 50
     */
    maxStoredErrors: number;

    /**
     * Optional debouncing configuration to prevent duplicate reports.
     *
     * When configured, prevents the same error (by fingerprint) from being
     * reported multiple times within the debounce interval.
     */
    debounce?: ErrorReporterConfigDebounceParams;

    /**
     * Deployment environment for environment-specific behavior.
     *
     * Used for tagging errors, adjusting reporting behavior, and determining
     * default configuration values.
     */
    environment: KnownEnvironmentType;
  }

  /**
   * Interface describing the public API of the ErrorReporter class.
   *
   * Provides methods for reporting different types of errors, managing global
   * error handlers, and accessing stored error reports. This interface enables
   * dependency injection and testing through mock implementations.
   *
   * @example
   * ```typescript
   * class MyService {
   *   constructor(private reporter: ErrorReporterInterface) {}
   *
   *   async loadData() {
   *     try {
   *       return await fetchData();
   *     } catch (error) {
   *       await this.reporter.reportError(error, ErrorSeverity.HIGH, {
   *         source: 'MyService.loadData'
   *       });
   *       throw error;
   *     }
   *   }
   * }
   * ```
   */
  export interface ErrorReporterInterface {
    /**
     * Report an error with context and severity to all configured channels.
     *
     * This is the primary method for reporting errors throughout the application.
     * It enriches the error with context, generates fingerprints, and routes to
     * appropriate logging and monitoring systems based on configuration.
     *
     * @param error - Error object or any thrown value to report
     * @param severity - Severity level for prioritization (default: MEDIUM)
     * @param context - Additional context for debugging
     *
     * @example
     * ```typescript
     * try {
     *   await api.call();
     * } catch (error) {
     *   await reporter.reportError(error, ErrorSeverity.HIGH, {
     *     source: 'ApiService',
     *     additionalData: { endpoint: '/api/data' }
     *   });
     * }
     * ```
     */
    reportError(
      error: Error | unknown,
      severity?: ErrorSeverity,
      context?: Partial<ErrorContext>,
    ): Promise<void>;

    /**
     * Report an error caught by a React error boundary.
     *
     * Specialized method for reporting errors from React error boundaries,
     * automatically including component stack information and error boundary
     * metadata for better React-specific debugging.
     *
     * @param error - The Error object caught by the boundary
     * @param errorInfo - React error boundary metadata
     * @param errorInfo.componentStack - Component hierarchy leading to error
     * @param errorInfo.errorBoundary - Name of the boundary that caught it
     * @param severity - Severity level (default: HIGH)
     *
     * @example
     * ```typescript
     * class ErrorBoundary extends React.Component {
     *   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
     *     reporter.reportBoundaryError(error, {
     *       componentStack: errorInfo.componentStack,
     *       errorBoundary: 'MainBoundary'
     *     });
     *   }
     * }
     * ```
     */
    reportBoundaryError(
      error: Error,
      errorInfo: { componentStack?: string; errorBoundary?: string },
      severity?: ErrorSeverity,
    ): Promise<void>;

    /**
     * Report an unhandled promise rejection.
     *
     * Called automatically by global rejection handlers or manually for
     * rejected promises that weren't properly caught. Marks errors with
     * 'unhandled-promise-rejection' breadcrumb for easy identification.
     *
     * @param reason - The rejection reason (error or other value)
     * @param promise - The rejected promise (for reference)
     *
     * @example
     * ```typescript
     * window.addEventListener('unhandledrejection', (event) => {
     *   reporter.reportUnhandledRejection(event.reason, event.promise);
     * });
     * ```
     */
    reportUnhandledRejection(
      reason: unknown,
      promise: Promise<unknown>,
    ): Promise<void>;

    /**
     * Set up global error and rejection handlers.
     *
     * Registers window-level event listeners for unhandled errors and
     * promise rejections. Should be called once during application
     * initialization to ensure all errors are captured.
     *
     * Only works in browser environments (no-op on server).
     *
     * @example
     * ```typescript
     * // In app initialization
     * const reporter = ErrorReporter.getInstance();
     * reporter.setupGlobalHandlers();
     * ```
     */
    setupGlobalHandlers(): void;

    /**
     * Retrieve all errors stored in localStorage.
     *
     * Returns errors that were stored locally when enableLocalStorage is true.
     * Useful for debugging and offline error analysis. Returns empty array
     * on server or when localStorage is unavailable.
     *
     * @returns Array of stored error reports
     *
     * @example
     * ```typescript
     * const storedErrors = reporter.getStoredErrors();
     * console.log(`Found ${storedErrors.length} stored errors`);
     * storedErrors.forEach(err => {
     *   console.log(err.error.message, err.severity, err.context);
     * });
     * ```
     */
    getStoredErrors(): ErrorReport[];

    /**
     * Clear all errors from localStorage.
     *
     * Removes all stored error reports from localStorage. Useful for
     * cleanup after reviewing errors or testing error storage.
     * No-op on server or when localStorage is unavailable.
     *
     * @example
     * ```typescript
     * // After reviewing and fixing errors
     * reporter.clearStoredErrors();
     * ```
     */
    clearStoredErrors(): void;
  }

  /**
   * Interface for custom error classes that can enrich their own context.
   *
   * Custom error classes can implement this interface to provide additional
   * context-specific information when being reported. The enrichContext method
   * is called by the error reporter before finalizing the error report.
   *
   * @example
   * ```typescript
   * class DatabaseError extends Error implements IContextEnricher {
   *   constructor(
   *     message: string,
   *     public query: string,
   *     public params: unknown[]
   *   ) {
   *     super(message);
   *     this.name = 'DatabaseError';
   *   }
   *
   *   async enrichContext(context: ErrorContext): Promise<ErrorContext> {
   *     return {
   *       ...context,
   *       additionalData: {
   *         ...context.additionalData,
   *         query: this.query.slice(0, 200),
   *         paramCount: this.params.length
   *       }
   *     };
   *   }
   * }
   * ```
   */
  export type IContextEnricher = {
    /**
     * Enrich error context with class-specific information.
     *
     * Called by the error reporter to allow custom error classes to add
     * relevant debugging information to the error context. Should return
     * the enriched context or the original if no enrichment is needed.
     *
     * @param context - Current error context
     * @returns Promise resolving to enriched context
     */
    enrichContext: (context: ErrorContext) => Promise<ErrorContext>;
  };
}
