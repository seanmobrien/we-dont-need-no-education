'use client';
import React from 'react';
import { DefaultErrorBoundary } from '@/components/error-boundaries/defaultErrorBoundary';
export function withErrorBoundary(WrappedComponent, config = {}) {
    const { fallbackRender, onReset, isolate = false, } = config;
    const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
    const WithErrorBoundaryComponent = (props) => {
        return (<DefaultErrorBoundary isolate={isolate} source={componentName} fallbackRender={fallbackRender} onReset={onReset}>
          <WrappedComponent {...props}/>
      </DefaultErrorBoundary>);
    };
    WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`;
    return WithErrorBoundaryComponent;
}
export const ErrorBoundaryDecorator = (config) => {
    return function (target) {
        return withErrorBoundary(target, config);
    };
};
//# sourceMappingURL=with-error-boundary.jsx.map