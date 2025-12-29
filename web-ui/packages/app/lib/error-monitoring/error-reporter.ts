import { isError } from '@/lib/react-util/utility-methods';
import { log, safeSerialize } from '@compliance-theater/logger';
import {
  ErrorSeverity,
  KnownEnvironmentType,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
  IContextEnricher,
  ErrorReportResult,
} from './types';
import { isRunningOnEdge } from '../site-util/env';
import { isDrizzleError, errorFromCode } from '@/lib/drizzle-db/drizzle-error';
import type { PostgresError } from '@/lib/drizzle-db/drizzle-error';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { shouldSuppressError } from './utility';
import {
  type ErrorReportArgs,
  LoggedError,
} from '@/lib/react-util/errors/logged-error';
import { LRUCache } from 'lru-cache';
import { StrategyCollectionFactory } from './strategies/strategy-collection-factory';
import { CircuitBreaker } from './circuit-breaker';
export { ErrorSeverity };

export type {
  KnownEnvironmentType,
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
  ErrorReporterInterface,
};

const asEnvironment = (input: string): KnownEnvironmentType => {
  return ['development', 'staging', 'production'].includes(input)
    ? (input as KnownEnvironmentType)
    : 'development';
};

/**
 * Type guard to check if a value is an ErrorReport
 * @param check unknown value to check
 * @returns boolean indicating if the value is an ErrorReport
 */
const isErrorReport = (check: unknown): check is ErrorReport =>
  typeof check === 'object' &&
  check !== null &&
  'error' in check &&
  isError(check.error) &&
  'context' in check &&
  check.context !== null &&
  'severity' in check &&
  check.severity !== null &&
  check.severity !== undefined;

const defaultConfig: ErrorReporterConfig = {
  enableStandardLogging: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableExternalReporting: process.env.NODE_ENV === 'production',
  enableLocalStorage: true,
  maxStoredErrors: 50,
  environment: asEnvironment(process.env.NODE_ENV),
  triggerMax: 10,
  triggerTtl: 1.5 * 60 * 1000,
  switchMax: 3,
  switchTtl: 5 * 60 * 1000,
  triggerTimeout: 3 * 60 * 1000,
};

const isContextEnricher = (check: unknown): check is IContextEnricher =>
  typeof check === 'object' &&
  check !== null &&
  'enrichContext' in check &&
  typeof (check as IContextEnricher).enrichContext === 'function';

const ERROR_REPORTER_SINGLETON_KEY =
  '@noeducation/error-monitoring:ErrorReporter';

