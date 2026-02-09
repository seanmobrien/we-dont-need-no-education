import { errorLogFactory as standardErrorLogFactory, log, safeSerialize } from '@/lib/logger';
import { isAbortError, isError, isProgressEvent, } from './../../utility-methods';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
import { asKnownSeverityLevel } from '@/lib/logger/constants';
import { ProgressEventError } from '../progress-event-error';
import mitt from 'next/dist/shared/lib/mitt';
const brandLoggedError = Symbol.for('@no-education/LoggedError');
const INNER_ERROR = Symbol.for('@no-education/LoggedError::InnerError');
const CRITICAL = Symbol.for('@no-education/LoggedError::CriticalFlag');
export class LoggedError extends Error {
    static #errorReportEmitter = mitt();
    static subscribeToErrorReports(callback) {
        this.#errorReportEmitter.on('errorReported', callback);
    }
    static unsubscribeFromErrorReports(callback) {
        this.#errorReportEmitter.off('errorReported', callback);
    }
    static clearErrorReportSubscriptions() {
        this.#errorReportEmitter = mitt();
    }
    static isLoggedError(e) {
        return (e instanceof LoggedError ||
            (typeof e === 'object' &&
                !!e &&
                brandLoggedError in e &&
                e[brandLoggedError] === true));
    }
    static isTurtlesAllTheWayDownBaby(e, options) {
        const { log: logFromProps = false, relog = false, logCanceledOperation = false, source = 'Turtles, baby', message, critical, ...itsRecusionMan } = options ?? { log: false };
        let shouldLog = logFromProps;
        const isArgLoggedError = LoggedError.isLoggedError(e);
        const isArgError = !isArgLoggedError && isError(e);
        const isArgProgressEvent = !isArgLoggedError && !isArgError && isProgressEvent(e);
        if (typeof e === 'object' && e !== null &&
            (!(isArgLoggedError || isArgError || isArgProgressEvent))
            && 'error' in e
            && isError(e.error)) {
            const { error: theError, ...allTheRest } = e;
            return LoggedError.isTurtlesAllTheWayDownBaby(theError, {
                log: false,
                ...allTheRest,
                ...(options ?? {})
            });
        }
        if (shouldLog) {
            if (isArgLoggedError) {
                shouldLog = relog === true;
            }
            else if (isArgError) {
                if (!logCanceledOperation && isAbortError(e)) {
                    shouldLog = false;
                }
            }
            else {
                if (isArgProgressEvent) {
                    return LoggedError.isTurtlesAllTheWayDownBaby(new ProgressEventError(e), {
                        log: shouldLog,
                        relog,
                        logCanceledOperation,
                        source,
                        message,
                        critical,
                        ...itsRecusionMan,
                    });
                }
                log((l) => l.warn(`Some bonehead threw a not-error. Input: ${safeSerialize(e)}\nStack Trace: ${getStackTrace({ skip: 1, myCodeOnly: true })}`));
            }
        }
        let newLoggedError;
        if (isArgLoggedError) {
            newLoggedError = e;
        }
        else if (isArgError) {
            newLoggedError = new LoggedError(e, { critical });
        }
        else {
            newLoggedError = new LoggedError(new Error(String(e)), { critical });
        }
        if (shouldLog) {
            newLoggedError.writeToLog({
                source,
                message,
                ...itsRecusionMan,
            });
        }
        return newLoggedError;
    }
    writeToLog({ source, message, errorLogFactory = standardErrorLogFactory, ...itsRecusionMan }) {
        const logObject = errorLogFactory({
            error: this,
            include: itsRecusionMan,
            source,
            message,
        });
        LoggedError.#errorReportEmitter.emit('errorReported', {
            error: this,
            severity: asKnownSeverityLevel(logObject.severity),
            context: {
                stack: getStackTrace({ skip: 2 }),
                ...{
                    ...logObject,
                    error: undefined,
                    source,
                    message,
                },
            },
        });
    }
    static buildMessage(options) {
        if (!options) {
            return 'null or undefined error';
        }
        if (isError(options)) {
            return options.message;
        }
        if (typeof options === 'object' && options !== null) {
            if ('error' in options && isError(options.error)) {
                return options.error.message;
            }
            const serialized = safeSerialize(options).trim();
            if (serialized.length) {
                return `Error: ${serialized}`;
            }
            return safeSerialize(options.toString(), 7000);
        }
        return safeSerialize(options, 7000);
    }
    get [Symbol.toStringTag]() {
        const getWithFallback = (propName) => {
            const valueWithFallback = (propName in this
                ? this[propName]
                : undefined) ??
                (this[INNER_ERROR] && propName in this[INNER_ERROR]
                    ? this[INNER_ERROR][propName]
                    : undefined) ??
                undefined;
            return valueWithFallback ? String(valueWithFallback) : undefined;
        };
        const _fingerprintValue = getWithFallback('fingerprint');
        const _sourceValue = getWithFallback('source');
        return `LoggedError${_fingerprintValue ? ` (Fingerprint: ${_fingerprintValue}) ` : ''}${_sourceValue ? ` [Source: ${_sourceValue}] ` : ''}: ${this[CRITICAL] ? 'CRITICAL - ' : ''}${LoggedError.buildMessage(this)}`;
    }
    constructor(message, options) {
        super();
        let ops;
        if (typeof message === 'string') {
            if (options) {
                if (isError(options)) {
                    ops = { error: options, critical: true };
                }
                else if (options.error) {
                    ops = options;
                }
                else {
                    throw new TypeError("LoggedError requires an 'error' property");
                }
            }
            else {
                ops = { error: new Error(message), critical: true };
            }
        }
        else {
            ops = isError(message) ? { error: message, critical: true } : message;
        }
        this[INNER_ERROR] = ops.error;
        this[CRITICAL] = ops.critical ?? true;
        if (!this[INNER_ERROR]) {
            throw new TypeError("LoggedError requires an 'error' property");
        }
        Object.entries(this[INNER_ERROR]).forEach(([key, value]) => {
            if (!(key in this) && typeof value !== 'function') {
                if (typeof key === 'string' || typeof key === 'symbol') {
                    this[key] = value;
                }
            }
        });
        if (isError(this[INNER_ERROR].cause) &&
            this[INNER_ERROR].cause.name === 'PostgresError') {
            Object.entries(this[INNER_ERROR]).forEach(([key, value]) => {
                if (!(key in this) && !!value && typeof value !== 'function') {
                    if (typeof key === 'string' || typeof key === 'symbol') {
                        if (!this[key]) {
                            this[key] = value;
                        }
                    }
                }
            });
        }
        this[brandLoggedError] = true;
    }
    [CRITICAL] = true;
    [INNER_ERROR];
    [brandLoggedError] = true;
    get error() {
        return this[INNER_ERROR];
    }
    get critical() {
        return this[CRITICAL];
    }
    get name() {
        const ret = this[INNER_ERROR]?.name;
        if (ret === 'Error' &&
            this[INNER_ERROR]?.cause &&
            isError(this[INNER_ERROR].cause) &&
            this[INNER_ERROR].cause.name === 'PostgresError') {
            return this[INNER_ERROR].cause.name;
        }
        return this[INNER_ERROR]?.name ?? 'Error';
    }
    get cause() {
        return this[INNER_ERROR].cause;
    }
    get stack() {
        return this[INNER_ERROR].stack ?? 'no stack trace available';
    }
    get message() {
        return this[INNER_ERROR]?.message ?? 'LoggedError: Missing logged error.';
    }
}
export const dumpError = (e) => {
    let ret = '';
    if (isError(e)) {
        ret = e.message ?? 'no message';
        if (e.cause) {
            ret += `\nCaused by: ${dumpError(e.cause)}`;
        }
    }
    else if (typeof e === 'object' && e !== null) {
        ret = safeSerialize(e, {
            maxObjectDepth: 5,
            propertyFilter: LoggedError.isLoggedError(e)
                ? (_key, propertyPath) => propertyPath !== 'cause.cause'
                : undefined,
        });
    }
    else {
        ret = safeSerialize(e);
    }
    return ret;
};
