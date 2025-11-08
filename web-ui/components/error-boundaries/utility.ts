/**
 * @module components/error-boundaries/utility
 *
 * Utility helpers used by the error-boundary system for normalizing
 * error text keys and evaluating suppression rules.
 *
 * The functions in this module are intentionally small and pure so they
 * are easy to test and reason about. They normalize noisy error messages
 * (for example multiple "Uncaught " prefixes that browsers sometimes add)
 * and provide a stable debounce key for deduplication. They also implement
 * the matching logic used to decide whether an incoming error should be
 * suppressed based on configured suppression rules.
 */

/**
 * Normalize an error message by removing repeated leading "Uncaught "
 * prefixes that some browsers and environments prepend to thrown errors.
 *
 * Example:
 *   normalizeErrorMessage('Uncaught Uncaught FooError: boom')
 *   // -> 'FooError: boom'
 *
 * @param message - The raw error message to normalize.
 * @returns The normalized message with any leading repeated
 *          "Uncaught " fragments removed.
 */
export const normalizeErrorMessage = (message: string): string => {
  // Remove repeating 'Uncaught ' at the beginning of the string
  return message.replace(/^(?:Uncaught\s+)+/g, '');
};

/**
 * Create a normalized debounce key suitable for grouping/deduplicating
 * errors. The key is lower-cased, trimmed and cleaned of repeated leading
 * "Uncaught " prefixes so the same logical error maps to the same key
 * even when different runtimes attach different prefixes.
 *
 * @param key - The raw key or message to normalize.
 * @returns A stable, lower-cased, trimmed key for use as a debounce id.
 */
export const normalizeDebounceKey = (key: string) => {
  // Normalize the key by removing repeating 'Uncaught ' prefixes
  return normalizeErrorMessage(key).toLowerCase().trim();
};
