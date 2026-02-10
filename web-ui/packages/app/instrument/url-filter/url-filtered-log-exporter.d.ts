/**
 * Type declarations for URL-filtered log record exporter.
 *
 * This module provides a LogRecordExporter decorator that filters log records
 * containing URLs matching configured rules. Used to remove sensitive information
 * such as PII from logs and improve signal-to-noise ratio by excluding health
 * checks and other unimportant but chatty URLs.
 *
 * @module instrument/url-filter/url-filtered-log-exporter
 */

declare module '@/instrument/url-filter/url-filtered-log-exporter' {
  import type {
    ReadableLogRecord,
    LogRecordExporter,
  } from '@opentelemetry/sdk-logs';
  import type { ExportResult } from '@opentelemetry/core';
  import type { UrlFilterOptions } from '@/instrument/url-filter/url-filter-rules';
  import { UrlFilterEngine } from '@/instrument/url-filter/url-filter-engine';

  /**
   * LogRecordExporter decorator that filters log records containing URLs matching rules.
   *
   * Inspects log record bodies and attributes for URLs, filtering out records that match
   * configured patterns. Unlike the span exporter, this does not implement hierarchical
   * filtering since logs don't have parent-child relationships.
   *
   * Key features:
   * - **Body and attribute inspection**: Checks both log body and attributes for URLs
   * - **Flexible pattern matching**: Supports string, RegExp, and rule objects
   * - **Graceful degradation**: Errors keep logs rather than dropping them
   * - **Performance**: Leverages LRU cache from UrlFilterEngine for URL extraction
   * - **Observability**: Logs filter statistics (dropped/retained counts)
   *
   * Common use cases:
   * - Filter authentication/authorization logs containing sensitive tokens
   * - Remove health check logs to reduce noise
   * - Exclude admin panel logs from general logging
   * - Filter internal API calls from production logs
   *
   * @extends {UrlFilterEngine}
   * @implements {LogRecordExporter}
   *
   * @example
   * ```typescript
   * import { ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
   * import { UrlFilteredLogExporter } from '@/instrument/url-filter/url-filtered-log-exporter';
   *
   * // Basic usage
   * const innerExporter = new ConsoleLogRecordExporter();
   * const filteredExporter = new UrlFilteredLogExporter(innerExporter, {
   *   rules: [
   *     '/api/auth',           // Filter auth endpoints
   *     '/health',             // Filter health checks
   *     /\/admin\//,           // Filter admin routes (RegExp)
   *     '/metrics',            // Filter metrics endpoints
   *     { pattern: '/internal' } // UrlFilterRuleOptions
   *   ]
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Production configuration filtering PII and noise
   * const exporter = new UrlFilteredLogExporter(
   *   new OTLPLogRecordExporter(),
   *   {
   *     rules: [
   *       // Authentication endpoints (potential PII)
   *       '/api/auth/login',
   *       '/api/auth/register',
   *       '/api/auth/reset-password',
   *
   *       // Health and monitoring (noise)
   *       '/health',
   *       '/ready',
   *       '/metrics',
   *
   *       // Admin panel (sensitive)
   *       /\/admin\//,
   *
   *       // Internal APIs
   *       '/internal/status'
   *     ]
   *   }
   * );
   * ```
   */
  export class UrlFilteredLogExporter
    extends UrlFilterEngine
    implements LogRecordExporter
  {
    /**
     * Create a new URL-filtered log record exporter.
     *
     * @param inner - The underlying LogRecordExporter to wrap (e.g., ConsoleLogRecordExporter)
     * @param opts - Configuration options
     * @param opts.rules - Array of URL filter rules (strings, RegExps, or rule objects)
     * @param opts.urlKeys - Optional custom URL attribute keys to check (defaults to common HTTP keys)
     * @param opts.maxCacheSize - Maximum URL extraction cache size (defaults to 100)
     *
     * @example
     * ```typescript
     * // Production usage
     * const exporter = new UrlFilteredLogExporter(
     *   new OTLPLogRecordExporter(),
     *   {
     *     rules: ['/api/auth', '/health', /\/admin\//],
     *     maxCacheSize: 200 // Increase cache for high-throughput
     *   }
     * );
     *
     * // Development usage with console output
     * const devExporter = new UrlFilteredLogExporter(
     *   new ConsoleLogRecordExporter(),
     *   { rules: ['/health'] } // Only filter health checks
     * );
     * ```
     */
    constructor(inner: LogRecordExporter, opts?: UrlFilterOptions);

    /**
     * Export log records after filtering based on URL rules.
     *
     * This method:
     * 1. Filters each log record by checking body and attributes for URLs
     * 2. Excludes records where any extracted URL matches filter rules
     * 3. Logs statistics about filtered records (dropped/retained counts)
     * 4. Exports retained records to the inner exporter
     *
     * The method implements graceful error handling at two levels:
     * - Per-record errors keep the record (safe default - no data loss)
     * - Complete filter failure exports all records (fail-safe)
     *
     * @param records - Array of log records to filter and export
     * @param resultCallback - Callback invoked with export result from inner exporter
     *
     * @example
     * ```typescript
     * const records: ReadableLogRecord[] = getLogRecords();
     * exporter.export(records, (result) => {
     *   if (result.code === ExportResultCode.SUCCESS) {
     *     console.log('Logs exported successfully');
     *   } else {
     *     console.error('Export failed:', result.error);
     *   }
     * });
     * ```
     *
     * @example
     * ```typescript
     * // Example log record that would be filtered
     * const record: ReadableLogRecord = {
     *   body: 'Request to /api/auth/login',
     *   attributes: {
     *     'http.url': '/api/auth/login',
     *     'http.method': 'POST'
     *   },
     *   // ... other fields
     * };
     *
     * // This record would be excluded if '/api/auth' is a filter rule
     * exporter.export([record], callback);
     * ```
     */
    export(
      records: ReadableLogRecord[],
      resultCallback: (result: ExportResult) => void,
    ): void;

    /**
     * Shutdown the exporter and release resources.
     *
     * Delegates shutdown to the inner exporter. The URL extraction cache
     * (inherited from UrlFilterEngine) remains in memory but is cleared
     * via version-based invalidation.
     *
     * @returns Promise that resolves when shutdown is complete
     *
     * @example
     * ```typescript
     * await exporter.shutdown();
     * console.log('Log exporter shutdown complete');
     * ```
     */
    shutdown(): Promise<void>;
  }

  /**
   * Default export of UrlFilteredLogExporter class.
   */
  export default UrlFilteredLogExporter;
}
