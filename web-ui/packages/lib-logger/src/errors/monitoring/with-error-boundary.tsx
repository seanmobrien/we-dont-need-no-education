'use client';

import React, { ComponentType, ReactNode } from 'react';
import { ErrorSeverity } from './error-reporter';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface InternalErrorBoundaryProps {
  fallbackRender?: (props: FallbackProps) => ReactNode;
  onReset?: () => void;
  children: ReactNode;
}

interface InternalErrorBoundaryState {
  error: Error | null;
}

class InternalErrorBoundary extends React.Component<
  InternalErrorBoundaryProps,
  InternalErrorBoundaryState
> {
  state: InternalErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): InternalErrorBoundaryState {
    return { error };
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.reset,
        });
      }

      return null;
    }

    return this.props.children;
  }
}

/**
 * Configuration for the error boundary HOC
 */
interface WithErrorBoundaryConfig {
  fallbackRender?: (props: FallbackProps) => ReactNode;
  onReset?: () => void;
  severity?: ErrorSeverity;
  isolate?: boolean; // If true, errors won't bubble up to parent boundaries
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  config: WithErrorBoundaryConfig = {},
) {
  const {
    fallbackRender,
    onReset,
    isolate = false,
  } = config;

  const componentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <InternalErrorBoundary
        fallbackRender={fallbackRender}
        onReset={onReset}
      >
        <WrappedComponent {...props} />
      </InternalErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`;

  return WithErrorBoundaryComponent;
}

export const ErrorBoundaryDecorator = (config?: WithErrorBoundaryConfig) => {
  return function <T extends ComponentType<Record<string, unknown>>>(
    target: T,
  ): T {
    return withErrorBoundary(target, config) as T;
  };
};
