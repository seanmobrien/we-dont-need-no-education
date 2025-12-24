import type {
  ErrorSuppressionRule as ImportedErrorSuppressionRule,
  SuppressionResult as ImportedSuppressionResult,
} from '@/lib/error-monitoring/types';

/**
 * Imported from lib/error-monitoring/types - use that definition instead.
 * @deprecated('Use ErrorSuppressionRule from lib/error-monitoring/types instead')
 */
type ErrorSuppressionRule = ImportedErrorSuppressionRule;

/** Imported from lib/error-monitoring/types - use that definition instead.
 * @deprecated('Use SuppressionResult from lib/error-monitoring/types instead')
 */
type SuppressionResult = ImportedSuppressionResult;

export type { ErrorSuppressionRule, SuppressionResult };

/**
 * Configuration for ClientErrorManager
 */
export interface ClientErrorManagerConfig {
  /** Array of error suppression rules */
  suppressionRules?: ImportedErrorSuppressionRule[];
  /** Whether to surface non-suppressed errors to React error boundaries */
  surfaceToErrorBoundary?: boolean;
  /** Whether to report suppressed errors (with low severity) */
  reportSuppressedErrors?: boolean;
  /** Debounce time for duplicate errors (ms) */
  debounceMs?: number;
}
