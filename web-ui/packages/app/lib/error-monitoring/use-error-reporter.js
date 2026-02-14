import { useMemo } from 'react';
import { errorReporter, ErrorSeverity, } from './error-reporter';
import { log } from '@compliance-theater/logger/core';
export const useErrorReporter = () => {
    const reporter = errorReporter();
    return useMemo(() => {
        const reportError = (error, severity = ErrorSeverity.MEDIUM, additionalContext = {}) => {
            try {
                return reporter.reportError(error, severity, {
                    ...additionalContext,
                    breadcrumbs: [
                        'component-error',
                        ...(additionalContext.breadcrumbs || []),
                    ],
                });
            }
            catch (reportingError) {
                log((l) => l.error('Error reporting failed:', reportingError));
            }
        };
        const reportAsyncError = async (error, severity = ErrorSeverity.MEDIUM, additionalContext = {}) => {
            try {
                await reporter.reportError(error, severity, {
                    ...additionalContext,
                    breadcrumbs: [
                        'async-component-error',
                        ...(additionalContext.breadcrumbs || []),
                    ],
                });
            }
            catch (reportingError) {
                log((l) => l.error('Error reporting failed:', reportingError));
            }
        };
        const reportUserAction = (error, action, severity = ErrorSeverity.LOW) => {
            try {
                reporter.reportError(error, severity, {
                    breadcrumbs: ['user-action', action],
                    additionalData: { userAction: action },
                });
            }
            catch (reportingError) {
                log((l) => l.error('Error reporting failed:', reportingError));
            }
        };
        const reportApiError = (error, endpoint, method = 'GET', severity = ErrorSeverity.MEDIUM) => {
            try {
                reporter.reportError(error, severity, {
                    breadcrumbs: ['api-error', method.toUpperCase(), endpoint],
                    additionalData: {
                        endpoint,
                        method: method.toUpperCase(),
                        errorType: 'api',
                    },
                });
            }
            catch (reportingError) {
                log((l) => l.error('Error reporting failed:', reportingError));
            }
        };
        return {
            reportError,
            reportAsyncError,
            reportUserAction,
            reportApiError,
        };
    }, [reporter]);
};
//# sourceMappingURL=use-error-reporter.js.map