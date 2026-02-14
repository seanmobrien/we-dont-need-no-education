import { ChunkingLogExporter } from '@/instrument/chunking/chunking-log-exporter';
class CaptureLogExporter {
    captured = [];
    export(records, resultCallback) {
        this.captured = records;
        resultCallback({});
    }
    async shutdown() {
    }
}
function makeRecord(attrs, body) {
    const rec = {
        attributes: attrs,
        body,
    };
    return rec;
}
describe('ChunkingLogExporter', () => {
    it('adds chunk metadata and splits oversized body and attributes with context id and order', (done) => {
        const inner = new CaptureLogExporter();
        const exporter = new ChunkingLogExporter(inner, { maxChunkChars: 5 });
        const rec = makeRecord({ trace_id: 't', span_id: 's', big: 'abcdefghij' }, 'klmnopqrst');
        exporter.export([rec], () => {
            const captured = inner.captured[0];
            const attrs = captured.attributes;
            expect(attrs['body_chunked']).toBe('true');
            expect(attrs['body_totalChunks']).toBe('2');
            expect(typeof attrs['body_chunkContextId']).toBe('string');
            expect(attrs['body_chunk_1']).toBe('klmno');
            expect(attrs['body_chunk_2']).toBe('pqrst');
            expect(attrs['big_chunked']).toBe('true');
            expect(attrs['big_totalChunks']).toBe('2');
            expect(typeof attrs['big_chunkContextId']).toBe('string');
            expect(attrs['big_chunk_1']).toBe('abcde');
            expect(attrs['big_chunk_2']).toBe('fghij');
            done();
        });
    });
});
//# sourceMappingURL=ChunkingLogExporter.test.js.map