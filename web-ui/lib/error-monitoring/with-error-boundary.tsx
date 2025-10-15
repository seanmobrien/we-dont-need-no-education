import React, { ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { errorReporter, ErrorSeverity } from './error-reporter';

/**
 * Configuration for the error boundary HOC
 */
interface WithErrorBoundaryConfig {
  fallbackComponent?: ComponentType<{
    error: Error;
    resetErrorBoundary: () => void;
  }>;
  onReset?: () => void;
  severity?: ErrorSeverity;
  isolate?: boolean; // If true, errors won't bubble up to parent boundaries
}


export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  config: WithErrorBoundaryConfig = {},
) {
  const {
    fallbackComponent: FallbackComponent = RenderErrorBoundaryFallback,
    onReset,
    severity = ErrorSeverity.MEDIUM,
    isolate = false,
  } = config;

  const componentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <FallbackComponent
            error={error}
            resetErrorBoundary={resetErrorBoundary}
          />
        )}
        onError={(error, errorInfo) => {
          // Report the error with component context
          errorReporter.reportBoundaryError(
            error,
            {
              componentStack: errorInfo.componentStack || undefined,
              errorBoundary: `${componentName}ErrorBoundary`,
            },
            severity,
          );

          // Prevent error from bubbling if isolation is enabled
          if (isolate) {
            console.warn(`Error isolated in ${componentName}:`, error);
          }
        }}
        onReset={() => {
          // Custom reset logic
          if (onReset) {
            onReset();
          }

          // Default reset behavior
          console.log(`Resetting error boundary for ${componentName}`);
        }}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`;

  return WithErrorBoundaryComponent;
}


export function ErrorBoundaryDecorator(config?: WithErrorBoundaryConfig) {
  return function <T extends ComponentType<Record<string, unknown>>>(
    target: T,
  ): T {
    return withErrorBoundary(target, config) as T;
  };
}

/**
 * Utility component for creating inline error boundaries
 */
interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onError?: (error: Error, errorInfo: { componentStack?: string }) => void;
  onReset?: () => void;
  name?: string;
}

export function ErrorBoundaryWrapper({
  children,
  fallback: FallbackComponent = RenderErrorBoundaryFallback,
  onError,
  onReset,
  name = 'InlineErrorBoundary',
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <FallbackComponent
          error={error}
          resetErrorBoundary={resetErrorBoundary}
        />
      )}
      onError={(error, errorInfo) => {
        // Report the error
        errorReporter.reportBoundaryError(
          error,
          {
            componentStack: errorInfo.componentStack || undefined,
            errorBoundary: name,
          },
          ErrorSeverity.MEDIUM,
        );

        // Custom error handler
        if (onError) {
          onError(error, {
            componentStack: errorInfo.componentStack || undefined,
          });
        }
      }}
      onReset={onReset}
    >
      {children}
    </ErrorBoundary>
  );
}
