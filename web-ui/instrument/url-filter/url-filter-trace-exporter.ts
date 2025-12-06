import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import type { AttributeValue } from '@opentelemetry/api';
import { log } from '@/lib/logger';
import { UrlFilterEngine } from './url-filter-engine';
import { UrlFilterOptions } from './url-filter-rules';
import { LRUCache } from 'lru-cache';
import { globalRequiredSingleton, globalSingleton } from '@/lib/typescript/singleton-provider';
import { env } from '@/lib/site-util/env';

/*
 * Global LRU cache tracking filtered span IDs.
 * When a span is filtered due to URL match, its spanId is added here.
 * Child spans check this cache to see if any ancestor was filtered.
 */
const getFilteredSpansCache = () => {
  return globalRequiredSingleton<LRUCache<string, boolean>>(
    'url-filtered-spans-cache',
    () =>
      new LRUCache<string, boolean>({
        max: 10000, // Track up to 10k filtered spans
        ttl: 1000 * 60 * 60, // 1 hour TTL
      }),
  );
};

export class UrlFilteredSpanExporter
  extends UrlFilterEngine
  implements SpanExporter {
  readonly #inner: SpanExporter;
  readonly #cache: LRUCache<string, boolean>;

  constructor(
    inner: SpanExporter,
    opts: UrlFilterOptions & { cache?: LRUCache<string, boolean> } = {
      rules: [],
    },
  ) {
    super(opts);
    this.#inner = inner;
    this.#cache = opts.cache ?? getFilteredSpansCache(); // Allow injection
  }

  /*
   * Check if the span or any of its ancestors (up to root) were filtered.
   * Uses the global filtered spans cache to track exclusions across batches.
   * Also checks ancestors within the current batch using the spanMap.
   */
  #isSpanOrAncestorFiltered(
    span: ReadableSpan,
    spanMap: Map<string, ReadableSpan>,
  ): boolean {
    const cache = this.#cache;
    const spanContext = span.spanContext();
    const currentSpanId = spanContext.spanId;

    // Check if this span was previously filtered (from earlier batches)
    if (cache.has(currentSpanId)) {
      return true;
    }

    // Walk up the parent chain checking both cache and current batch
    let parentSpanId = span.parentSpanId;
    const visitedSpans = new Set<string>([currentSpanId]); // Prevent infinite loops

    while (parentSpanId && !visitedSpans.has(parentSpanId)) {
      visitedSpans.add(parentSpanId);

      // Check if parent was filtered in a previous batch
      if (cache.has(parentSpanId)) {
        // Ancestor was filtered, cache this span's ID for future children
        cache.set(currentSpanId, true);
        return true;
      }

      // Check if parent is in the current batch
      const parentSpan = spanMap.get(parentSpanId);
      if (parentSpan) {
        // Check if parent matches filter rules
        const base = parentSpan as unknown as {
          attributes: Record<string, AttributeValue>;
          name?: AttributeValue;
        };
        const parentIsFiltered =
          this.matches(base.name) || this.matches(base.attributes);

        if (parentIsFiltered) {
          // Parent in current batch is filtered
          cache.set(parentSpanId, true);
          cache.set(currentSpanId, true);
          return true;
        }

        // Continue up the chain
        parentSpanId = parentSpan.parentSpanId;
      } else {
        // Parent not in current batch and not in cache - assume not filtered
        break;
      }
    }

    return false;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    // Bypass filtering in silly log level for full traceability
    if (env('LOG_LEVEL_SERVER') === 'silly') {
      this.#inner.export(spans, resultCallback);
      return;
    }
    try {
      const cache = this.#cache;

      // Build a map of spanId -> span for efficient parent lookup within this batch
      const spanMap = new Map<string, ReadableSpan>();
      for (const span of spans) {
        const spanContext = span.spanContext();
        spanMap.set(spanContext.spanId, span);
      }

      const retained: ReadableSpan[] = [];

      for (const span of spans) {
        try {
          // First check if any ancestor was filtered
          if (this.#isSpanOrAncestorFiltered(span, spanMap)) {
            // Ancestor filtered, exclude this span
            continue;
          }

          // Check if this span itself should be filtered
          const base = span as unknown as {
            attributes: Record<string, AttributeValue>;
            name?: AttributeValue;
          };
          const isFiltered =
            this.matches(base.name) || this.matches(base.attributes);

          if (isFiltered) {
            // Mark this span as filtered in the cache
            const spanContext = span.spanContext();
            cache.set(spanContext.spanId, true);
            continue;
          }

          // Span passes all checks, retain it
          retained.push(span);
        } catch (err) {
          // Keep span if individual filter evaluation fails
          log((l) =>
            l.warn('Filter evaluation failed for span', {
              error: err,
              spanId: span.spanContext().spanId, // Add this
            }),
          );
          retained.push(span);
        }
      }

      if (retained.length < spans.length) {
        const dropped = spans.length - retained.length;
        log((l) =>
          l.info('Filtered span records', {
            dropped,
            retained: retained.length,
            total: spans.length,
          }),
        );
      }

      this.#inner.export(retained, resultCallback);
    } catch (err) {
      // Fallback: export all spans if filtering completely fails
      log((l) =>
        l.error('Span filtering failed, exporting all spans', {
          error: err,
          spanCount: spans.length,
        }),
      );
      this.#inner.export(spans, resultCallback);
    }
  }

  async shutdown(): Promise<void> {
    await this.#inner.shutdown?.();
  }

  public clearFilterCache(): void {
    this.#cache.clear();
  }

  public getFilterCacheSize(): number {
    return this.#cache.size;
  }
}

export default UrlFilteredSpanExporter;
