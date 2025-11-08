/**
 * Type declarations for URL filtering engine for OpenTelemetry log data.
 *
 * This module provides an abstract base class for extracting and filtering URLs
 * from telemetry data (logs, traces, spans). Implements version-based cache
 * invalidation for efficient URL extraction with rule management.
 *
 * Used to protect PII and sensitive data by filtering URLs before export.
 *
 * @module instrument/url-filter/url-filter-engine
 */

declare module '@/instrument/url-filter/url-filter-engine' {
  import type { AnyValue } from '@opentelemetry/api-logs';
  import type {
    FilterOptionsInput,
    IFilterRule,
    UrlFilterOptions,
  } from '@/instrument/url-filter/url-filter-rules';

  /**
   * Abstract base class for URL filtering engines.
   *
   * Provides efficient URL extraction from nested telemetry data structures with
   * LRU caching and version-based cache invalidation. Supports dynamic rule
   * management with automatic cache invalidation on rule changes.
   *
   * Key features:
   * - **Recursive URL extraction**: Handles strings, arrays, and nested objects
   * - **LRU caching**: Caches extraction results with SHA-256 hashing for object keys
   * - **Version-based invalidation**: O(1) cache invalidation on rule changes
   * - **Depth limiting**: Prevents stack overflow on deeply nested structures (max: 10)
   * - **Graceful degradation**: Returns empty array on extraction errors
   * - **Custom URL keys**: Configurable attribute keys for URL detection
   *
   * @abstract
   * @implements {IFilterRule}
   *
   * @example
   * ```typescript
   * // Extend for specific use cases
   * class MyUrlFilter extends UrlFilterEngine {
   *   // Implementation provided by abstract class
   * }
   *
   * const filter = new MyUrlFilter({
   *   rules: ['/api/auth', /\/admin\//],
   *   urlKeys: ['http.url', 'request.url'],
   *   maxCacheSize: 50
   * });
   *
   * // Add/remove rules dynamically
   * filter.addRule(/sensitive-endpoint/);
   * filter.removeRule(existingRule);
   *
   * // Extract URLs from log body
   * const urls = filter.extractUrls(logRecord.body);
   *
   * // Check if any extracted URLs match filter rules
   * if (filter.matches(logRecord.body)) {
   *   console.log('Log contains filtered URL');
   * }
   * ```
   */
  export abstract class UrlFilterEngine implements IFilterRule {
    /**
     * Create a new URL filter engine.
     *
     * @param options - Configuration options
     * @param options.rules - Initial filter rules (strings, regexes, or IFilterRule instances)
     * @param options.urlKeys - Attribute keys to check for URLs (default: common HTTP keys)
     * @param options.maxCacheSize - Maximum LRU cache entries (default: 100)
     *
     * @example
     * ```typescript
     * const filter = new MyUrlFilter({
     *   rules: [
     *     '/api/auth',           // String pattern (case-insensitive)
     *     /\/admin\//,           // RegExp pattern
     *     { pattern: '/secret' } // UrlFilterRuleOptions
     *   ],
     *   urlKeys: ['http.url', 'url', 'request.url'],
     *   maxCacheSize: 50
     * });
     * ```
     */
    constructor(
      options?: UrlFilterOptions & {
        urlKeys?: string[];
        maxCacheSize?: number;
      },
    );

    /**
     * Check if any URLs extracted from the input match filter rules.
     *
     * This is the primary filtering method. Extracts all URLs from the input
     * (leveraging cache) and checks if any match the configured rules.
     *
     * @param url - Value to extract URLs from and test (string, array, or object)
     * @returns True if any extracted URL matches any filter rule
     *
     * @example
     * ```typescript
     * // String input
     * filter.matches('GET /api/auth/login'); // true if /api/auth is a rule
     *
     * // Object input (log attributes)
     * filter.matches({
     *   'http.url': '/admin/users',
     *   'http.method': 'POST'
     * }); // true if /admin matches a rule
     *
     * // Array input
     * filter.matches(['/api/public', '/api/secret']); // true if /api/secret matches
     * ```
     */
    matches(url: AnyValue): boolean;

    /**
     * Get current filter options (rules).
     *
     * Returns a summary of configured rules. Individual rule options can be
     * inspected for debugging or introspection.
     *
     * @returns Object containing 'pattern' description and array of rule options
     *
     * @example
     * ```typescript
     * const opts = filter.options;
     * console.log(opts.rules); // [{ pattern: '/api/auth' }, { pattern: /admin/ }]
     * ```
     */
    get options(): {
      pattern: string;
      rules: Array<{ pattern: RegExp | string }>;
    };

    /**
     * Extract all URLs from the input value, including nested structures.
     *
     * Recursively traverses strings, arrays, and objects to find URLs. Results
     * are cached using version-prefixed keys for performance. Handles circular
     * references and deeply nested structures gracefully.
     *
     * @param input - Value to extract URLs from (string, array, or object)
     * @returns Array of extracted URL strings (empty array if none found or on error)
     *
     * @example
     * ```typescript
     * // String input
     * filter.extractUrls('Error at /api/users/123');
     * // Returns: ['/api/users/123']
     *
     * // Object input
     * filter.extractUrls({
     *   'http.url': '/api/endpoint',
     *   message: 'Request to /another/path',
     *   nested: { url: '/third/url' }
     * });
     * // Returns: ['/api/endpoint', '/another/path', '/third/url']
     *
     * // Array input
     * filter.extractUrls([
     *   'First /path/one',
     *   { url: '/path/two' },
     *   ['/path/three']
     * ]);
     * // Returns: ['/path/one', '/path/two', '/path/three']
     * ```
     */
    extractUrls(input: AnyValue): Array<string>;

    /**
     * Add a new filter rule and invalidate cache.
     *
     * Adds the rule to the internal rules array and increments the cache version
     * to invalidate all cached extraction results (since filtering criteria changed).
     *
     * @param rule - Rule to add (string, RegExp, options object, or IFilterRule)
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * filter
     *   .addRule('/api/v2/admin')
     *   .addRule(/\/sensitive\//)
     *   .addRule({ pattern: '/internal' });
     * ```
     */
    addRule(rule: FilterOptionsInput): this;

    /**
     * Remove an existing filter rule and invalidate cache.
     *
     * Removes the rule by reference equality and increments the cache version
     * to invalidate cached results.
     *
     * @param rule - Rule instance to remove
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * const myRule = filter.addRule('/temp-rule');
     * // Later...
     * filter.removeRule(myRule);
     * ```
     */
    removeRule(rule: IFilterRule): this;

    /**
     * Clear all filter rules and invalidate cache.
     *
     * Removes all rules and increments the cache version. After calling this,
     * `matches()` will return false for all inputs (no rules to match).
     *
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * filter.clearRules(); // Remove all filtering rules
     * ```
     */
    clearRules(): this;

    /**
     * Manually clear the extraction cache.
     *
     * Useful for testing or memory management. Normally not needed since cache
     * is automatically invalidated via version tracking when rules change.
     *
     * @example
     * ```typescript
     * filter.clearCache(); // Force cache clear
     * ```
     */
    clearCache(): void;
  }
}
