import { isError } from '@/lib/react-util/utility-methods';
import { log } from '@/lib/logger';
import {
  ErrorSeverity,
  KnownEnvironmentType,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
} from './types';

export { ErrorSeverity };

export type {
  KnownEnvironmentType,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
};

const isGtagClient = <T>(
  check: T,
): check is T & {
  gtag: (
    signal: string,
    event: string,
    params: Record<string, unknown>,
  ) => void;
} =>
  typeof check === 'object' &&
  check !== null &&
  'gtag' in check &&
  typeof check.gtag === 'function';

const asEnvironment = (input: string): KnownEnvironmentType => {
  return ['development', 'staging', 'production'].includes(input)
    ? (input as KnownEnvironmentType)
    : 'development';
};

const defaultConfig: ErrorReporterConfig = {
  enableStandardLogging: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableExternalReporting: process.env.NODE_ENV === 'production',
  enableLocalStorage: true,
  maxStoredErrors: 50,
  environment: asEnvironment(process.env.NODE_ENV),
};

/**
 * Centralized error reporting system
 * Handles logging, external service reporting, and error analytics
 */
export class ErrorReporter implements ErrorReporterInterface {
  private config: ErrorReporterConfig;
  private static instance: ErrorReporterInterface;

  private constructor(config: ErrorReporterConfig) {
    this.config = config;
  }

  /**
   * Create a new instance of ErrorReporter
   * @param config ErrorReporter configuration
   * @returns ErrorReporter instance
   */
  public static createInstance = (
    config: Partial<ErrorReporterConfig>,
  ): ErrorReporterInterface =>
    new ErrorReporter({
      ...defaultConfig,
      ...config,
    });

