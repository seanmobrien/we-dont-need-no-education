/**
 * Configuration for error suppression patterns
 */
export interface ErrorSuppressionRule {
  /** Unique identifier for this rule */
  id: string;
  /** Pattern to match against error messages (string contains or regex) */
  pattern: string | RegExp;
  /** Optional: match against error source/filename */
  source?: string | RegExp;
  /** Whether to completely suppress (no logging) or just prevent UI display */
  suppressCompletely?: boolean;
  /** Description of why this error is suppressed */
  reason?: string;
}

/**
 * Configuration for ClientErrorManager
 */
export interface ClientErrorManagerConfig {
  /** Array of error suppression rules */
  suppressionRules?: ErrorSuppressionRule[];
  /** Whether to surface non-suppressed errors to React error boundaries */
  surfaceToErrorBoundary?: boolean;
  /** Whether to report suppressed errors (with low severity) */
  reportSuppressedErrors?: boolean;
  /** Debounce time for duplicate errors (ms) */
  debounceMs?: number;
}

export type SuppressionResult = {
  suppress: boolean;
  rule?: ErrorSuppressionRule;
  completely?: boolean;
};
