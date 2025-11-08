'use client';

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  SetStateAction,
  Dispatch,
} from 'react';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';
import {
  asErrorLike,
  ErrorLike,
  isErrorLike,
  StringOrErrorLike,
} from '@/lib/react-util/errors/error-like';
import { DEFAULT_SUPPRESSION_RULES } from '@/lib/error-monitoring/default-suppression-rules';
import { shouldSuppressError } from '@/lib/error-monitoring/utility';
import type { ErrorSuppressionRule } from '@/lib/error-monitoring/types';

/**
 * Configuration for ClientErrorManager
 */
export interface ClientErrorManagerConfig {
  /** Array of error suppression rules */
  suppressionRules?: ErrorSuppressionRule[];
  /** Whether to surface non-suppressed errors to React error boundaries */
  surfaceToErrorBoundary?: boolean;
  /** Whether to report suppressed errors (with low severity) */
  reportSuppressedErrors?: boolean;
  /** Debounce time for duplicate errors (ms) */
  debounceMs?: number;
}

/**
 * Normalize error messages by removing repeating 'Uncaught ' prefixes
 * Example: 'Uncaught Uncaught Uncaught [object] test Uncaught' -> '[object] test Uncaught'
 */
const normalizeErrorMessage = (message: string): string => {
  // Remove repeating 'Uncaught ' at the beginning of the string
  return message.replace(/^(?:Uncaught\s+)+/g, '');
};

const normalizeDebounceKey = (key: string) => {
  // Normalize the key by removing repeating 'Uncaught ' prefixes
  return normalizeErrorMessage(key).toLowerCase().trim();
};

class LastErrorMap {
  #lastErrorTime: Map<string, number>;
  #lastErrorKeys: Map<string, Array<string>>;

  constructor() {
    this.#lastErrorTime = new Map();
    this.#lastErrorKeys = new Map();
  }
  lastErrorAt(
    error: StringOrErrorLike,
    allowLooseMatch = true,
  ): number | undefined {
    const errorKey = LastErrorMap.makeErrorKey(error);
    let ret = this.#lastErrorTime.get(errorKey);
    if (ret === undefined && allowLooseMatch) {
      // Try to find a loose match if exact key not found
      for (const [key, time] of this.#lastErrorTime.entries()) {
        if (time > (ret ?? 0) && key.includes(errorKey)) {
          ret = time;
          continue;
        }
      }
    }
    return ret;
  }

  add(error: StringOrErrorLike, now: number): void {
    const errorKey = LastErrorMap.makeErrorKey(error);
    this.#lastErrorTime.set(errorKey, now);
    const messagePart = errorKey.split(LastErrorMap.KeyDelimiter)[0];
    const errorKeys = this.#lastErrorKeys.get(messagePart) || [];
    if (!errorKeys.includes(errorKey)) {
      errorKeys.push(errorKey);
      this.#lastErrorKeys.set(messagePart, errorKeys);
    }
  }
  /**
   * Check if this error should be debounced (duplicate within time window)
   */
  shouldDebounce(error: StringOrErrorLike, debounceMs: number): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorAt(error);
    this.add(error, now);
    return !!lastTime && now - lastTime < debounceMs;
  }

  static makeErrorKey(
    error: StringOrErrorLike,
    filename?: string,
    [line = 0, column = 0]: [number, number] = [0, 0],
  ): string {
    let errorMessage: string;
    let errorSource: string;
    if (isErrorLike(error)) {
      // TODO: if line/column is empty we could theoretically try to pull it out of the stack
      errorMessage = error.message;
      errorSource = filename ?? error.stack ?? '';
    } else {
      errorMessage = error;
      errorSource = filename ?? '';
    }
    const theColumn = column > 0 ? `-${column}` : '';
    const lineAndColumn = line > 0 ? String(line) + theColumn : theColumn;
    return normalizeDebounceKey(
      normalizeErrorMessage(errorMessage) +
        LastErrorMap.KeyDelimiter +
        errorSource +
        LastErrorMap.KeyDelimiter +
        lineAndColumn,
    );
  }

  static readonly KeyDelimiter = '~~-~~';
}

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
  // Should the error be debounced?
  if (lastErrorMap.shouldDebounce(errorObj, debounceMs)) {
    return false;
  }
  // Should the error be suppressed?
  const suppressionResult = shouldSuppressError({
    error: errorObj,
    suppressionRules,
  });
  // Process a suppressed result
  if (suppressionResult.suppress) {
    // Log suppressed errors with low severity if configured
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
  // Report non-suppressed errors
  errorReporter.reportError(errorObj, ErrorSeverity.HIGH, {
    source: errorObj.source,
    breadcrumbs: ['global-error-handler'],
    additionalData: {
      type: 'javascript-error',
      lineno: errorObj.line,
      colno: errorObj.column,
    },
  });
  // If we are surfacing to a parent boundary then we don't want to log (avoid duplicate logs)
  if (surfaceToErrorBoundary) {
    // Surface to React error boundary if configured
    setErrorToThrow(errorObj);
  }
  return true;
};

