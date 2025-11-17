import type { ErrorLike } from '../react-util/errors/error-like';

/**
 * @fileoverview Type definitions and documentation for error monitoring utilities
 *
 * This module provides utility functions for error message normalization and
 * error suppression rule evaluation. These utilities support the error monitoring
 * system by preprocessing error messages and determining which errors should be
 * suppressed based on configurable rules.
 *
 * @module @/lib/error-monitoring/utility
 */
declare module '@/lib/error-monitoring/utility' {
  import type {
    ErrorSuppressionRule,
    SuppressionResult,
  } from '@/lib/error-monitoring/types';

  /**
   * Options for normalizing error messages.
   *
   * Controls how error messages are cleaned and truncated during normalization.
   * The normalization process removes redundant prefixes and ensures messages
   * stay within reasonable length limits.
   */
  export interface NormalizeErrorMessageOptions {
    /**
     * Maximum length of the normalized error message.
     *
     * Messages longer than this will be truncated to prevent excessive
     * memory usage and improve readability in logs and monitoring systems.
     *
     * @default 2048
     */
    maxLength?: number;
  }

  /**
   * Parameters for evaluating error suppression rules.
   *
   * Provides the error to evaluate and an optional set of suppression rules
   * to apply. If no rules are provided, the default system suppression rules
   * are used automatically.
   */
  export interface ShouldSuppressErrorParams {
    /**
     * The error-like object to evaluate for suppression.
     *
     * Only the `message` and optional `source` properties are used for
     * matching against suppression rules. The error is tested against each
     * rule in order until a match is found.
     */
    error: ErrorLike;

    /**
     * Optional ordered list of suppression rules to evaluate.
     *
     * Rules are evaluated in order, and the first matching rule determines
     * the suppression behavior. If omitted, the default system suppression
     * rules are used (from DEFAULT_SUPPRESSION_RULES).
     *
     * Order matters - place more specific rules before general ones to
     * ensure correct matching priority.
     *
     * @example
     * ```typescript
     * // More specific rule should come first
     * const rules: ErrorSuppressionRule[] = [
     *   { id: 'specific', pattern: /TypeError.*vendor/, source: /vendor\.js/ },
     *   { id: 'general', pattern: /TypeError/ }
     * ];
     * ```
     */
    suppressionRules?: ErrorSuppressionRule[];
  }

  /**
   * Normalize error messages by removing redundant prefixes and truncating.
   *
   * Error messages can accumulate redundant 'Uncaught ' prefixes when errors
   * are re-thrown or wrapped multiple times. This function cleans up these
   * prefixes and ensures the message stays within a reasonable length.
   *
   * The normalization process:
   * 1. Removes all repeating 'Uncaught ' prefixes from the start of the message
   * 2. Truncates the result to the specified maximum length
   * 3. Returns the cleaned message
   *
   * This cleanup improves error message readability and ensures consistent
   * fingerprinting for error deduplication.
   *
   * @param message - The raw error message to normalize
   * @param options - Optional configuration for normalization behavior
   * @param options.maxLength - Maximum length of normalized message (default: 2048)
   *
   * @returns The normalized error message with redundant prefixes removed
   *          and length constrained to maxLength
   *
   * @example
   * ```typescript
   * // Remove redundant 'Uncaught ' prefixes
   * normalizeErrorMessage('Uncaught Uncaught TypeError: Cannot read property');
   * // Returns: 'TypeError: Cannot read property'
   *
   * // Preserve single 'Uncaught' at end
   * normalizeErrorMessage('Uncaught Uncaught [object] test Uncaught');
   * // Returns: '[object] test Uncaught'
   *
   * // Truncate long messages
   * normalizeErrorMessage('Error: ' + 'x'.repeat(3000), { maxLength: 100 });
   * // Returns: 'Error: xxx...' (truncated to 100 chars)
   *
   * // Custom max length
   * normalizeErrorMessage('Very long error message...', { maxLength: 50 });
   * ```
   */
  export function normalizeErrorMessage(
    message: string,
    options?: NormalizeErrorMessageOptions,
  ): string;

