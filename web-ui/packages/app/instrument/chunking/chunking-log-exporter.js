import { LoggedError } from '@compliance-theater/logger';
function makeChunkContextId(traceId, spanId, key) {
    const seed = `${traceId ?? 'no-trace'}:${spanId ?? 'no-span'}:${key}`;
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash +=
            (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
}
export class ChunkingLogExporter {
    inner;
    maxChunkChars;
    keepOriginalKey;
    constructor(inner, opts = {}) {
        this.inner = inner;
        this.maxChunkChars = opts.maxChunkChars ?? 8000;
        this.keepOriginalKey = opts.keepOriginalKey ?? false;
    }
    export(records, resultCallback) {
        for (const rec of records) {
            const base = rec;
            const attrs = (base.attributes ?? {});
            const traceId = attrs['trace_id'];
            const spanId = attrs['span_id'];
            if (typeof base.body === 'string' &&
                base.body.length > this.maxChunkChars) {
                const s = base.body;
                const totalChunks = Math.ceil(s.length / this.maxChunkChars);
                const ctxId = makeChunkContextId(traceId, spanId, 'body');
                attrs['body_chunked'] = 'true';
                attrs['body_totalChunks'] = String(totalChunks);
                attrs['body_chunkContextId'] = ctxId;
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = s.slice(i * this.maxChunkChars, (i + 1) * this.maxChunkChars);
                    attrs[`body_chunk_${i + 1}`] = chunk;
                }
                try {
                    base.body = this.keepOriginalKey
                        ? s.slice(0, this.maxChunkChars)
                        : '[chunked]';
                }
                catch (innerError) {
                    console.warn(`Unable to update log record body - ${LoggedError.buildMessage(innerError)}.  Full record: ${base.body ?? '<null>'}`);
                }
            }
            const originalEntries = Object.entries(attrs);
            const isChunkMetaKey = (k) => k === 'body_chunked' ||
                k === 'body_totalChunks' ||
                k === 'body_chunkContextId' ||
                k.startsWith('body_chunk_') ||
                k.endsWith('_chunked') ||
                k.endsWith('_totalChunks') ||
                k.endsWith('_chunkContextId') ||
                /_chunk_\d+$/.test(k);
            for (const [key, rawVal] of originalEntries) {
                if (isChunkMetaKey(key))
                    continue;
                if (rawVal == null)
                    continue;
                if (typeof key !== 'string')
                    continue;
                let s;
                if (typeof rawVal === 'string')
                    s = rawVal;
                else {
                    try {
                        s = JSON.stringify(rawVal);
                    }
                    catch {
                        s = String(rawVal);
                    }
                }
                if (s.length > this.maxChunkChars) {
                    const totalChunks = Math.ceil(s.length / this.maxChunkChars);
                    const ctxId = makeChunkContextId(traceId, spanId, key);
                    attrs[`${key}_chunked`] = 'true';
                    attrs[`${key}_totalChunks`] = String(totalChunks);
                    attrs[`${key}_chunkContextId`] = ctxId;
                    for (let i = 0; i < totalChunks; i++) {
                        const chunk = s.slice(i * this.maxChunkChars, (i + 1) * this.maxChunkChars);
                        attrs[`${key}_chunk_${i + 1}`] = chunk;
                    }
                    if (!this.keepOriginalKey) {
                        delete attrs[key];
                    }
                    else {
                        attrs[key] = s.slice(0, this.maxChunkChars);
                    }
                }
            }
            base.attributes = attrs;
        }
        this.inner.export(records, resultCallback);
    }
    async shutdown() {
        await this.inner.shutdown?.();
    }
}
export default ChunkingLogExporter;
//# sourceMappingURL=chunking-log-exporter.js.map