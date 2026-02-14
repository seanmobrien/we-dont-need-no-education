import { isError, LoggedError, log, safeSerialize } from '@compliance-theater/logger';
import { ErrorSeverity, } from './types';
import { isRunningOnEdge } from '@compliance-theater/env';
import { isDrizzleError, errorFromCode } from '@compliance-theater/logger/errors/postgres-error';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { shouldSuppressError } from './utility';
import { LRUCache } from 'lru-cache';
import { StrategyCollectionFactory } from './strategies/strategy-collection-factory';
import { CircuitBreaker } from './circuit-breaker';
export { ErrorSeverity };
const asEnvironment = (input) => {
    return ['development', 'staging', 'production'].includes(input)
        ? input
        : 'development';
};
const isErrorReport = (check) => typeof check === 'object' &&
    check !== null &&
    'error' in check &&
    isError(check.error) &&
    'context' in check &&
    check.context !== null &&
    'severity' in check &&
    check.severity !== null &&
    check.severity !== undefined;
const defaultConfig = {
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
const isContextEnricher = (check) => typeof check === 'object' &&
    check !== null &&
    'enrichContext' in check &&
    typeof check.enrichContext === 'function';
const ERROR_REPORTER_SINGLETON_KEY = '@noeducation/error-monitoring:ErrorReporter';
export class ErrorReporter {
    #errorReportHandler;
    config;
    debounceCache;
    circuitBreaker = null;
    #globalEventHandlers = {};
    constructor(config) {
        this.config = config;
        const debounceIntervalMs = config.debounce?.debounceIntervalMs ?? 240000;
        this.debounceCache = new LRUCache({
            max: 500,
            ttl: debounceIntervalMs,
        });
        if (config.triggerMax && config.triggerTtl) {
            this.circuitBreaker = new CircuitBreaker({
                triggerMax: config.triggerMax,
                triggerTtl: config.triggerTtl,
                switchMax: config.switchMax ?? 10,
                switchTtl: config.switchTtl ?? 60000,
                triggerTimeout: config.triggerTimeout ?? 30000,
            });
        }
        this.#errorReportHandler = (args) => {
            let severity;
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
            }
            catch (e) {
                console.error('Failed to report error', e);
            }
        };
    }
    static createInstance = (config) => new ErrorReporter({
        ...defaultConfig,
        ...config,
    });
    static getInstance = (config) => SingletonProvider.Instance.getRequired(ERROR_REPORTER_SINGLETON_KEY, () => ErrorReporter.createInstance(config ?? {}));
    shouldDebounce(report) {
        if (!report.fingerprint) {
            return false;
        }
        if (this.debounceCache.has(report.fingerprint)) {
            return true;
        }
        this.debounceCache.set(report.fingerprint, Date.now());
        return false;
    }
    async createErrorReport(error, severity = ErrorSeverity.MEDIUM, context = {}) {
        let baseReport;
        let enrichedContext;
        try {
            if (isErrorReport(error)) {
                baseReport = error;
                if (!baseReport.error.message) {
                    baseReport.error = this.normalizeError(baseReport.error);
                }
            }
            else {
                const errorObj = this.normalizeError(error);
                baseReport = {
                    error: errorObj,
                    severity,
                    context: {},
                };
            }
            enrichedContext = await this.enrichContext({
                ...(baseReport.context ?? {}),
                ...context,
            });
            return {
                ...baseReport,
                fingerprint: this.generateFingerprint(baseReport.error, enrichedContext),
                context: enrichedContext,
                tags: {
                    ...(baseReport.tags ?? {}),
                    ...this.generateTags(baseReport.error, enrichedContext),
                },
            };
        }
        catch (reportBuilderError) {
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
            }
            else {
                baseReport = {
                    error: this.normalizeError(error),
                    severity,
                    context: enrichedContext,
                };
            }
            return {
                ...baseReport,
                fingerprint: this.generateFingerprint(baseReport.error, enrichedContext),
            };
        }
    }
    async reportError(error, severity = ErrorSeverity.MEDIUM, context = {}) {
        let result;
        let report;
        try {
            report = await this.createErrorReport(error, severity, context);
            if (!report) {
                throw new Error('Failed to create error report');
            }
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
            if (this.circuitBreaker && this.circuitBreaker.getState() !== 'closed') {
                Object.assign(result, {
                    suppress: true,
                    completely: true,
                    rule: 'circuit-breaker',
                });
            }
            else if (this.circuitBreaker) {
                if (!result.suppress) {
                    this.circuitBreaker.recordError();
                }
            }
            const strategies = StrategyCollectionFactory.createStrategies(this.config, result);
            for (const strategy of strategies) {
                try {
                    const strategyResult = await strategy.execute(report, this.config);
                    Object.assign(result, strategyResult);
                }
                catch (strategyError) {
                    log((l) => l.error('Error executing reporting strategy', {
                        cause: safeSerialize(error),
                        strategyError: safeSerialize(strategyError),
                    }));
                }
            }
        }
        catch (reportingError) {
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
    reportBoundaryError(error, errorInfo, severity = ErrorSeverity.HIGH) {
        return this.reportError(error, severity, {
            componentStack: errorInfo.componentStack,
            errorBoundary: errorInfo.errorBoundary,
            breadcrumbs: ['error-boundary-catch'],
        });
    }
    reportUnhandledRejection(reason, promise) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        return this.reportError(error, ErrorSeverity.HIGH, {
            breadcrumbs: ['unhandled-promise-rejection'],
            additionalData: { promiseString: promise.toString() },
        });
    }
    setupGlobalHandlers() {
        if (typeof window === 'undefined')
            return;
        if (isRunningOnEdge()) {
            log((l) => l.info('setupGlobalHandlers::edge'));
        }
        const eventHandlers = {
            error: (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.reportError(event.error || new Error(event.message), ErrorSeverity.HIGH, {
                    url: window.location.href,
                    breadcrumbs: ['global-error-handler'],
                    additionalData: {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                    },
                });
            },
            rejection: (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.reportUnhandledRejection(event.reason, event.promise);
            },
        };
        this.removeGlobalHandlers();
        window.addEventListener('error', eventHandlers.error);
        window.addEventListener('unhandledrejection', eventHandlers.rejection);
        this.#globalEventHandlers = eventHandlers;
    }
    removeGlobalHandlers() {
        if (typeof window === 'undefined')
            return;
        if (isRunningOnEdge()) {
            log((l) => l.info('removeGlobalHandlers::edge'));
        }
        if (this.#globalEventHandlers.error) {
            window.removeEventListener('error', this.#globalEventHandlers.error);
        }
        if (this.#globalEventHandlers.rejection) {
            window.removeEventListener('unhandledrejection', this.#globalEventHandlers.rejection);
        }
        this.#globalEventHandlers = {};
    }
    normalizeError(error) {
        let normalError;
        if (isError(error)) {
            normalError = error;
        }
        else {
            if (typeof error === 'string') {
                normalError = new Error(LoggedError.buildMessage(error));
            }
            else {
                normalError = !!error
                    ? new Error(`Non-error thrown: ${LoggedError.buildMessage(error)}`)
                    : new TypeError('Normalized null error');
            }
        }
        if (!normalError.message) {
            normalError.message = `Unknown error - No details provided [${LoggedError.buildMessage(normalError)}]`;
        }
        return normalError;
    }
    async enrichContext(context) {
        const enriched = {
            timestamp: new Date(),
            ...context,
        };
        if (typeof window !== 'undefined') {
            enriched.userAgent = navigator.userAgent;
            enriched.url = window.location.href;
        }
        try {
            const candidates = [];
            if (context && 'error' in context && context.error)
                candidates.push(context.error);
            const maybeErr = context.error;
            const maybeCause = maybeErr
                ?.cause ??
                maybeErr
                    ?.originalError;
            if (maybeCause)
                candidates.push(maybeCause);
            for (const c of candidates) {
                if (isDrizzleError(c)) {
                    const pg = c;
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
                        query: typeof pg.query === 'string'
                            ? pg.query.slice(0, 2000)
                            : undefined,
                        parameters: Array.isArray(pg.parameters)
                            ? pg.parameters.slice(0, 20)
                            : undefined,
                        causeName: pg.cause?.name ?? undefined,
                        originalErrorName: pg.originalError?.name ??
                            undefined,
                    };
                    enriched.dbError = dbFailure;
                    break;
                }
            }
        }
        catch (err) {
            log((l) => l.warn('Failed to extract DB failure info for error reporter', err));
        }
        if (isContextEnricher(enriched.error)) {
            try {
                const further = await enriched.error.enrichContext(enriched);
                if (further) {
                    Object.assign(enriched, further);
                }
            }
            catch (err) {
                log((l) => l.warn('Error in custom context enricher for error reporting', err));
            }
        }
        return enriched;
    }
    generateFingerprint(error, context) {
        const key = `${error.name}:${error.message}:${context.url || 'unknown'}`;
        return btoa(encodeURIComponent(key))
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 16);
    }
    subscribeToErrorReports() {
        try {
            this.unsubscribeFromErrorReports();
            LoggedError.subscribeToErrorReports(this.#errorReportHandler);
            this.setupGlobalHandlers();
        }
        catch (e) {
            this.reportError(e, ErrorSeverity.HIGH, {
                additionalData: {
                    message: 'Failed to subscribe to logged errors',
                },
            });
        }
    }
    unsubscribeFromErrorReports() {
        try {
            LoggedError.unsubscribeFromErrorReports(this.#errorReportHandler);
            this.removeGlobalHandlers();
        }
        catch (e) {
            this.reportError(e, ErrorSeverity.HIGH, {
                additionalData: {
                    message: 'Failed to unsubscribe from logged errors',
                },
            });
        }
    }
    generateTags(error, context) {
        return {
            environment: this.config.environment,
            errorType: error.name,
            url: context.url || 'unknown',
            userAgent: context.userAgent?.substring(0, 50) || 'unknown',
            errorBoundary: context.errorBoundary || 'none',
        };
    }
    getStoredErrors() {
        if (typeof window === 'undefined')
            return [];
        try {
            return JSON.parse(localStorage.getItem('error-reports') || '[]');
        }
        catch {
            return [];
        }
    }
    clearStoredErrors() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('error-reports');
        }
    }
}
export const errorReporter = (cb) => {
    const reporter = ErrorReporter.getInstance();
    if (typeof cb === 'undefined') {
        return reporter;
    }
    return cb(reporter);
};
//# sourceMappingURL=error-reporter.js.map