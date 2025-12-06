import { useMemo } from 'react';
import {
  errorReporter,
  ErrorSeverity,
  type ErrorContext,
} from './error-reporter';
import { log } from '@/lib/logger/core';

export const useErrorReporter = () => {
  const reporter = errorReporter();
  return useMemo(() => {
    const reportError = (
      error: Error | unknown,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      additionalContext: Partial<ErrorContext> = {},
    ) => {
      try {
        return reporter.reportError(error, severity, {
          ...additionalContext,
          breadcrumbs: [
            'component-error',
            ...(additionalContext.breadcrumbs || []),
          ],
        });
      } catch (reportingError) {
        // Silently handle reporting errors to avoid affecting the component
        log((l) => l.error('Error reporting failed:', reportingError));
      }
    };
    const reportAsyncError = async (
      error: Error | unknown,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      additionalContext: Partial<ErrorContext> = {},
    ) => {
      try {
        await reporter.reportError(error, severity, {
          ...additionalContext,
          breadcrumbs: [
            'async-component-error',
            ...(additionalContext.breadcrumbs || []),
          ],
        });
      } catch (reportingError) {
        // Silently handle reporting errors to avoid affecting the component
        log((l) => l.error('Error reporting failed:', reportingError));
      }
    };

    const reportUserAction = (
      error: Error | unknown,
      action: string,
      severity: ErrorSeverity = ErrorSeverity.LOW,
    ) => {
      try {
        reporter.reportError(error, severity, {
          breadcrumbs: ['user-action', action],
          additionalData: { userAction: action },
        });
      } catch (reportingError) {
        log((l) => l.error('Error reporting failed:', reportingError));
      }
    };

    const reportApiError = (
      error: Error | unknown,
      endpoint: string,
      method: string = 'GET',
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    ) => {
      try {
        reporter.reportError(error, severity, {
          breadcrumbs: ['api-error', method.toUpperCase(), endpoint],
          additionalData: {
            endpoint,
            method: method.toUpperCase(),
            errorType: 'api',
          },
        });
      } catch (reportingError) {
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
