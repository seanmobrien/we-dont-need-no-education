'use client';

export type { ClientErrorManagerConfig, ErrorSuppressionRule } from './types';

import { useEffect, useState, useRef, SetStateAction, Dispatch, useCallback } from 'react';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';
import { asErrorLike, ErrorLike } from '@/lib/react-util/errors/error-like';
import { ClientErrorManagerConfig, ErrorSuppressionRule } from './types';
import { LastErrorMap } from './last-error-map';
import { shouldSuppressError } from './utility';
import { DEFAULT_SUPPRESSION_RULES } from './default-suppression-rules';

const processError = ({
  errorObj,
  lastErrorMap,
  suppressionRules,
  reportSuppressedErrors,
  surfaceToErrorBoundary,
  debounceMs,
  setErrorToThrow,
}: {
  errorObj: ErrorLike;
  lastErrorMap: LastErrorMap;
  suppressionRules: ErrorSuppressionRule[];
  reportSuppressedErrors: boolean;
  surfaceToErrorBoundary: boolean;
  debounceMs: number;
  setErrorToThrow: Dispatch<SetStateAction<Error | null>>;
}): boolean => {
  if (lastErrorMap.shouldDebounce(errorObj, debounceMs)) {
    return false;
  }

  const suppressionResult = shouldSuppressError({
    error: errorObj,
    suppressionRules,
  });

  if (suppressionResult.suppress) {
    if (reportSuppressedErrors && !suppressionResult.completely) {
      errorReporter.reportError(errorObj, ErrorSeverity.LOW, {
        source: errorObj.source,
        breadcrumbs: ['global-error-suppressed'],
        additionalData: {
          suppression_rule: suppressionResult.rule?.id,
          suppression_reason: suppressionResult.rule?.reason,
          lineno: errorObj.line,
          colno: errorObj.column,
        },
      });
    }
    return false;
  }

  errorReporter.reportError(errorObj, ErrorSeverity.HIGH, {
    source: errorObj.source,
    breadcrumbs: ['global-error-handler'],
    additionalData: {
      type: 'javascript-error',
      lineno: errorObj.line,
      colno: errorObj.column,
    },
  });

  if (surfaceToErrorBoundary) {
    setErrorToThrow(errorObj);
  }
  return true;
};

export const ClientErrorManager = ({
  suppressionRules = DEFAULT_SUPPRESSION_RULES,
  surfaceToErrorBoundary = true,
  reportSuppressedErrors = false,
  debounceMs = 1000,
}: ClientErrorManagerConfig = {}) => {
  const [errorToThrow, setErrorToThrow] = useState<ErrorLike | null>(null);
  const lastErrorMap = useRef<LastErrorMap>(new LastErrorMap());
  const isInitialized = useRef(false);

  const shouldSuppressErrorLocal = useCallback(
    (
      error: ErrorLike | string,
      source?: string,
      lineno?: number,
      colno?: number,
    ): { suppress: boolean; rule?: ErrorSuppressionRule; completely?: boolean } => {
      const likeError = asErrorLike(error)!;
      const errorMessage = likeError.message;
      const errorSource = source || '';

      for (const rule of suppressionRules) {
        const messageMatches =
          typeof rule.pattern === 'string' ? errorMessage.includes(rule.pattern) : rule.pattern.test(errorMessage);

        if (!messageMatches) continue;

        if (rule.source) {
          const sourceMatches = typeof rule.source === 'string' ? errorSource.includes(rule.source) : rule.source.test(errorSource);
          if (!sourceMatches) continue;
        }

        return {
          suppress: true,
          rule,
          completely: rule.suppressCompletely,
        };
      }

      return { suppress: false };
    },
    [suppressionRules],
  );

  useEffect(() => {
    if (isInitialized.current) return;
    const handleGlobalError = (event: ErrorEvent) => {
      const errorObj = asErrorLike(event.error ? event.error : event.message, {
        filename: event.filename || 'unknown',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
      });
      if (errorObj) {
        if (
          !processError({
            errorObj,
            lastErrorMap: lastErrorMap.current,
            suppressionRules,
            reportSuppressedErrors,
            surfaceToErrorBoundary,
            debounceMs,
            setErrorToThrow,
          })
        ) {
          event.preventDefault();
        }
      }
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
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
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    isInitialized.current = true;

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      isInitialized.current = false;
    };
  }, [debounceMs, suppressionRules, surfaceToErrorBoundary, reportSuppressedErrors]);

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

export function createSuppressionRule(id: string, pattern: string | RegExp, options: Partial<Omit<ErrorSuppressionRule, 'id' | 'pattern'>> = {}): ErrorSuppressionRule {
  return {
    id,
    pattern,
    ...options,
  };
}

export function useErrorSuppression(rules: ErrorSuppressionRule[]) {
  useEffect(() => {
    console.debug('Added error suppression rules:', rules.map((r) => r.id));
  }, [rules]);
}
