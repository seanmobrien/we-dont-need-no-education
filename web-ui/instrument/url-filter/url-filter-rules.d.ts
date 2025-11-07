/**
 * Type declarations for URL filter rules and factories.
 *
 * This module provides the core filtering interfaces and rule implementations
 * for matching URLs against patterns (string or regex-based).
 *
 * @module instrument/url-filter/url-filter-rules
 */

declare module '@/instrument/url-filter/url-filter-rules' {
  /**
   * Core filter rule interface.
   *
   * Defines the contract for all URL filter rules - they must provide
   * a `matches()` method for testing URLs and expose their configuration
   * via the `options` getter.
   *
   * @example
   * ```typescript
   * class CustomRule implements IFilterRule {
   *   matches(url: string): boolean {
   *     return url.includes('custom');
   *   }
   *   get options() {
   *     return { pattern: 'custom' };
   *   }
   * }
   * ```
   */
  export interface IFilterRule {
    /**
     * Test if a URL matches this filter rule.
     *
     * @param url - URL string to test
     * @returns True if the URL matches the rule's pattern
     *
     * @example
     * ```typescript
     * const rule = filterRuleFactory('/api/auth');
     * rule.matches('/api/auth/login'); // true
     * rule.matches('/api/public');     // false
     * ```
     */
    matches(url: string): boolean;

    /**
     * Get the rule's configuration options.
     *
     * @returns Configuration object containing the pattern (string or RegExp)
     */
    get options(): UrlFilterRuleOptions;
  }

  /**
   * Configuration options for a URL filter rule.
   *
   * Encapsulates the pattern used for URL matching. Pattern can be:
   * - RegExp: Tested with `pattern.test(url)`
   * - string: Tested with case-insensitive `url.includes(pattern)`
   *
   * @example
   * ```typescript
   * const regexOpts: UrlFilterRuleOptions = {
   *   pattern: /\/admin\//
   * };
   *
   * const stringOpts: UrlFilterRuleOptions = {
   *   pattern: '/api/auth'
   * };
   * ```
   */
  export type UrlFilterRuleOptions = {
    /** Pattern for URL matching (RegExp or string) */
    pattern: RegExp | string;
  };

  /**
   * Flexible input type for filter rule construction.
   *
   * Accepts multiple formats for convenience:
   * - string: Converted to case-insensitive substring match
   * - RegExp: Used directly for pattern matching
   * - UrlFilterRuleOptions: Configuration object
   * - IFilterRule: Existing rule instance (passed through)
   *
   * Strings wrapped in forward slashes (e.g., "/pattern/") are parsed as RegExp.
   *
   * @example
   * ```typescript
   * // All valid inputs
   * const inputs: FilterOptionsInput[] = [
   *   '/api/auth',                    // String
   *   /\/admin\//,                    // RegExp
   *   { pattern: '/secret' },         // Options
   *   existingRule                    // IFilterRule instance
   * ];
   * ```
   */
  export type FilterOptionsInput =
    | string
    | RegExp
    | UrlFilterRuleOptions
    | IFilterRule;

  /**
   * Configuration options for URL filter engine.
   *
   * Used by UrlFilterEngine constructor to initialize filter rules.
   *
   * @example
   * ```typescript
   * const options: UrlFilterOptions = {
   *   rules: [
   *     '/api/auth',
   *     /\/admin\//,
   *     { pattern: '/internal' }
   *   ]
   * };
   * ```
   */
  export type UrlFilterOptions = {
    /** Array of URL filter rules to apply */
    rules: Array<FilterOptionsInput>;
  };

  /**
   * Type guard to check if an object is UrlFilterRuleOptions.
   *
   * Validates that the object has a non-null `pattern` property.
   *
   * @param obj - Value to check
   * @returns True if the value is UrlFilterRuleOptions
   *
   * @example
   * ```typescript
   * if (isUrlFilterOptions(value)) {
   *   // TypeScript knows value.pattern exists
   *   console.log(value.pattern);
   * }
   * ```
   */
  export function isUrlFilterOptions(obj: unknown): obj is UrlFilterRuleOptions;

  /**
   * Factory function to convert various inputs to UrlFilterRuleOptions.
   *
   * Normalizes different input formats into a standard options object:
   * - RegExp → `{ pattern: regexp }`
   * - "/pattern/" string → Parses as RegExp
   * - Other strings → `{ pattern: string }`
   * - UrlFilterRuleOptions → Returns as-is
   *
   * Does not accept IFilterRule (use filterRuleFactory for that).
   *
   * @param rule - Input to convert (string, RegExp, or options)
   * @returns Normalized UrlFilterRuleOptions
   * @throws {TypeError} If pattern is invalid
   *
   * @example
   * ```typescript
   * // String patterns
   * const opts1 = urlFilterRuleOptionsFactory('/api/auth');
   * // { pattern: '/api/auth' }
   *
   * // RegExp string notation
   * const opts2 = urlFilterRuleOptionsFactory('/\\/admin\\//');
   * // { pattern: /\/admin\// }
   *
   * // Direct RegExp
   * const opts3 = urlFilterRuleOptionsFactory(/\/secret\//);
   * // { pattern: /\/secret\// }
   * ```
   */
  export function urlFilterRuleOptionsFactory(
    rule: Exclude<FilterOptionsInput, IFilterRule>,
  ): UrlFilterRuleOptions;

  /**
   * Factory function to create IFilterRule instances from various inputs.
   *
   * Primary factory for creating filter rules. Handles all input formats:
   * - IFilterRule → Returns as-is
   * - string/RegExp/UrlFilterRuleOptions → Creates appropriate rule implementation
   *
   * String patterns use case-insensitive substring matching.
   * RegExp patterns use `pattern.test(url)`.
   *
   * @param opts - Input to convert to IFilterRule
   * @returns IFilterRule instance ready for matching
   * @throws {TypeError} If pattern is missing or invalid
   *
   * @example
   * ```typescript
   * // Create rules from different inputs
   * const rule1 = filterRuleFactory('/api/auth');
   * const rule2 = filterRuleFactory(/\/admin\//);
   * const rule3 = filterRuleFactory({ pattern: '/secret' });
   *
   * // Use rules
   * rule1.matches('/api/auth/login');  // true
   * rule2.matches('/admin/users');     // true
   * rule3.matches('/api/secret/key');  // true
   * ```
   */
  export function filterRuleFactory(opts: FilterOptionsInput): IFilterRule;
}
