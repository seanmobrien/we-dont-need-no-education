/**
 * Type declarations for URL-filtered span exporter.
 *
 * This module provides a SpanExporter decorator that filters spans containing URLs
 * matching configured rules. Implements hierarchical filtering where child spans are
 * automatically excluded if their parent span is filtered.
 *
 * Used to protect PII and reduce noise in distributed traces by filtering sensitive
 * or irrelevant URLs (e.g., /api/auth, /health, /admin).
 *
 * @module instrument/url-filter/url-filter-trace-exporter
 */

declare module '@/instrument/url-filter/url-filter-trace-exporter' {
  import type {
    ReadableSpan,
    SpanExporter,
  } from '@opentelemetry/sdk-trace-base';
  import type { ExportResult } from '@opentelemetry/core';
  import type { LRUCache } from 'lru-cache';
  import type { UrlFilterOptions } from '@/instrument/url-filter/url-filter-rules';
  import { UrlFilterEngine } from '@/instrument/url-filter/url-filter-engine';

  /**
   * SpanExporter decorator that filters spans containing URLs matching configured rules.
   *
   * Implements hierarchical filtering: when a parent span is filtered due to URL match,
   * all descendant spans are automatically excluded. Uses a global LRU cache to track
   * filtered spans across export batches, ensuring consistent filtering of span hierarchies.
   *
   * Key features:
   * - **Hierarchical filtering**: Child spans excluded when parent is filtered
   * - **Cross-batch consistency**: Global cache tracks filtered spans across batches
   * - **Within-batch optimization**: Builds spanMap for efficient parent lookups
   * - **Graceful degradation**: Errors keep spans rather than dropping them
   * - **Testable design**: Supports cache injection for unit testing
   * - **Performance**: O(d×n) where d=depth, n=span count (optimized with caching)
   *
   * @extends {UrlFilterEngine}
   * @implements {SpanExporter}
   *
   * @example
   * ```typescript
   * import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
   * import { UrlFilteredSpanExporter } from '@/instrument/url-filter/url-filter-trace-exporter';
   *
   * // Basic usage with default global cache
   * const innerExporter = new ConsoleSpanExporter();
   * const filteredExporter = new UrlFilteredSpanExporter(innerExporter, {
   *   rules: [
   *     '/api/auth',           // String pattern (case-insensitive substring)
   *     /\/admin\//,           // RegExp pattern
   *     '/health',             // Filter health checks
   *     { pattern: '/internal' } // UrlFilterRuleOptions
   *   ]
   * });
   *
   * // With custom cache for testing
   * import { LRUCache } from 'lru-cache';
   * const testCache = new LRUCache<string, boolean>({ max: 100 });
   * const testExporter = new UrlFilteredSpanExporter(innerExporter, {
   *   rules: ['/api/secret'],
   *   cache: testCache
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Hierarchical filtering in action
   * // Given span hierarchy:
   * //   Root Span (contains /api/auth) → filtered
   * //     └─ Child Span → automatically excluded
   * //         └─ Grandchild Span → automatically excluded
   *
   * const exporter = new UrlFilteredSpanExporter(inner, {
   *   rules: ['/api/auth']
   * });
   *
   * // Export batch containing parent and children
   * exporter.export([rootSpan, childSpan, grandchildSpan], callback);
   * // Result: All three spans filtered, only rootSpan matched directly
   * ```
   */
  export class UrlFilteredSpanExporter
    extends UrlFilterEngine
    implements SpanExporter
  {
    /**
     * Create a new URL-filtered span exporter.
     *
     * @param inner - The underlying SpanExporter to wrap (e.g., ConsoleSpanExporter, OTLPExporter)
     * @param opts - Configuration options
     * @param opts.rules - Array of URL filter rules (strings, RegExps, or rule objects)
     * @param opts.cache - Optional LRU cache for filtered span IDs (defaults to global singleton)
     * @param opts.urlKeys - Optional custom URL attribute keys to check (defaults to common HTTP keys)
     * @param opts.maxCacheSize - Maximum URL extraction cache size (defaults to 100)
     *
     * @example
     * ```typescript
     * // Production usage with global cache
     * const exporter = new UrlFilteredSpanExporter(
     *   new OTLPTraceExporter(),
     *   { rules: ['/api/auth', /\/admin\//] }
     * );
     *
     * // Testing with injected cache
     * const mockCache = new LRUCache<string, boolean>({ max: 10 });
     * const testExporter = new UrlFilteredSpanExporter(
     *   mockExporter,
     *   { rules: ['/test'], cache: mockCache }
     * );
     * ```
     */
    constructor(
      inner: SpanExporter,
      opts?: UrlFilterOptions & { cache?: LRUCache<string, boolean> },
    );

    /**
     * Export spans after filtering based on URL rules and parent filtering.
     *
     * This method:
     * 1. Builds a spanMap for efficient parent lookups within the batch
     * 2. For each span, checks if it or any ancestor was filtered
     * 3. Directly checks the span against URL filter rules
     * 4. Caches filtered span IDs for future child span checks
     * 5. Exports only retained spans to the inner exporter
     *
     * The method implements graceful error handling at two levels:
     * - Per-span errors keep the span (safe default)
     * - Complete filter failure exports all spans (fail-safe)
     *
     * @param spans - Array of spans to filter and export
     * @param resultCallback - Callback invoked with export result from inner exporter
     *
     * @example
     * ```typescript
     * const spans: ReadableSpan[] = getFinishedSpans();
     * exporter.export(spans, (result) => {
     *   if (result.code === ExportResultCode.SUCCESS) {
     *     console.log('Export successful');
     *   } else {
     *     console.error('Export failed:', result.error);
     *   }
     * });
     * ```
     */
    export(
      spans: ReadableSpan[],
      resultCallback: (result: ExportResult) => void,
    ): void;

    /**
     * Shutdown the exporter and release resources.
     *
     * Delegates shutdown to the inner exporter. Does not clear the global
     * filtered spans cache (shared across exporter instances).
     *
     * @returns Promise that resolves when shutdown is complete
     *
     * @example
     * ```typescript
     * await exporter.shutdown();
     * console.log('Exporter shutdown complete');
     * ```
     */
    shutdown(): Promise<void>;
  }

  /**
   * Default export of UrlFilteredSpanExporter class.
   */
  export default UrlFilteredSpanExporter;
}
