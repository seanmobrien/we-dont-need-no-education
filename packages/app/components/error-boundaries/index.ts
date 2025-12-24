/**
 * Error boundary and error management system exports
 */

// Main error boundary fallback component
export { RenderErrorBoundaryFallback } from './renderFallback';

// Client-side error management
export { ClientErrorManager } from './ClientErrorManager';
export type { ClientErrorManagerConfig, ErrorSuppressionRule } from './types';
export {
  createSuppressionRule,
  useErrorSuppression,
} from './ClientErrorManager';

// Server-safe error managers for use in server components
export { default as ErrorManager } from './ServerSafeErrorManager';
export {
  ConfigurableErrorManager,
  DevErrorManager,
  ProdErrorManager,
} from './ServerSafeErrorManager';
export type { ErrorManagerConfig } from './ServerSafeErrorManager';

// Provider components
export {
  ErrorManagerProvider,
  DefaultErrorManager,
  DevErrorManager as DevErrorManagerClient,
  ProdErrorManager as ProdErrorManagerClient,
} from './ErrorManagerProvider';

// HOC and wrapper components
// export { withErrorBoundary, ErrorBoundaryWrapper } from './with-error-boundary';
