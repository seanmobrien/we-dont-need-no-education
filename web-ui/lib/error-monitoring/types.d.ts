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
     * Create a comprehensive error report from an error or error report object.
     *
     * This method is the core error report builder that normalizes errors, enriches context,
     * generates fingerprints, and produces a complete {@link ErrorReport} suitable for logging
     * and external reporting. It handles various input types including raw errors, error reports,
     * and non-error thrown values.
     *
     * ## Key Features
     *
     * - **Error Normalization**: Converts any thrown value into a proper Error object
     * - **Context Enrichment**: Automatically captures browser/server environment data
     * - **Custom Enrichment**: Calls {@link IContextEnricher.enrichContext} on errors that implement it
     * - **Database Error Detection**: Extracts detailed Postgres/Drizzle error information
     * - **Fingerprint Generation**: Creates unique identifiers for error deduplication
     * - **Tag Generation**: Builds categorization tags for monitoring systems
     * - **Defensive Error Handling**: Gracefully handles failures during report creation
     *
     * ## Error Type Handling
     *
     * The method intelligently handles different input types:
     *
     * ### Already an ErrorReport
     * If the input is already an {@link ErrorReport}, it validates and enriches it:
     * ```typescript
     * const existingReport: ErrorReport = {
     *   error: new Error('Failed'),
     *   severity: ErrorSeverity.HIGH,
     *   context: { source: 'ApiClient' }
     * };
     * const enhanced = await reporter.createErrorReport(existingReport);
     * // Result has enriched context, fingerprint, and tags
     * ```
     *
     * ### Standard Error Objects
     * Native Error instances are wrapped with context and metadata:
     * ```typescript
     * const error = new TypeError('Invalid input');
     * const report = await reporter.createErrorReport(
     *   error,
     *   ErrorSeverity.MEDIUM,
     *   { source: 'ValidationService' }
     * );
     * ```
     *
     * ### Custom Error Classes
     * Errors implementing {@link IContextEnricher} can provide additional context:
     * ```typescript
     * class ApiError extends Error implements IContextEnricher {
     *   constructor(message: string, public statusCode: number) {
     *     super(message);
     *   }
     *   async enrichContext(ctx: ErrorContext) {
     *     return {
     *       ...ctx,
     *       additionalData: {
     *         ...ctx.additionalData,
     *         statusCode: this.statusCode
     *       }
     *     };
     *   }
     * }
     * ```
     *
     * ### Non-Error Values
     * Primitive values or objects thrown without being errors are normalized:
     * ```typescript
     * throw "Something failed";  // string
     * throw { code: 404 };       // object
     * throw null;                // null/undefined
     * // All converted to Error instances with descriptive messages
     * ```
     *
     * ## Context Enrichment
     *
     * The method automatically enriches context with:
     *
     * - **Timestamps**: Current time when error occurred
     * - **Browser Data**: User agent, current URL (client-side only)
     * - **Database Errors**: Postgres error codes, SQL state, hints, constraints
     * - **Custom Enrichment**: Via {@link IContextEnricher.enrichContext} implementation
     *
     * ```typescript
     * // Input context
     * const context = {
     *   source: 'DataService',
     *   userId: 'user-123'
     * };
     *
     * // Enriched context includes
     * const enriched = {
     *   source: 'DataService',
     *   userId: 'user-123',
     *   timestamp: new Date(),
     *   userAgent: 'Mozilla/5.0...',
     *   url: 'https://app.example.com/data',
     *   // Plus any custom enrichment
     * };
     * ```
     *
     * ## Database Error Details
     *
     * For Postgres/Drizzle errors, extracts comprehensive diagnostic information:
     *
     * ```typescript
     * // Postgres error detection
     * try {
     *   await db.query.users.findMany();
     * } catch (error) {
     *   const report = await reporter.createErrorReport(error);
     *   // report.context.dbError contains:
     *   // - sqlstate: '23505' (unique violation)
     *   // - codeDescription: 'Unique constraint violation'
     *   // - constraint: 'users_email_key'
     *   // - table: 'users'
     *   // - detail: 'Key (email)=(test@example.com) already exists.'
     *   // - query: 'INSERT INTO users...' (truncated to 2000 chars)
     * }
     * ```
     *
     * ## Defensive Error Handling
     *
     * If an error occurs during report creation (e.g., in context enrichment),
     * the method captures the failure and includes it in the report:
     *
     * ```typescript
     * const report = await reporter.createErrorReport(error);
     * // If enrichment fails:
     * // report.context.additionalData.reportBuilderError contains details
     * ```
     *
     * @param error - Error object, error report, or any thrown value to create report for
     * @param severity - Severity level for prioritization (default: {@link ErrorSeverity.MEDIUM})
     * @param context - Additional context to merge with enriched environment data
     *
     * @returns Promise resolving to complete error report with enriched context and metadata
     *
     * @example
     * ```typescript
     * // Basic error reporting
     * try {
     *   await riskyOperation();
     * } catch (error) {
     *   const report = await reporter.createErrorReport(error);
     *   console.log(report.fingerprint); // For deduplication
     *   console.log(report.tags);        // For categorization
     * }
     *
     * // With severity and context
     * const report = await reporter.createErrorReport(
     *   new Error('Payment failed'),
     *   ErrorSeverity.CRITICAL,
     *   {
     *     source: 'PaymentService',
     *     userId: 'user-456',
     *     additionalData: {
     *       amount: 99.99,
     *       currency: 'USD'
     *     }
     *   }
     * );
     *
     * // Enhancing existing report
     * const existingReport: ErrorReport = {
     *   error: new Error('Timeout'),
     *   severity: ErrorSeverity.HIGH,
     *   context: { source: 'ApiClient' }
     * };
     * const enhanced = await reporter.createErrorReport(existingReport);
     * // Now has fingerprint, tags, and enriched context
     *
     * // Handling non-error values
     * try {
     *   throw "Invalid state";
     * } catch (thrown) {
     *   const report = await reporter.createErrorReport(thrown);
     *   // report.error is proper Error instance
     *   // report.error.message === "Non-error thrown: Invalid state"
     * }
     * ```
     *
     * @see {@link ErrorReport} for the complete report structure
     * @see {@link ErrorContext} for available context fields
     * @see {@link IContextEnricher} for custom error enrichment
     * @see {@link reportError} for reporting with automatic channel routing
     */
    createErrorReport(
      error: Error | unknown,
      severity?: ErrorSeverity,
      context?: Partial<ErrorContext>,
    ): Promise<ErrorReport>;
    /**
     * Generate a fingerprint for error deduplication.
     *
     * This method creates a unique identifier for an error based on its
     * properties and context to help with deduplication and grouping.
     *
     * @param error - The error object to generate a fingerprint for
     * @param context - The context in which the error occurred
     * @returns A string fingerprint uniquely identifying the error
     */
    generateFingerprint(error: Error, context: ErrorContext): string;
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
    ): Promise<ErrorReportResult>;

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
    ): Promise<ErrorReportResult>;

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
    ): Promise<ErrorReportResult>;

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

  /**
   * Configuration for error suppression patterns.
   *
   * Suppression rules allow selective filtering of errors based on message patterns,
   * source locations, or other criteria. This is useful for ignoring known issues,
   * third-party library errors, or false positives that clutter error logs.
   *
   * Rules can either completely suppress errors (no logging at all) or just prevent
   * them from being displayed in the UI while still logging them for analysis.
   *
   * @example
   * ```typescript
   * // Suppress React hydration warnings in development
   * const hydrationRule: ErrorSuppressionRule = {
   *   id: 'react-hydration-dev',
   *   pattern: /Hydration failed because/,
   *   source: /node_modules\/react-dom/,
   *   suppressCompletely: false,
   *   reason: 'Known issue in development mode, logged but not displayed'
   * };
   *
   * // Completely suppress third-party analytics errors
   * const analyticsRule: ErrorSuppressionRule = {
   *   id: 'third-party-analytics',
   *   pattern: 'ga.js',
   *   source: /google-analytics/,
   *   suppressCompletely: true,
   *   reason: 'Third-party script errors outside our control'
   * };
   *
   * // Suppress specific error message
   * const knownIssue: ErrorSuppressionRule = {
   *   id: 'known-resize-observer',
   *   pattern: 'ResizeObserver loop limit exceeded',
   *   suppressCompletely: false,
   *   reason: 'Browser quirk, harmless, tracking for metrics only'
   * };
   * ```
   */
  export interface ErrorSuppressionRule {
    /**
     * Unique identifier for this suppression rule.
     *
     * Used for tracking which rule suppressed an error and for managing
     * rule configuration. Should be descriptive and follow a consistent
     * naming convention.
     *
     * @example 'react-hydration-warning', 'third-party-script-error'
     */
    id: string;

    /**
     * Pattern to match against error messages.
     *
     * Can be a string (substring match) or RegExp (pattern match).
     * String matching is case-sensitive and checks if the error message
     * contains the pattern. RegExp allows for more complex matching.
     *
     * @example
     * ```typescript
     * // String matching (contains)
     * pattern: 'Network request failed'
     *
     * // RegExp matching
     * pattern: /^TypeError: Cannot read property/
     * pattern: /hydration|mismatch/i  // Case-insensitive
     * ```
     */
    pattern: string | RegExp;

    /**
     * Optional pattern to match against error source/filename.
     *
     * Can be used to suppress errors from specific files, modules, or
     * third-party libraries. Like pattern, supports both string and RegExp.
     *
     * @example
     * ```typescript
     * // Suppress errors from node_modules
     * source: /node_modules/
     *
     * // Suppress errors from specific file
     * source: 'analytics.js'
     *
     * // Suppress errors from vendor scripts
     * source: /vendor\/.*\.js$/
     * ```
     */
    source?: string | RegExp;

    /**
     * Whether to completely suppress the error or just prevent UI display.
     *
     * - **true**: Complete suppression - no logging, no storage, no reporting
     * - **false** (default): Partial suppression - still logged and stored,
     *   but not displayed in error UI or sent to external monitoring
     *
     * Use complete suppression sparingly, only for truly harmless errors
     * that provide no diagnostic value.
     *
     * @default false
     */
    suppressCompletely?: boolean;

    /**
     * Human-readable description of why this error is suppressed.
     *
     * Provides context for future maintainers about why the suppression
     * rule exists and whether it's still necessary. Should include:
     * - What the error indicates
     * - Why it's safe to suppress
     * - Any conditions for removing the rule
     *
     * @example
     * ```typescript
     * reason: 'Known React 18 hydration issue in development mode. ' +
     *         'Will be fixed in React 19. Safe to suppress until upgrade.'
     *
     * reason: 'Third-party analytics script errors we cannot control. ' +
     *         'Users are not affected. Still logged for monitoring trends.'
     * ```
     */
    reason?: string;

    /**
     * Optional flag indicating if a page reload is recommended after this error.
     *
     * When true, suggests that the application state may be compromised
     * and a reload could help recover. This flag can be used by UI components
     * to trigger an automatic reload or prompt to the user.
     *
     * @example
     * ```typescript
     * reload: true
     * ```
     */
    reload?: boolean;
  }

  /**
   * Result of evaluating error suppression rules against an error.
   *
   * Indicates whether an error should be suppressed, which rule matched,
   * and the type of suppression to apply. Used internally by the error
   * reporter to determine how to handle an error.
   *
   * @example
   * ```typescript
   * const result: SuppressionResult = {
   *   suppress: true,
   *   rule: {
   *     id: 'react-hydration',
   *     pattern: /Hydration/,
   *     suppressCompletely: false,
   *     reason: 'Known dev issue'
   *   },
   *   completely: false
   * };
   *
   * if (result.suppress && !result.completely) {
   *   // Log but don't display
   *   logger.log(error);
   * }
   * ```
   */
  export type SuppressionResult = {
    /**
     * Whether the error should be suppressed.
     *
     * When true, the error matched at least one suppression rule and
     * should be handled according to the 'completely' flag.
     */
    suppress: boolean;

    /**
     * The suppression rule that matched, if any.
     *
     * Undefined when suppress is false. Provides details about which
     * rule triggered the suppression for logging and debugging.
     */
    rule?: ErrorSuppressionRule;

    /**
     * Whether to completely suppress the error.
     *
     * - **true**: No logging, storage, or reporting at all
     * - **false**: Log and store, but don't display or send to external monitoring
     * - **undefined**: When suppress is false
     */
    completely?: boolean;
  };

  /**
   * Detailed result of attempting to report an error.
   *
   * Provides comprehensive feedback about how an error was processed,
   * including which reporting channels were activated and whether any
   * suppression rules applied. Useful for testing, debugging, and
   * monitoring the error reporting system itself.
   *
   * @example
   * ```typescript
   * const result: ErrorReportResult = {
   *   suppress: false,
   *   rule: 'none',
   *   completely: false,
   *   logged: true,      // Sent to standard logger
   *   console: true,     // Output to console
   *   stored: true,      // Saved to localStorage
   *   reported: true     // Sent to external monitoring
   * };
   *
   * // Check reporting status
   * if (!result.reported) {
   *   console.warn('Error not sent to external monitoring');
   * }
   *
   * // Suppressed error example
   * const suppressed: ErrorReportResult = {
   *   suppress: true,
   *   rule: { id: 'known-issue', ... },
   *   completely: false,
   *   logged: true,      // Still logged
   *   console: false,    // Not shown in console
   *   stored: true,      // Still stored
   *   reported: false    // Not sent externally
   * };
   * ```
   */
  export type ErrorReportResult = Omit<SuppressionResult, 'rule'> & {
    /**
     * The full error report that was processed.
     *
     * Includes error, severity, context, fingerprint, and tags.
     */
    report: ErrorReport;
    /**
     * Identifier of the suppression rule that matched.
     *
     * - String 'none': No suppression rule matched
     * - String (rule ID): The ID of the matching rule
     * - ErrorSuppressionRule: The full rule object
     *
     * @example 'react-hydration', 'third-party-script', 'none'
     */
    rule: string | ErrorSuppressionRule;

    /**
     * Whether the error was logged via standard application logger.
     *
     * True if enableStandardLogging is true and error wasn't completely
     * suppressed. Logger may integrate with OpenTelemetry tracing and
     * structured logging systems.
     */
    logged: boolean;

    /**
     * Whether the error was output to the console.
     *
     * True if enableConsoleLogging is true and error wasn't completely
     * suppressed or partially suppressed. Typically enabled only in
     * development environments.
     */
    console: boolean;

    /**
     * Whether the error was saved to localStorage.
     *
     * True if enableLocalStorage is true, localStorage is available,
     * and error wasn't completely suppressed. Useful for offline
     * debugging and error review.
     */
    stored: boolean;

    /**
     * Whether the error was sent to external monitoring services.
     *
     * True if enableExternalReporting is true and error wasn't
     * suppressed (either partially or completely). External services
     * include Application Insights, Google Analytics, Sentry, etc.
     */
    reported: boolean;
  };
}
