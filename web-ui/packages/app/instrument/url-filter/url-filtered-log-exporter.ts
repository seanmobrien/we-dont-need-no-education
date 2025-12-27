/**
 * UrlFilteredLogExporter.ts
 *
 * A LogRecordExporter decorator that inspects log bodies and attributes, filtering
 * out any entries that match a configured set of URL patterns.  This is useful for
 * removing sensitive information such as PII from logs before they are exported,
 * as well as improving the signal-to-noise ratio by excluding requests to health
 * check endpoints or other known unimportant (but chatty) URLs.
 */
import type {
  ReadableLogRecord,
  LogRecordExporter,
} from '@opentelemetry/sdk-logs';
import type { AnyValue, AnyValueMap } from '@opentelemetry/api-logs';
import type { ExportResult } from '@opentelemetry/core';
import { UrlFilterEngine } from './url-filter-engine';
import { UrlFilterOptions } from './url-filter-rules';
import { log } from '@repo/lib-logger';

export class UrlFilteredLogExporter
  extends UrlFilterEngine
  implements LogRecordExporter
{
  readonly #inner: LogRecordExporter;

  constructor(
    inner: LogRecordExporter,
    opts: UrlFilterOptions = { rules: [] },
  ) {
    super(opts);
    this.#inner = inner;
  }

  export(
    records: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    try {
      const retained: ReadableLogRecord[] = records.filter((rec) => {
        try {
          const base = rec as unknown as {
            attributes: AnyValueMap;
            body?: AnyValue;
          };
          return !(this.matches(base.body) || this.matches(base.attributes));
        } catch (err) {
          // Keep record if individual filter fails
          log((l) =>
            l.warn('Filter evaluation failed for record', { error: err }),
          );
          return true;
        }
      });

      if (retained.length < records.length) {
        const dropped = records.length - retained.length;
        log((l) =>
          l.info('Filtered log records', {
            dropped,
            retained: retained.length,
          }),
        );
      }

      this.#inner.export(retained, resultCallback);
    } catch (err) {
      // Fallback: export all records if filtering completely fails
      log((l) =>
        l.error('Log filtering failed, exporting all records', {
          error: err,
          recordCount: records.length,
        }),
      );
      this.#inner.export(records, resultCallback);
    }
  }

  async shutdown(): Promise<void> {
    await this.#inner.shutdown?.();
  }
}

export default UrlFilteredLogExporter;
