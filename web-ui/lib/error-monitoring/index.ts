/**
 * Error monitoring and reporting system exports
 */

export { ErrorReporter, errorReporter } from './error-reporter';
export type {
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
} from './error-reporter';
export type { ErrorReporterInterface } from './types';
export { ErrorSeverity } from './error-reporter';

// React hook for error reporting in components
export { useErrorReporter } from './use-error-reporter';

// High-order component for error boundary wrapping
export { withErrorBoundary } from './with-error-boundary';

// Error recovery strategies
export {
  classifyError,
  getRecoveryActions,
  getDefaultRecoveryAction,
  attemptAutoRecovery,
} from './recovery-strategies';
export type { RecoveryAction, RecoveryStrategy } from './recovery-strategies';
export { ErrorType } from './recovery-strategies';