  /**
   * Evaluate whether an error should be suppressed based on configured rules.
   *
   * This function tests an error against an ordered list of suppression rules
   * to determine if it should be filtered from reporting. Each rule can specify
   * a message pattern and optional source pattern that must match for the rule
   * to apply.
   *
   * ## Matching Behavior
   *
   * Rules are evaluated in order, and the first matching rule determines the result:
   * - **Message Pattern**: Must match the error's (normalized) message
   * - **Source Pattern** (optional): If specified, must also match the error's source
   * - **Suppress Completely**: Determines if error is completely ignored or just hidden from UI
   *
   * Pattern matching supports both strings (substring match) and RegExp (pattern match):
   * - String patterns: Case-sensitive substring matching (`message.includes(pattern)`)
   * - RegExp patterns: Full regular expression matching (`pattern.test(message)`)
   *
   * ## Suppression Levels
   *
   * Rules can specify two levels of suppression via `suppressCompletely`:
   * - **Partial** (false): Error is logged and stored but not displayed in UI or sent to external monitoring
   * - **Complete** (true): Error is completely ignored - no logging, storage, or reporting
   *
   * ## Best Practices
   *
   * - Order rules from most specific to most general
   * - Use complete suppression sparingly - only for truly harmless errors
   * - Include descriptive `reason` fields in rules for maintainability
   * - Test rules against real error messages to avoid over-suppression
   *
   * @param params - Configuration object with error and suppression rules
   * @returns Suppression result indicating if/how the error should be suppressed
   *
   * @example
   * ```typescript
   * // Basic suppression with string pattern
   * const result1 = shouldSuppressError({
   *   error: { message: 'ResizeObserver loop limit exceeded' },
   *   suppressionRules: [{
   *     id: 'resize-observer',
   *     pattern: 'ResizeObserver loop',
   *     suppressCompletely: false,
   *     reason: 'Browser quirk, harmless'
   *   }]
   * });
   * // Returns: { suppress: true, rule: {...}, completely: false }
   *
   * // Suppress with message and source patterns
   * const result2 = shouldSuppressError({
   *   error: {
   *     message: 'Uncaught TypeError: Cannot read property',
   *     source: 'vendor/analytics.js'
   *   },
   *   suppressionRules: [{
   *     id: 'third-party-error',
   *     pattern: /TypeError/,
   *     source: /vendor\//,
   *     suppressCompletely: true,
   *     reason: 'Third-party script errors'
   *   }]
   * });
   * // Returns: { suppress: true, rule: {...}, completely: true }
   *
   * // No match - error not suppressed
   * const result3 = shouldSuppressError({
   *   error: { message: 'Network request failed' },
   *   suppressionRules: [{
   *     id: 'ui-errors',
   *     pattern: /Hydration/,
   *     suppressCompletely: false
   *   }]
   * });
   * // Returns: { suppress: false }
   *
   * // Rule ordering matters - most specific first
   * const result4 = shouldSuppressError({
   *   error: { message: 'TypeError in vendor.js', source: 'vendor.js' },
   *   suppressionRules: [
   *     {
   *       id: 'vendor-specific',
   *       pattern: /TypeError/,
   *       source: /vendor\.js$/,
   *       suppressCompletely: true
   *     },
   *     {
   *       id: 'all-typeerrors',
   *       pattern: /TypeError/,
   *       suppressCompletely: false
   *     }
   *   ]
   * });
   * // Returns first match: { suppress: true, rule: vendor-specific, completely: true }
   *
   * // Use default rules when none provided
   * const result5 = shouldSuppressError({
   *   error: { message: 'Some error' }
   *   // suppressionRules omitted - uses DEFAULT_SUPPRESSION_RULES
   * });
   * ```
   */
  export function shouldSuppressError(
    params: ShouldSuppressErrorParams,
  ): SuppressionResult;
}
