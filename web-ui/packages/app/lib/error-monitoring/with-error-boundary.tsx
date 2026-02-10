'use client';

import React, { ComponentType, ReactNode } from 'react';
import { FallbackProps } from 'react-error-boundary';
import { ErrorSeverity } from './error-reporter';
import { DefaultErrorBoundary } from '@/components/error-boundaries/defaultErrorBoundary';

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
      <DefaultErrorBoundary 
        isolate={isolate}
        source={componentName}
        fallbackRender={fallbackRender}
        onReset={onReset}
        >
          <WrappedComponent {...props} />
      </DefaultErrorBoundary>);
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`;

  return WithErrorBoundaryComponent;
}

export const ErrorBoundaryDecorator = (config?: WithErrorBoundaryConfig) => {
  return function <T extends ComponentType<Record<string, unknown>>>(
    target: T,
  ): T  {
    return withErrorBoundary(target, config) as T;
  };
}