/**
 * ClientErrorManager component that catches errors outside of React's render cycle
 * and surfaces them to the nearest error boundary while allowing suppression of known issues.
 */
export const ClientErrorManager = ({
  suppressionRules = DEFAULT_SUPPRESSION_RULES,
  surfaceToErrorBoundary = true,
  reportSuppressedErrors = false,
  debounceMs = 1000,
}: ClientErrorManagerConfig = {}) => {
  const [errorToThrow, setErrorToThrow] = useState<ErrorLike | null>(null);
  const lastErrorMap = useRef<LastErrorMap>(new LastErrorMap());
  const isInitialized = useRef(false);

  /**
   * Check if an error should be suppressed based on configured rules
  
  const shouldSuppressError = useCallback((
    error: ErrorLike | string,
    source?: string,
    lineno?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    colno?: number   // eslint-disable-line @typescript-eslint/no-unused-vars
  ): { suppress: boolean; rule?: ErrorSuppressionRule; completely?: boolean } => {
    const likeError = asErrorLike(error)!;
    const errorMessage = likeError.message;
    const errorSource = source || '';

    for (const rule of suppressionRules) {
      // Check message pattern
      const messageMatches = typeof rule.pattern === 'string'
        ? errorMessage.includes(rule.pattern)
        : rule.pattern.test(errorMessage);

      if (!messageMatches) continue;

      // Check source pattern if specified
      if (rule.source) {
        const sourceMatches = typeof rule.source === 'string'
          ? errorSource.includes(rule.source)
          : rule.source.test(errorSource);
        
        if (!sourceMatches) continue;
      }

      return {
        suppress: true,
        rule,
        completely: rule.suppressCompletely,
      };
    }

    return { suppress: false };
  }, [suppressionRules]);
 */

  /**
   * Handle global JavaScript errors
   */
  const handleGlobalError = useCallback(
    (event: ErrorEvent) => {
      // Safely extract properties from event
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
          // Error was suppressed
          event.preventDefault();
        }
      }
    },
    [
      debounceMs,
      suppressionRules,
      surfaceToErrorBoundary,
      reportSuppressedErrors,
    ],
  );

  /**
   * Handle unhandled promise rejections
   */
  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent) => {
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
    },
    [
      suppressionRules,
      reportSuppressedErrors,
      surfaceToErrorBoundary,
      debounceMs,
    ],
  );

  // Set up global error listeners
  useEffect(() => {
    if (isInitialized.current) return;

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    isInitialized.current = true;

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
      isInitialized.current = false;
    };
  }, [handleGlobalError, handleUnhandledRejection]);

  // Throw error in React's render cycle to trigger error boundary
  useEffect(() => {
    if (errorToThrow) {
      // Clear the error state first to prevent infinite loops
      setErrorToThrow(null);

      // Throw in next tick to ensure it's caught by error boundary
      setTimeout(() => {
        throw errorToThrow;
      }, 0);
    }
  }, [errorToThrow]);

  // This component renders nothing
  return null;
};

/**
 * Utility function to create custom suppression rules
 */
export function createSuppressionRule(
  id: string,
  pattern: string | RegExp,
  options: Partial<Omit<ErrorSuppressionRule, 'id' | 'pattern'>> = {},
): ErrorSuppressionRule {
  return {
    id,
    pattern,
    ...options,
  };
}

/**
 * Hook to add a suppression rule dynamically
 */
export function useErrorSuppression(rules: ErrorSuppressionRule[]) {
  useEffect(() => {
    // This would require a global error manager instance
    // For now, just log that rules were added
    console.debug(
      'Added error suppression rules:',
      rules.map((r) => r.id),
    );
  }, [rules]);
}
