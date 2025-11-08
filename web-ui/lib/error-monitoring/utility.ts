import type { ErrorLike } from '@/lib/react-util/errors/error-like';
import type { ErrorSuppressionRule, SuppressionResult } from './types';
import { DEFAULT_SUPPRESSION_RULES } from './default-suppression-rules';

/**
 * Normalize error messages by removing repeating 'Uncaught ' prefixes
 * Example: 'Uncaught Uncaught Uncaught [object] test Uncaught' -> '[object] test Uncaught'
 */
const normalizeErrorMessage = (message: string): string => {
  // Remove repeating 'Uncaught ' at the beginning of the string
  return message.replace(/^(?:Uncaught\s+)+/g, '');
};

/**
 * Evaluate whether an incoming error should be suppressed based on a set
 * of configured suppression rules.
 *
 * A suppression rule has at minimum a `pattern` (string or RegExp). If the
 * rule also specifies a `source`, that source must match the error's
 * `source` (if present) for the rule to apply. When a rule matches it may
 * also indicate `suppressCompletely` to indicate whether the error should
 * be completely ignored or merely suppressed from reporting but kept in
 * other internal stores.
 *
 * This function is intentionally tolerant at runtime (it performs
 * best-effort string/RegExp matching) and returns the first matching
 * rule; callers should ensure suppression rules are ordered by priority.
 *
 * @param params - An object containing the error to test and an array of
 *                 suppression rules to evaluate in order.
 * @param params.error - The error-like object to test. Only `message`
 *                        and optional `source` are used.
 * @param params.suppressionRules - An ordered list of suppression rules.
 *
 * @returns A `SuppressionResult` indicating whether the error should be
 *          suppressed and, if so, which rule matched and whether the
 *          suppression is complete.
 *
 * @example
 * const result = shouldSuppressError({
 *   error: { message: 'Uncaught TypeError: failed', source: 'vendor.js' },
 *   suppressionRules: [ { pattern: /TypeError/, source: 'vendor', suppressCompletely: true } ]
 * });
 */
export const shouldSuppressError = ({
  error,
  suppressionRules,
}: {
  error: ErrorLike;
  suppressionRules?: ErrorSuppressionRule[];
}): SuppressionResult => {
  const testMatch = (pattern: string | RegExp, value: string): boolean => {
    return (
      !!value &&
      (typeof pattern === 'string'
        ? value.includes(pattern)
        : pattern.test(value))
    );
  };
  const errorMessage = normalizeErrorMessage(error.message);
  const errorSource = error.source;
  const matchedRule = (suppressionRules ?? DEFAULT_SUPPRESSION_RULES).find(
    (rule) => {
      // Check if the error message matches the rule pattern
      const messageMatches = testMatch(rule.pattern, errorMessage);
      if (!messageMatches) {
        return false;
      }
      // If rule contains a source then it must match as well
      if (rule.source) {
        const sourceMatches = testMatch(rule.source, errorSource || '');
        if (!sourceMatches) {
          return false;
        }
      }
      // If we reach here, the rule is a match.
      return true;
    },
  );
  return matchedRule
    ? {
        suppress: true,
        rule: matchedRule,
        completely: matchedRule.suppressCompletely,
      }
    : { suppress: false };
};
