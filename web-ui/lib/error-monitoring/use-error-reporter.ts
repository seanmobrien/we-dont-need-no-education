import { useCallback } from 'react';
import { errorReporter, ErrorSeverity, type ErrorContext } from './error-reporter';

/**
 * React hook for error reporting within components
 * Provides a convenient way to report errors with component context
 */
export function useErrorReporter() {
  const reportError = useCallback(
    (
      error: Error | unknown,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      additionalContext: Partial<ErrorContext> = {}
    ) => {
      try {
        errorReporter.reportError(error, severity, {
          ...additionalContext,
          breadcrumbs: ['component-error', ...(additionalContext.breadcrumbs || [])],
        });
      } catch (reportingError) {
        // Silently handle reporting errors to avoid affecting the component
        console.error('Error reporting failed:', reportingError);
      }
    },
    []
  );

  const reportAsyncError = useCallback(
    async (
      error: Error | unknown,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      additionalContext: Partial<ErrorContext> = {}
    ) => {
      try {
        await errorReporter.reportError(error, severity, {
          ...additionalContext,
          breadcrumbs: ['async-component-error', ...(additionalContext.breadcrumbs || [])],
        });
      } catch (reportingError) {
        // Silently handle reporting errors to avoid affecting the component
        console.error('Error reporting failed:', reportingError);
      }
    },
    []
  );

  const reportUserAction = useCallback(
    (
      error: Error | unknown,
      action: string,
      severity: ErrorSeverity = ErrorSeverity.LOW
    ) => {
      try {
        errorReporter.reportError(error, severity, {
          breadcrumbs: ['user-action', action],
          additionalData: { userAction: action },
        });
      } catch (reportingError) {
        console.error('Error reporting failed:', reportingError);
      }
    },
    []
  );

  const reportApiError = useCallback(
    (
      error: Error | unknown,
      endpoint: string,
      method: string = 'GET',
      severity: ErrorSeverity = ErrorSeverity.MEDIUM
    ) => {
      try {
        errorReporter.reportError(error, severity, {
          breadcrumbs: ['api-error', method.toUpperCase(), endpoint],
          additionalData: { 
            endpoint, 
            method: method.toUpperCase(),
            errorType: 'api'
          },
        });
      } catch (reportingError) {
        console.error('Error reporting failed:', reportingError);
      }
    },
    []
  );

  return {
    reportError,
    reportAsyncError,
    reportUserAction,
    reportApiError,
  };
}