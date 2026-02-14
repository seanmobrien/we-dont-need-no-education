import { log } from '@compliance-theater/logger';
import { UrlFilterEngine } from './url-filter-engine';
import { LRUCache } from 'lru-cache';
import { globalRequiredSingleton, } from '@compliance-theater/typescript/singleton-provider';
import { env } from '@compliance-theater/env';
const getFilteredSpansCache = () => {
    return globalRequiredSingleton('url-filtered-spans-cache', () => new LRUCache({
        max: 10000,
        ttl: 1000 * 60 * 60,
    }));
};
export class UrlFilteredSpanExporter extends UrlFilterEngine {
    #inner;
    #cache;
    constructor(inner, opts = {
        rules: [],
    }) {
        super(opts);
        this.#inner = inner;
        this.#cache = opts.cache ?? getFilteredSpansCache();
    }
    #isSpanOrAncestorFiltered(span, spanMap) {
        const cache = this.#cache;
        const spanContext = span.spanContext();
        const currentSpanId = spanContext.spanId;
        if (cache.has(currentSpanId)) {
            return true;
        }
        let parentSpanId = span.parentSpanId;
        const visitedSpans = new Set([currentSpanId]);
        while (parentSpanId && !visitedSpans.has(parentSpanId)) {
            visitedSpans.add(parentSpanId);
            if (cache.has(parentSpanId)) {
                cache.set(currentSpanId, true);
                return true;
            }
            const parentSpan = spanMap.get(parentSpanId);
            if (parentSpan) {
                const base = parentSpan;
                const parentIsFiltered = this.matches(base.name) || this.matches(base.attributes);
                if (parentIsFiltered) {
                    cache.set(parentSpanId, true);
                    cache.set(currentSpanId, true);
                    return true;
                }
                parentSpanId = parentSpan.parentSpanId;
            }
            else {
                break;
            }
        }
        return false;
    }
    export(spans, resultCallback) {
        if (env('LOG_LEVEL_SERVER') === 'silly') {
            this.#inner.export(spans, resultCallback);
            return;
        }
        try {
            const cache = this.#cache;
            const spanMap = new Map();
            for (const span of spans) {
                const spanContext = span.spanContext();
                spanMap.set(spanContext.spanId, span);
            }
            const retained = [];
            for (const span of spans) {
                try {
                    if (this.#isSpanOrAncestorFiltered(span, spanMap)) {
                        continue;
                    }
                    const base = span;
                    const isFiltered = this.matches(base.name) || this.matches(base.attributes);
                    if (isFiltered) {
                        const spanContext = span.spanContext();
                        cache.set(spanContext.spanId, true);
                        continue;
                    }
                    retained.push(span);
                }
                catch (err) {
                    log((l) => l.warn('Filter evaluation failed for span', {
                        error: err,
                        spanId: span.spanContext().spanId,
                    }));
                    retained.push(span);
                }
            }
            if (retained.length < spans.length) {
                const dropped = spans.length - retained.length;
                log((l) => l.info('Filtered span records', {
                    dropped,
                    retained: retained.length,
                    total: spans.length,
                }));
            }
            this.#inner.export(retained, resultCallback);
        }
        catch (err) {
            log((l) => l.error('Span filtering failed, exporting all spans', {
                error: err,
                spanCount: spans.length,
            }));
            this.#inner.export(spans, resultCallback);
        }
    }
    async shutdown() {
        await this.#inner.shutdown?.();
    }
    clearFilterCache() {
        this.#cache.clear();
    }
    getFilterCacheSize() {
        return this.#cache.size;
    }
}
export default UrlFilteredSpanExporter;
//# sourceMappingURL=url-filter-trace-exporter.js.map