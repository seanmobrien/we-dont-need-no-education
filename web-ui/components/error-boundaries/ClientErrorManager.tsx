'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';

/**
 * Configuration for error suppression patterns
 */
export interface ErrorSuppressionRule {
  /** Unique identifier for this rule */
  id: string;
  /** Pattern to match against error messages (string contains or regex) */
  pattern: string | RegExp;
  /** Optional: match against error source/filename */
  source?: string | RegExp;
  /** Whether to completely suppress (no logging) or just prevent UI display */
  suppressCompletely?: boolean;
  /** Description of why this error is suppressed */
  reason?: string;
}

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
 * Default suppression rules for common known issues
 */
const DEFAULT_SUPPRESSION_RULES: ErrorSuppressionRule[] = [
  {
    id: 'ai-content-blob-error',
    pattern: /AI \(Internal\): 102 message:"Invalid content blob\.\s*Missing required attributes \(id, contentName/i,
    suppressCompletely: true,
    reason: 'Known AI service issue that does not affect functionality',
  },
  {
    id: 'script-load-errors',
    pattern: /Loading chunk \d+ failed/i,
    source: /chunk/i,
    suppressCompletely: false,
    reason: 'Chunk loading failures should be logged but not displayed',
  },
  {
    id: 'extension-errors',
    pattern: /extension|chrome-extension|moz-extension/i,
    suppressCompletely: true,
    reason: 'Browser extension errors not related to our application',
  },
];

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

/**
 * ClientErrorManager component that catches errors outside of React's render cycle
 * and surfaces them to the nearest error boundary while allowing suppression of known issues.
 */
export function ClientErrorManager({
  suppressionRules = DEFAULT_SUPPRESSION_RULES,
  surfaceToErrorBoundary = true,
  reportSuppressedErrors = false,
  debounceMs = 1000,
}: ClientErrorManagerConfig = {}) {
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const lastErrorTime = useRef<Map<string, number>>(new Map());
  const isInitialized = useRef(false);

  /**
   * Check if an error should be suppressed based on configured rules
   */
  const shouldSuppressError = useCallback((
    error: Error | string,
    source?: string,
    lineno?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    colno?: number   // eslint-disable-line @typescript-eslint/no-unused-vars
  ): { suppress: boolean; rule?: ErrorSuppressionRule; completely?: boolean } => {
    const errorMessage = typeof error === 'string' ? error : error.message;
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

  /**
   * Check if this error should be debounced (duplicate within time window)
   */
  const shouldDebounce = useCallback((errorKey: string): boolean => {
    const now = Date.now();
    const lastTime = lastErrorTime.current.get(errorKey);
    
    if (lastTime && (now - lastTime) < debounceMs) {
      return true;
    }
    
    lastErrorTime.current.set(errorKey, now);
    return false;
  }, [debounceMs]);

  /**
   * Handle global JavaScript errors
   */
  const handleGlobalError = useCallback((event: ErrorEvent) => {
    // Safely extract properties from event
    const error = event.error;
    const message = event.message || 'Unknown error';
    const filename = event.filename || 'unknown';
    const lineno = event.lineno || 0;
    const colno = event.colno || 0;
    
    let errorObj: Error;
    if (error instanceof Error) {
      errorObj = error;
    } else {
      // Create error object manually to avoid Error constructor issues in tests
      errorObj = {
        name: 'Error',
        message: message || 'Unknown error',
        stack: undefined,
        toString: () => message || 'Unknown error',
      } as Error;
    }
    
    // Create unique key for debouncing
    const errorKey = normalizeDebounceKey(`${message}-${filename}-${lineno}`);
    
    if (shouldDebounce(errorKey)) {
      return;
    }

    const suppressionResult = shouldSuppressError(errorObj, filename, lineno, colno);
    
    if (suppressionResult.suppress) {
      // Prevent default browser error handling for suppressed errors
      event.preventDefault();
      
      if (suppressionResult.completely) {
        // Don't even log completely suppressed errors
        return;
      }
      
      // Log suppressed errors with low severity if configured
      if (reportSuppressedErrors) {
        errorReporter.reportError(errorObj, ErrorSeverity.LOW, {
          source: filename,
          breadcrumbs: ['global-error-suppressed'],
          additionalData: {
            suppression_rule: suppressionResult.rule?.id,
            suppression_reason: suppressionResult.rule?.reason,
            lineno,
            colno,
          },
        });
      }
      return;
    }

    // Report non-suppressed errors
    errorReporter.reportError(errorObj, ErrorSeverity.HIGH, {
      source: filename,
      breadcrumbs: ['global-error-handler'],
      additionalData: { lineno, colno, type: 'javascript-error' },
    });

    // Surface to React error boundary if configured
    if (surfaceToErrorBoundary) {
      setErrorToThrow(errorObj);
    }
  }, [surfaceToErrorBoundary, reportSuppressedErrors, shouldSuppressError, shouldDebounce]);

  /**
   * Handle unhandled promise rejections
   */
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    let error: Error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else {
      // Create error object manually to avoid Error constructor issues in tests
      const reasonString = typeof event.reason === 'object' && event.reason !== null && 'message' in event.reason 
        ? (event.reason as { message: string }).message 
        : String(event.reason);
      error = {
        name: 'Error',
        message: reasonString,
        stack: undefined,
        toString: () => reasonString,
      } as Error;
    }
    
    const errorKey = normalizeDebounceKey(`promise-${error.message}`);
    
    if (shouldDebounce(errorKey)) {
      return;
    }

    const suppressionResult = shouldSuppressError(error);
    
    if (suppressionResult.suppress) {
      // Prevent default browser handling for suppressed promise rejections
      event.preventDefault();
      
      if (suppressionResult.completely) {
        return;
      }
      
      if (reportSuppressedErrors) {
        errorReporter.reportError(error, ErrorSeverity.LOW, {
          breadcrumbs: ['unhandled-rejection-suppressed'],
          additionalData: {
            suppression_rule: suppressionResult.rule?.id,
            suppression_reason: suppressionResult.rule?.reason,
            promise_rejection: true,
          },
        });
      }
      return;
    }

    // Report non-suppressed promise rejections
    errorReporter.reportError(error, ErrorSeverity.HIGH, {
      breadcrumbs: ['unhandled-rejection'],
      additionalData: { type: 'promise-rejection' },
    });

    // Surface to React error boundary if configured
    if (surfaceToErrorBoundary) {
      setErrorToThrow(error);
    }
  }, [surfaceToErrorBoundary, reportSuppressedErrors, shouldSuppressError, shouldDebounce]);

  // Set up global error listeners
  useEffect(() => {
    if (isInitialized.current) return;
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    isInitialized.current = true;

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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
}

/**
 * Utility function to create custom suppression rules
 */
export function createSuppressionRule(
  id: string,
  pattern: string | RegExp,
  options: Partial<Omit<ErrorSuppressionRule, 'id' | 'pattern'>> = {}
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
    console.debug('Added error suppression rules:', rules.map(r => r.id));
  }, [rules]);
}