/**
 * Error monitoring public surface
 * Re-exports core reporter, hooks, HOCs and recovery helpers
 */
export { ErrorReporter, errorReporter } from './error-reporter';
export type {
  ErrorContext,
  ErrorReport,
  ErrorReporterConfig,
} from './error-reporter';
export { ErrorSeverity } from './error-reporter';

export { useErrorReporter } from './use-error-reporter';
export {
  withErrorBoundary,
  ErrorBoundaryWrapper,
  ErrorBoundaryDecorator,
} from './with-error-boundary';

export {
  classifyError,
  getRecoveryActions,
  getDefaultRecoveryAction,
  attemptAutoRecovery,
} from './recovery-strategies';
export type { RecoveryAction, RecoveryStrategy } from './recovery-strategies';
export { ErrorType } from './recovery-strategies';
