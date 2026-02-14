import { hrTime } from '@opentelemetry/core';
function makeChunkContextId(traceId, spanId, source, key) {
    const seed = `${traceId}:${spanId}:${source}:${key}`;
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
}
export class ChunkingTraceExporter {
    inner;
    maxChunkChars;
    eventName;
    keepOriginalKey;
    constructor(inner, opts = {}) {
        this.inner = inner;
        this.maxChunkChars = opts.maxChunkChars ?? 8000;
        this.eventName = opts.eventName ?? 'chunk';
        this.keepOriginalKey = opts.keepOriginalKey ?? false;
    }
    export(spans, resultCallback) {
        const out = [];
        for (const span of spans) {
            const mSpan = span;
            const sc = span.spanContext();
            const traceId = sc?.traceId ?? 'unknown-trace';
            const spanId = sc?.spanId ?? 'unknown-span';
            const originalEvents = Array.isArray(mSpan.events)
                ? [...mSpan.events]
                : [];
            const chunkEvents = [];
            const newAttrs = this.chunkAttributes((mSpan.attributes ?? {}), chunkEvents, traceId, spanId, 'attributes');
            const newEvents = [];
            for (const ev of originalEvents) {
                const evCopy = { ...ev };
                evCopy.attributes = this.chunkAttributes((ev.attributes ?? {}), chunkEvents, traceId, spanId, ev.name ?? 'event');
                newEvents.push(evCopy);
            }
            if (chunkEvents.length) {
                newEvents.push(...chunkEvents);
            }
            const spanCopy = Object.create(span);
            Object.defineProperty(spanCopy, 'attributes', {
                value: newAttrs,
                enumerable: true,
                configurable: true,
                writable: true,
            });
            Object.defineProperty(spanCopy, 'events', {
                value: newEvents,
                enumerable: true,
                configurable: true,
                writable: true,
            });
            out.push(spanCopy);
        }
        this.inner.export(out, resultCallback);
    }
    chunkAttributes(attrs, chunkEventsOut, traceId, spanId, sourceName) {
        const result = {
            ...attrs,
        };
        for (const [key, rawVal] of Object.entries(attrs)) {
            if (rawVal == null)
                continue;
            let str;
            if (typeof rawVal === 'string') {
                str = rawVal;
            }
            else {
                try {
                    str = JSON.stringify(rawVal);
                }
                catch {
                    str = String(rawVal);
                }
            }
            if (str.length > this.maxChunkChars) {
                const totalChunks = Math.ceil(str.length / this.maxChunkChars);
                const chunkContextId = makeChunkContextId(traceId, spanId, sourceName, key);
                result[`${key}_chunked`] = 'true';
                result[`${key}_totalChunks`] = String(totalChunks);
                if (!this.keepOriginalKey) {
                    delete result[key];
                }
                else {
                    result[key] = str.slice(0, this.maxChunkChars);
                }
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = str.slice(i * this.maxChunkChars, (i + 1) * this.maxChunkChars);
                    chunkEventsOut.push({
                        name: `${sourceName}/${this.eventName}`,
                        time: hrTime(),
                        attributes: {
                            chunkContextId,
                            chunkKey: key,
                            chunkIndex: String(i + 1),
                            totalChunks: String(totalChunks),
                            chunk,
                        },
                    });
                }
            }
        }
        return result;
    }
    async shutdown() {
        await this.inner.shutdown();
    }
    async forceFlush() {
        if (typeof this.inner
            .forceFlush === 'function') {
            await this.inner.forceFlush();
        }
    }
}
export default ChunkingTraceExporter;
//# sourceMappingURL=chunking-trace-exporter.js.map