  /**
   * Get singleton instance of ErrorReporter
   */
  public static getInstance(
    config?: ErrorReporterConfig,
  ): ErrorReporterInterface {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = ErrorReporter.createInstance(config ?? {});
    }
    return ErrorReporter.instance;
  }

  /**
   * Report an error with context and severity
   */
  public async reportError(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
  ): Promise<void> {
    try {
      // Ensure we have a proper Error object
      const errorObj = this.normalizeError(error);

      // Enrich context with browser/environment data
      const enrichedContext = this.enrichContext(context);

      // Create error report
      const report: ErrorReport = {
        error: errorObj,
        severity,
        context: enrichedContext,
        fingerprint: this.generateFingerprint(errorObj, enrichedContext),
        tags: this.generateTags(errorObj, enrichedContext),
      };

      if (this.config.enableStandardLogging) {
        const { LoggedError } = await import(
          '@/lib/react-util/errors/logged-error'
        );
        // Use LoggedError for consistent logging
        LoggedError.isTurtlesAllTheWayDownBaby(errorObj, {
          log: this.config.enableConsoleLogging,
          source: 'ErrorReporter',
          critical: severity === ErrorSeverity.CRITICAL,
          ...enrichedContext,
        });
      }

      // Console logging for development
      if (this.config.enableConsoleLogging) {
        console.group(`🐛 Error Report [${severity.toUpperCase()}]`);
        console.error('Error:', errorObj);
        console.table(enrichedContext);
        console.groupEnd();
      }

      // Store error locally for offline analysis
      if (this.config.enableLocalStorage && typeof window !== 'undefined') {
        this.storeErrorLocally(report);
      }

      // Report to external services
      if (this.config.enableExternalReporting) {
        await Promise.allSettled([
          this.reportToGoogleAnalytics(report),
          this.reportToApplicationInsights(report),
          // Add other monitoring services here
        ]);
      }
    } catch (reportingError) {
      // Avoid infinite loops - just log to console
      log((l) => l.error('Error in error reporting system', reportingError));
    }
  }

  /**
   * Report a caught error from an error boundary
   */
  public async reportBoundaryError(
    error: Error,
    errorInfo: { componentStack?: string; errorBoundary?: string },
    severity: ErrorSeverity = ErrorSeverity.HIGH,
  ): Promise<void> {
    await this.reportError(error, severity, {
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      breadcrumbs: ['error-boundary-catch'],
    });
  }

  /**
   * Report unhandled promise rejections
   */
  public async reportUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>,
  ): Promise<void> {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    await this.reportError(error, ErrorSeverity.HIGH, {
      breadcrumbs: ['unhandled-promise-rejection'],
      additionalData: { promiseString: promise.toString() },
    });
  }

  /**
   * Set up global error handlers
   */
  public setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.reportError(
        event.error || new Error(event.message),
        ErrorSeverity.HIGH,
        {
          url: window.location.href,
          breadcrumbs: ['global-error-handler'],
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportUnhandledRejection(event.reason, event.promise);
    });
  }

  /**
   * Normalize any thrown value to an Error object
   */
  private normalizeError(error: unknown): Error {
    if (isError(error)) {
      return error;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    return new Error(`Non-error thrown: ${String(error)}`);
  }

  /**
   * Enrich error context with browser and application data
   */
  private enrichContext(context: Partial<ErrorContext>): ErrorContext {
    const enriched: ErrorContext = {
      timestamp: new Date(),
      ...context,
    };

    if (typeof window !== 'undefined') {
      enriched.userAgent = navigator.userAgent;
      enriched.url = window.location.href;
    }

    return enriched;
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const key = `${error.name}:${error.message}:${context.url || 'unknown'}`;
    return btoa(key)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
  }

  /**
   * Generate tags for error categorization
   */
  private generateTags(
    error: Error,
    context: ErrorContext,
  ): Record<string, string> {
    return {
      environment: this.config.environment,
      errorType: error.name,
      url: context.url || 'unknown',
      userAgent: context.userAgent?.substring(0, 50) || 'unknown',
      errorBoundary: context.errorBoundary || 'none',
    };
  }

  /**
   * Store error in localStorage for offline analysis
   */
  private storeErrorLocally(report: ErrorReport): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const stored = JSON.parse(localStorage.getItem('error-reports') || '[]');
      stored.push({
        ...report,
        error: {
          name: report.error.name,
          message: report.error.message,
          stack: report.error.stack,
        },
      });

      // Keep only the most recent errors
      const trimmed = stored.slice(-this.config.maxStoredErrors);
      localStorage.setItem('error-reports', JSON.stringify(trimmed));
    } catch {
      // Storage failed, ignore
    }
  }

  /**
   * Report to Google Analytics if available
   */
  private async reportToGoogleAnalytics(report: ErrorReport): Promise<void> {
    if (typeof window !== 'undefined' && isGtagClient(window)) {
      window.gtag('event', 'exception', {
        description: report.error.message,
        fatal: report.severity === ErrorSeverity.CRITICAL,
        error_severity: report.severity,
        error_fingerprint: report.fingerprint,
      });
    }
  }

  private async client_reportToApplicationInsights(
    report: ErrorReport,
  ): Promise<void> {
    await import('@/instrument/browser').then((m) => {
      const appInsights = m.getAppInsights();
      if (appInsights) {
        appInsights.trackException({
          exception: report.error,
          severityLevel: this.mapSeverityToAppInsights(report.severity),
          properties: {
            ...report.tags,
            ...report.context,
            fingerprint: report.fingerprint,
          },
        });
      }
    });
  }

  /**
   * Report to Application Insights if available
   */
  private async reportToApplicationInsights(
    report: ErrorReport,
  ): Promise<void> {
    // Implementation would depend on Application Insights setup
    // This is a placeholder for Azure Application Insights integration
    if (typeof window === 'undefined' || process.env.NEXT_RUNTIME === 'EDGE') {
      return;
    }
    await this.client_reportToApplicationInsights(report);
    log((l) => l.debug('Would report to Application Insights:', report));
  }

  /**
   * Map our ErrorSeverity enum to Application Insights KnownSeverityLevel
   */
  private mapSeverityToAppInsights(severity: ErrorSeverity): number {
    // Using numeric values that correspond to Application Insights KnownSeverityLevel enum
    // Based on the pattern: error -> Error, warn -> Warning, info -> Information, default -> Verbose
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 3; // KnownSeverityLevel.Error
      case ErrorSeverity.MEDIUM:
        return 2; // KnownSeverityLevel.Warning
      case ErrorSeverity.LOW:
        return 1; // KnownSeverityLevel.Information
      default:
        return 0; // KnownSeverityLevel.Verbose
    }
  }

  /**
   * Get stored errors for debugging
   */
  public getStoredErrors(): ErrorReport[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('error-reports') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  public clearStoredErrors(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error-reports');
    }
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();

// Auto-setup global handlers
if (typeof window !== 'undefined') {
  // errorReporter.setupGlobalHandlers();
}
