'use client';
import { ErrorBoundary, type FallbackProps, type ErrorBoundaryProps } from 'react-error-boundary';
import { type ErrorInfo, type PropsWithChildren, type ReactNode, useCallback } from 'react';
import { RenderErrorBoundaryFallback } from './render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
import { safeSerialize } from '@compliance-theater/logger';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring/error-reporter';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

export const DefaultErrorFallbackRender = ({
  error,
  resetErrorBoundary, 
}: FallbackProps): ReactNode => {
  const resetAction = useCallback((...args: unknown[]) => {
    try {
      resetErrorBoundary(...args);
    }catch(e) {
      // swallow any errors from reset to avoid infinite loops
      console.warn('WARN: Error during reset of error boundary: ', safeSerialize(e));
    }    
  }, [resetErrorBoundary]);

  const normalizedError = error instanceof Error
    ? error
    : error
      ? typeof error === 'string'
        ? new Error(error)
        : new Error('Unknown error occurred - see cause for details.', {
            cause: safeSerialize(error),
        })
      : null;
  // Apply standard suppression and processing to the error
  const { processedError } = useProcessedError({
    error: normalizedError,
    resetAction,
  });
  // If it still exists, render the fallback UI
  return processedError 
    ? (
      <RenderErrorBoundaryFallback
        error={processedError}
        resetErrorBoundaryAction={resetAction}
        />
    )
    : (<></>);  
};

type DefaultErrorBoundaryProps = PropsWithChildren<Omit<ErrorBoundaryProps, 'fallback' | 'FallbackComponent' | 'resetErrorBoundary'>>
 & {
  /**
   * When explicitly false, errors caught by this boundary will be re-thrown to parent boundaries. 
   * Defaults to true.
   */
  isolate?: boolean;
  /**
   * Optional source string to identify this boundary in error reports.
   * Used for logging and debugging purposes.
   */
  source?: string;
};

export const DefaultErrorBoundary = ({ 
  children,
  fallbackRender,
  onError: onErrorFromProps,
  source: sourceFromProps,
  isolate = true,
  ...props
}: DefaultErrorBoundaryProps) => {
  const thisFallbackRender = fallbackRender || DefaultErrorFallbackRender;
  const onError = useCallback((error: unknown, errorInfo: ErrorInfo) => {
    const normalError = error instanceof Error ? error : new Error(String(error));
    // Report the error with component context
    errorReporter((r) =>
      r.reportBoundaryError(
        normalError,
        {
          componentStack: errorInfo.componentStack || undefined,
          errorBoundary: sourceFromProps || 'DefaultErrorBoundary',
        },
        isolate ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH,
      ),
    ).then(v => {
      const thisError = v.report.error;
      if (thisError && isolate === false) {            
        // Allow error to bubble up to parent boundaries by re-throwing asynchronously
        setTimeout(() => {
          throw thisError;
        }, 0);
      }
    }).catch(e => {
      LoggedError.isTurtlesAllTheWayDownBaby(e, {
        log: true,
        source: sourceFromProps || 'DefaultErrorBoundary',
      });
    });
    
    if (onErrorFromProps) {
      onErrorFromProps(error, errorInfo);
    }
  }, [onErrorFromProps, sourceFromProps, isolate]);


  return (       
          
    <ErrorBoundary 
      {...props}
      fallbackRender={thisFallbackRender}
      onError={onError}>
      {children}
    </ErrorBoundary>    
  );
};
