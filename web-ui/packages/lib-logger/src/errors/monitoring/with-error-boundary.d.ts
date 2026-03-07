import type { ComponentType, ErrorInfo, PropsWithChildren } from 'react';
import type { ErrorReporterInterface, ErrorSeverity } from './types';

/**
 * Higher-order component that wraps a component with an Error Boundary and reports
 * errors to the shared ErrorReporter.
 */
export declare function withErrorBoundary<P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  options?: {
    reporter?: ErrorReporterInterface;
    onError?: (error: Error, info: ErrorInfo) => void;
    severity?: ErrorSeverity;
  },
): ComponentType<P & PropsWithChildren<Record<string, unknown>>>;