export class ErrorReporter implements ErrorReporterInterface {
  readonly #errorReportHandler: (args: ErrorReportArgs) => void;
  private config: ErrorReporterConfig;
  private debounceCache: LRUCache<string, number>;
  private circuitBreaker: CircuitBreaker | null = null;
  #globalEventHandlers: {
    error?: (event: ErrorEvent) => void;
    rejection?: (event: PromiseRejectionEvent) => void;
  } = {};

  private constructor(config: ErrorReporterConfig) {
    this.config = config;

    // Initialize LRU Cache for debounce
    const debounceIntervalMs = config.debounce?.debounceIntervalMs ?? 240000; // 4 mins default
    // We don't need explicit cleanup interval as LRUCache handles ttl
    this.debounceCache = new LRUCache<string, number>({
      max: 500, // Reasonable max size to prevent memory leaks
      ttl: debounceIntervalMs,
    });

    // Initialize Circuit Breaker if configured
    if (config.triggerMax && config.triggerTtl) {
      this.circuitBreaker = new CircuitBreaker({
        triggerMax: config.triggerMax,
        triggerTtl: config.triggerTtl,
        switchMax: config.switchMax ?? 10, // Default or ensure required in type if strictly needed
        switchTtl: config.switchTtl ?? 60000,
        triggerTimeout: config.triggerTimeout ?? 30000,
      });
    }
    this.#errorReportHandler = (args: ErrorReportArgs) => {
      let severity: ErrorSeverity | undefined;
      try {
        switch (args.severity) {
          case 'Verbose':
            severity = ErrorSeverity.LOW;
            break;
          case 'Information':
            severity = ErrorSeverity.MEDIUM;
            break;
          case 'Warning':
            severity = ErrorSeverity.MEDIUM;
            break;
          case 'Error':
            severity = ErrorSeverity.HIGH;
            break;
          case 'Critical':
            severity = ErrorSeverity.CRITICAL;
            break;
          case undefined:
            severity = undefined;
            break;
          default:
            severity = ErrorSeverity.HIGH;
            break;
        }
        this.reportError(args.error, severity, args.context);
      } catch (e) {
        // console.error is needed here to avoid infinite recursion
        console.error('Failed to report error', e);
      }
    };
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
  public static getInstance = (
    config?: Partial<ErrorReporterConfig>,
  ): ErrorReporterInterface =>
    SingletonProvider.Instance.getRequired(ERROR_REPORTER_SINGLETON_KEY, () =>
      ErrorReporter.createInstance(config ?? {}),
    );

  private shouldDebounce(report: ErrorReport): boolean {
    if (!report.fingerprint) {
      // Without a fingerprint we don't have a basis to debounce
      return false;
    }
    // Check if the fingerprint is in the cache
    if (this.debounceCache.has(report.fingerprint)) {
      return true;
    }

    // Add to cache with current timestamp
    this.debounceCache.set(report.fingerprint, Date.now());
    return false;
  }

  async createErrorReport(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
  ): Promise<ErrorReport> {
    let baseReport: ErrorReport | undefined;
    let enrichedContext: ErrorContext | undefined;
    try {
      // Check to see if this is an error report already
      if (isErrorReport(error)) {
        baseReport = error;
        if (!baseReport.error.message) {
          baseReport.error = this.normalizeError(baseReport.error);
        }
      } else {
        // Ensure we have a proper Error object
        const errorObj = this.normalizeError(error);
        baseReport = {
          error: errorObj,
          severity,
          context: {},
        };
      }

      // Enrich context with browser/environment data
      enrichedContext = await this.enrichContext({
        ...(baseReport.context ?? {}),
        ...context,
      });

      // Create error report
      return {
        ...baseReport,
        fingerprint: this.generateFingerprint(
          baseReport.error!,
          enrichedContext,
        ),
        context: enrichedContext,
        tags: {
          ...(baseReport.tags ?? {}),
          ...this.generateTags(baseReport.error!, enrichedContext),
        },
      };
    } catch (reportBuilderError) {
      enrichedContext = {
        ...(enrichedContext ?? context ?? {}),
        additionalData: {
          ...((enrichedContext ?? context)?.additionalData ?? {}),
          reportBuilderError: safeSerialize(reportBuilderError),
        },
      };
      if (baseReport) {
        baseReport.context = {
          ...(baseReport.context ?? {}),
          ...enrichedContext,
        };
      } else {
        baseReport = {
          error: this.normalizeError(error),
          severity,
          context: enrichedContext,
        };
      }
      return {
        ...baseReport,
        fingerprint: this.generateFingerprint(
          baseReport.error!,
          enrichedContext ?? context ?? {},
        ),
      };
    }
  }

  /**
   * Report an error with context and severity
   */
  public async reportError(
    error: Error | unknown,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
  ): Promise<ErrorReportResult> {
    let result: ErrorReportResult | undefined;
    let report: ErrorReport | undefined;
    try {
      // Ensure we have a proper Error object
      report = await this.createErrorReport(error, severity, context);
      if (!report) {
        throw new Error('Failed to create error report');
      }
      // Check for debounce/deduping
      if (this.shouldDebounce(report)) {
        return {
          report,
          suppress: true,
          completely: true,
          rule: 'debounce',
          logged: false,
          console: false,
          stored: false,
          reported: false,
        };
      }
      // Check suppression rules
      result = {
        report,
        rule: 'missing',
        ...shouldSuppressError({ error: report.error }),
        logged: false,
        console: false,
        stored: false,
        reported: false,
      };
      if (result.suppress && result.completely) {
        return result;
      }

      // Check Circuit Breaker
      if (this.circuitBreaker && this.circuitBreaker.getState() !== 'closed') {
        // If circuit is open, suppress external reporting but allow console/logging based on 'completely' flag
        // However, circuit breaker usually means "stop reporting to valid backends".
        // Use a special rule for circuit breaker
        Object.assign(result, {
          suppress: true,
          completely: true, // Circuit breaker stops everything usually? Or just downstream?
          // User requirement: "All errors are suppressed for trigger timeout period"
          // So completely = true is correct per user req "all errors are suppressed"
          rule: 'circuit-breaker',
        });
      } else if (this.circuitBreaker) {
        // Record potential error if not suppressed by other rules
        if (!result.suppress) {
          this.circuitBreaker.recordError();
        }
      }

      // Execute enabled strategies
      // Pass the current result (which contains suppression info) to the factory
      const strategies = StrategyCollectionFactory.createStrategies(
        this.config,
        result,
      );

      for (const strategy of strategies) {
        try {
          const strategyResult = await strategy.execute(report, this.config);
          Object.assign(result, strategyResult);
        } catch (strategyError) {
          log((l) =>
            l.error('Error executing reporting strategy', {
              cause: safeSerialize(error),
              strategyError: safeSerialize(strategyError),
            }),
          );
        }
      }
    } catch (reportingError) {
      // Avoid infinite loops - just log to console
      console.error('Error in error reporting system', {
        cause: safeSerialize(error, { maxObjectDepth: 2 }),
        reportingError: safeSerialize(reportingError),
      });
      if (!result) {
        result = {
          report: report ?? {
            error: this.normalizeError(error),
            severity,
            context,
          },
          suppress: true,
          completely: false,
          rule: 'reporting-failure',
          logged: true,
          console: false,
          stored: false,
          reported: false,
        };
      }
    }
    return result;
  }

  /**
   * Report a caught error from an error boundary
   */
  public reportBoundaryError(
    error: Error,
    errorInfo: { componentStack?: string; errorBoundary?: string },
    severity: ErrorSeverity = ErrorSeverity.HIGH,
  ): Promise<ErrorReportResult> {
    return this.reportError(error, severity, {
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      breadcrumbs: ['error-boundary-catch'],
    });
  }

  /**
   * Report unhandled promise rejections
   */
  public reportUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>,
  ): Promise<ErrorReportResult> {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    return this.reportError(error, ErrorSeverity.HIGH, {
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
      log((l) => l.info('setupGlobalHandlers::edge'));
    }
    const eventHandlers = {
      error: (event: ErrorEvent) => {
        event.stopPropagation();
        event.preventDefault();
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
      },
      rejection: (event: PromiseRejectionEvent) => {
        event.stopPropagation();
        event.preventDefault();
        this.reportUnhandledRejection(event.reason, event.promise);
      },
    };
    // Pro-active cleanup as we are about to replace event handlers
    this.removeGlobalHandlers();
    // Unhandled errors
    window.addEventListener('error', eventHandlers.error);
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', eventHandlers.rejection);
    this.#globalEventHandlers = eventHandlers;
  }

  public removeGlobalHandlers(): void {
    if (typeof window === 'undefined') return;
    if (isRunningOnEdge()) {
      log((l) => l.info('removeGlobalHandlers::edge'));
    }
    if (this.#globalEventHandlers.error) {
      window.removeEventListener('error', this.#globalEventHandlers.error);
    }
    if (this.#globalEventHandlers.rejection) {
      window.removeEventListener(
        'unhandledrejection',
        this.#globalEventHandlers.rejection,
      );
    }
    this.#globalEventHandlers = {};
  }

  /**
   * Normalize any thrown value to an Error object
   */
  private normalizeError(error: unknown): Error {
    let normalError: Error;
    if (isError(error)) {
      normalError = error;
    } else {
      if (typeof error === 'string') {
        normalError = new Error(LoggedError.buildMessage(error));
      } else {
        normalError = !!error
          ? new Error(`Non-error thrown: ${LoggedError.buildMessage(error)}`)
          : new TypeError('Normalized null error');
      }
    }
    if (!normalError.message) {
      normalError.message = `Unknown error - No details provided [${LoggedError.buildMessage(
        normalError,
      )}]`;
    }
    return normalError;
  }

  /**
   * Enrich error context with browser and application data
   */
  private async enrichContext(
    context: Partial<ErrorContext>,
  ): Promise<ErrorContext> {
    const enriched: ErrorContext = {
      timestamp: new Date(),
      ...context,
    };

    if (typeof window !== 'undefined') {
      enriched.userAgent = navigator.userAgent;
      enriched.url = window.location.href;
    }

    // If the error (or wrapped cause/originalError) is a Postgres/Drizzle
    // error, extract comprehensive failure information and attach it to
    // the context. We purposely truncate potentially-large or
    // sensitive fields (SQL text, parameter arrays) to avoid leaking data
    // while still providing useful diagnostics.
    try {
      const candidates: unknown[] = [];
      if (context && 'error' in context && context.error)
        candidates.push(context.error);
      // Some wrappers store the lower-level error on `cause` or `originalError`.
      const maybeErr = (context as unknown as { error?: unknown }).error;
      const maybeCause =
        (maybeErr as unknown as { cause?: unknown; originalError?: unknown })
          ?.cause ??
        (maybeErr as unknown as { cause?: unknown; originalError?: unknown })
          ?.originalError;
      if (maybeCause) candidates.push(maybeCause);

      for (const c of candidates) {
        if (isDrizzleError(c)) {
          const pg = c as PostgresError;
          const dbFailure = {
            sqlstate: pg.code,
            codeDescription: errorFromCode(pg.code),
            severity: pg.severity,
            detail: pg.detail,
            hint: pg.hint,
            position: pg.position,
            internalPosition: pg.internalPosition,
            internalQuery: pg.internalQuery,
            where: pg.where,
            schema: pg.schema,
            table: pg.table,
            column: pg.column,
            dataType: pg.dataType,
            constraint: pg.constraint,
            file: pg.file,
            line: pg.line,
            routine: pg.routine,
            // Truncate long SQL or parameter payloads to keep reports safe and small
            query:
              typeof pg.query === 'string'
                ? pg.query.slice(0, 2000)
                : undefined,
            parameters: Array.isArray(pg.parameters)
              ? pg.parameters.slice(0, 20)
              : undefined,
            // Keep a minimal reference to nested errors where useful
            causeName:
              (pg.cause as unknown as { name?: string })?.name ?? undefined,
            originalErrorName:
              (pg.originalError as unknown as { name?: string })?.name ??
              undefined,
          } as const;

          // Attach under a stable key so downstream consumers can read it.
          (enriched as Record<string, unknown>).dbError = dbFailure;
          break; // one DB error is enough
        }
      }
    } catch (err) {
      // extraction should never crash the reporter; if it does, log and continue
      log((l) =>
        l.warn('Failed to extract DB failure info for error reporter', err),
      );
    }

    // Give our error a chance to enrich the context further
    if (isContextEnricher(enriched.error)) {
      try {
        const further = await enriched.error.enrichContext(enriched);
        if (further) {
          Object.assign(enriched, further);
        }
      } catch (err) {
        log((l) =>
          l.warn('Error in custom context enricher for error reporting', err),
        );
      }
    }
    return enriched;
  }

  /**
   * Generate a fingerprint for error deduplication
   */
  public generateFingerprint(error: Error, context: ErrorContext): string {
    const key = `${error.name}:${error.message}:${context.url || 'unknown'}`;
    return btoa(encodeURIComponent(key))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
  }

  public subscribeToErrorReports(): void {
    try {
      // Defensively unsubscribe to avoid duplicate registration
      this.unsubscribeFromErrorReports();
      // Subscribe handlers
      LoggedError.subscribeToErrorReports(this.#errorReportHandler);
      this.setupGlobalHandlers();
    } catch (e) {
      this.reportError(e, ErrorSeverity.HIGH, {
        additionalData: {
          message: 'Failed to subscribe to logged errors',
        },
      });
    }
  }
  public unsubscribeFromErrorReports(): void {
    try {
      LoggedError.unsubscribeFromErrorReports(this.#errorReportHandler);
      this.removeGlobalHandlers();
    } catch (e) {
      this.reportError(e, ErrorSeverity.HIGH, {
        additionalData: {
          message: 'Failed to unsubscribe from logged errors',
        },
      });
    }
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

interface ErrorReporterInstanceOverloads {
  (): ErrorReporterInterface;
  <
    TCallback extends (
      reporter: ErrorReporterInterface,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => any extends infer TResult ? TResult : never,
  >(
    cb: TCallback,
  ): ReturnType<TCallback>;
}

// Export singleton instance
export const errorReporter: ErrorReporterInstanceOverloads = (
  cb?: (reporter: ErrorReporterInterface) => unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const reporter = ErrorReporter.getInstance();
  if (typeof cb === 'undefined') {
    return reporter;
  }
  return cb(reporter);
};
