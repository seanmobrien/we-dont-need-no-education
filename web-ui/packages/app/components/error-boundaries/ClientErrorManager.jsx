'use client';
import { useEffect, useState, useRef, useCallback, } from 'react';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';
import { asErrorLike, isErrorLike, } from '@/lib/react-util/errors/error-like';
import { DEFAULT_SUPPRESSION_RULES } from '@/lib/error-monitoring/default-suppression-rules';
import { shouldSuppressError } from '@/lib/error-monitoring/utility';
const normalizeErrorMessage = (message) => {
    return message.replace(/^(?:Uncaught\s+)+/g, '');
};
const normalizeDebounceKey = (key) => {
    return normalizeErrorMessage(key).toLowerCase().trim();
};
class LastErrorMap {
    #lastErrorTime;
    #lastErrorKeys;
    constructor() {
        this.#lastErrorTime = new Map();
        this.#lastErrorKeys = new Map();
    }
    lastErrorAt(error, allowLooseMatch = true) {
        const errorKey = LastErrorMap.makeErrorKey(error);
        let ret = this.#lastErrorTime.get(errorKey);
        if (ret === undefined && allowLooseMatch) {
            for (const [key, time] of this.#lastErrorTime.entries()) {
                if (time > (ret ?? 0) && key.includes(errorKey)) {
                    ret = time;
                    continue;
                }
            }
        }
        return ret;
    }
    add(error, now) {
        const errorKey = LastErrorMap.makeErrorKey(error);
        this.#lastErrorTime.set(errorKey, now);
        const messagePart = errorKey.split(LastErrorMap.KeyDelimiter)[0];
        const errorKeys = this.#lastErrorKeys.get(messagePart) || [];
        if (!errorKeys.includes(errorKey)) {
            errorKeys.push(errorKey);
            this.#lastErrorKeys.set(messagePart, errorKeys);
        }
    }
    shouldDebounce(error, debounceMs) {
        const now = Date.now();
        const lastTime = this.lastErrorAt(error);
        this.add(error, now);
        return !!lastTime && now - lastTime < debounceMs;
    }
    static makeErrorKey(error, filename, [line = 0, column = 0] = [0, 0]) {
        let errorMessage;
        let errorSource;
        if (isErrorLike(error)) {
            errorMessage = error.message;
            errorSource = filename ?? error.stack ?? '';
        }
        else {
            errorMessage = error;
            errorSource = filename ?? '';
        }
        const theColumn = column > 0 ? `-${column}` : '';
        const lineAndColumn = line > 0 ? String(line) + theColumn : theColumn;
        return normalizeDebounceKey(normalizeErrorMessage(errorMessage) +
            LastErrorMap.KeyDelimiter +
            errorSource +
            LastErrorMap.KeyDelimiter +
            lineAndColumn);
    }
    static KeyDelimiter = '~~-~~';
}
const processError = ({ errorObj, lastErrorMap, suppressionRules, reportSuppressedErrors, surfaceToErrorBoundary, debounceMs, setErrorToThrow, }) => {
    if (lastErrorMap.shouldDebounce(errorObj, debounceMs)) {
        return false;
    }
    const suppressionResult = shouldSuppressError({
        error: errorObj,
        suppressionRules,
    });
    if (suppressionResult.suppress) {
        if (reportSuppressedErrors && !suppressionResult.completely) {
            errorReporter((r) => r.reportError(errorObj, ErrorSeverity.LOW, {
                source: errorObj.source,
                breadcrumbs: ['global-error-suppressed'],
                additionalData: {
                    suppression_rule: suppressionResult.rule?.id,
                    suppression_reason: suppressionResult.rule?.reason,
                    lineno: errorObj.line,
                    colno: errorObj.column,
                },
            }));
        }
        return false;
    }
    errorReporter((r) => r.reportError(errorObj, ErrorSeverity.HIGH, {
        source: errorObj.source,
        breadcrumbs: ['global-error-handler'],
        additionalData: {
            type: 'javascript-error',
            lineno: errorObj.line,
            colno: errorObj.column,
        },
    }));
    if (surfaceToErrorBoundary) {
        setErrorToThrow(errorObj);
    }
    return true;
};
export const ClientErrorManager = ({ suppressionRules = DEFAULT_SUPPRESSION_RULES, surfaceToErrorBoundary = true, reportSuppressedErrors = false, debounceMs = 1000, } = {}) => {
    const [errorToThrow, setErrorToThrow] = useState(null);
    const lastErrorMap = useRef(new LastErrorMap());
    const isInitialized = useRef(false);
    const handleGlobalError = useCallback((event) => {
        const errorObj = asErrorLike(event.error ? event.error : event.message, {
            filename: event.filename || 'unknown',
            lineno: event.lineno || 0,
            colno: event.colno || 0,
        });
        if (errorObj) {
            if (!processError({
                errorObj,
                lastErrorMap: lastErrorMap.current,
                suppressionRules,
                reportSuppressedErrors,
                surfaceToErrorBoundary,
                debounceMs,
                setErrorToThrow,
            })) {
                event.preventDefault();
            }
        }
    }, [
        debounceMs,
        suppressionRules,
        surfaceToErrorBoundary,
        reportSuppressedErrors,
    ]);
    const handleUnhandledRejection = useCallback((event) => {
        const error = asErrorLike(event.reason);
        if (error) {
            processError({
                errorObj: error,
                lastErrorMap: lastErrorMap.current,
                suppressionRules,
                setErrorToThrow,
                reportSuppressedErrors,
                surfaceToErrorBoundary,
                debounceMs,
            });
        }
    }, [
        suppressionRules,
        reportSuppressedErrors,
        surfaceToErrorBoundary,
        debounceMs,
    ]);
    useEffect(() => {
        if (isInitialized.current)
            return;
        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        isInitialized.current = true;
        return () => {
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            isInitialized.current = false;
        };
    }, [handleGlobalError, handleUnhandledRejection]);
    useEffect(() => {
        if (errorToThrow) {
            setErrorToThrow(null);
            setTimeout(() => {
                throw errorToThrow;
            }, 0);
        }
    }, [errorToThrow]);
    return null;
};
export function createSuppressionRule(id, pattern, options = {}) {
    return {
        id,
        pattern,
        ...options,
    };
}
export function useErrorSuppression(rules) {
    useEffect(() => {
        console.debug('Added error suppression rules:', rules.map((r) => r.id));
    }, [rules]);
}
//# sourceMappingURL=ClientErrorManager.jsx.map