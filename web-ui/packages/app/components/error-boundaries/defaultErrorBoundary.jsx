'use client';
import { ErrorBoundary } from 'react-error-boundary';
import { useCallback } from 'react';
import { RenderErrorBoundaryFallback } from './render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
import { safeSerialize, LoggedError } from '@compliance-theater/logger';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring/error-reporter';
export const DefaultErrorFallbackRender = ({ error, resetErrorBoundary, }) => {
    const resetAction = useCallback((...args) => {
        try {
            resetErrorBoundary(...args);
        }
        catch (e) {
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
    const { processedError } = useProcessedError({
        error: normalizedError,
        resetAction,
    });
    return processedError
        ? (<RenderErrorBoundaryFallback error={processedError} resetErrorBoundaryAction={resetAction}/>)
        : (<></>);
};
export const DefaultErrorBoundary = ({ children, fallbackRender, onError: onErrorFromProps, source: sourceFromProps, isolate = true, ...props }) => {
    const thisFallbackRender = fallbackRender || DefaultErrorFallbackRender;
    const onError = useCallback((error, errorInfo) => {
        const normalError = error instanceof Error ? error : new Error(String(error));
        errorReporter((r) => r.reportBoundaryError(normalError, {
            componentStack: errorInfo.componentStack || undefined,
            errorBoundary: sourceFromProps || 'DefaultErrorBoundary',
        }, isolate ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH)).then(v => {
            const thisError = v.report.error;
            if (thisError && isolate === false) {
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
    return (<ErrorBoundary {...props} fallbackRender={thisFallbackRender} onError={onError}>
      {children}
    </ErrorBoundary>);
};
//# sourceMappingURL=defaultErrorBoundary.jsx.map