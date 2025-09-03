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
import { isRunningOnEdge } from '../site-util/env';

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

  #createErrorReport(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
  ): ErrorReport {
    let baseReport: ErrorReport;
    // Check to see if this is an error report already
    if (
      typeof error === 'object' &&
      !!error &&
      'error' in error &&
      isError(error.error) &&
      'context' in error &&
      !!error.context &&
      'severity' in error &&
      error.severity !== null &&
      error.severity !== undefined
    ) {
      baseReport = error as ErrorReport;
    } else {
      // Ensure we have a proper Error object
      const errorObj = this.normalizeError(error);
      baseReport = {
        error: errorObj,
        severity,
      } as ErrorReport;
    }

    // Enrich context with browser/environment data
    const enrichedContext = this.enrichContext({
      ...(baseReport.context ?? {}),
      ...context,
    });

    // Create error report
    return {
      ...baseReport,
      fingerprint: this.generateFingerprint(baseReport.error!, enrichedContext),
      context: enrichedContext,
      tags: {
        ...(baseReport.tags ?? {}),
        ...this.generateTags(baseReport.error!, enrichedContext),
      },
    };
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
      const report = this.#createErrorReport(error, severity, context);

      if (this.config.enableStandardLogging) {
        log((l) =>
          l.error({
            source: report.context.source ?? 'ErrorReporter',
            error: report.error,
            severity: report.severity,
            fingerprint: report.fingerprint,
            tags: report.tags,
            context: report.context,
          }),
        );
      }

      // Console logging for development
      if (this.config.enableConsoleLogging) {
        console.group(`🐛 Error Report [${severity.toUpperCase()}]`);
        console.error('Error:', report.error);
        console.table(report.context);
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
    if (isRunningOnEdge()) {
      console.log('setupGlobalHandlers::edge');
    }

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

  private async server_reportToApplicationInsights(
    report: ErrorReport,
  ): Promise<void> {
    try {
      // Dynamic import so code doesn't hard-depend on OpenTelemetry at runtime
      const otel = await import('@opentelemetry/api');
      const { trace, context, SpanStatusCode } =
        otel as typeof import('@opentelemetry/api');

      const activeSpan = trace.getSpan(context.active());
      // Build safe attributes: ensure values are primitive (strings)
      const safeAttributes: Record<string, string> = {
        'error.fingerprint': report.fingerprint ?? '',
        ...(report.tags ?? {}),
        severity: String(report.severity),
        context: JSON.stringify(report.context || {}),
      };

      // If there is an active and still-recording span, attach the error there.
      // Span.isRecording() is the official guard to know if the span can accept events/attributes.
      if (
        activeSpan &&
        typeof (activeSpan as { isRecording: () => boolean }).isRecording ===
          'function' &&
        (activeSpan as { isRecording: () => boolean }).isRecording()
      ) {
        try {
          activeSpan.setAttributes(
            safeAttributes as unknown as import('@opentelemetry/api').Attributes,
          );
        } catch {
          // ignore attribute errors
        }
        activeSpan.recordException(report.error as unknown as Error);
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: report.error.message,
        });
        activeSpan.addEvent('error.reported', {
          context: safeAttributes.context,
        } as import('@opentelemetry/api').Attributes);
        return;
      }

      // If there was an active span but it has ended (or no active span), create a new
      // short-lived span that is linked to the original span context so the error stays
      // correlated to the same trace.
      const tracer = trace.getTracer('noeducation/error-reporter');
      const links = activeSpan
        ? [{ context: activeSpan.spanContext() }]
        : undefined;
      const span = tracer.startSpan('error.report', {
        attributes:
          safeAttributes as unknown as import('@opentelemetry/api').Attributes,
        links,
      });
      try {
        span.recordException(report.error as unknown as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: report.error.message,
        });
        span.addEvent('error.reported', {
          context: safeAttributes.context,
        } as import('@opentelemetry/api').Attributes);
      } finally {
        span.end();
      }
    } catch (err) {
      log((l) => l.warn('OpenTelemetry error reporting failed', err));
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
    if (typeof window === 'undefined') {
      await this.server_reportToApplicationInsights(report);
      return;
    }
    if (process.env.NEXT_RUNTIME === 'EDGE') {
      log((l) => l.debug('Would report to Application Insights:', report));
      return;
    }
    await this.client_reportToApplicationInsights(report);
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
