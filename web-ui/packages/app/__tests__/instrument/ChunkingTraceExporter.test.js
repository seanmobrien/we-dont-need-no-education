jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ChunkingTraceExporter } from '@/instrument/chunking/chunking-trace-exporter';
describe('ChunkingTraceExporter', () => {
    it('splits oversized attributes into chunk events with context id and order', () => {
        const inner = new InMemorySpanExporter();
        const exporter = new ChunkingTraceExporter(inner, {
            maxChunkChars: 10,
            keepOriginalKey: false,
        });
        const provider = new BasicTracerProvider();
        const processor = new SimpleSpanProcessor(exporter);
        provider.addSpanProcessor(processor);
        provider.register();
        const tracer = provider.getTracer('test');
        const span = tracer.startSpan('test-span');
        span.setAttribute('big', 'abcdefghijk');
        span.addEvent('evt', { tiny: 'ok' });
        span.end();
        const spans = inner.getFinishedSpans();
        expect(spans.length).toBe(1);
        const s = spans[0];
        expect(s.attributes['big_chunked']).toBe('true');
        expect(s.attributes['big_totalChunks']).toBe('2');
        expect(s.attributes['big']).toBeUndefined();
        const chunkEvents = s.events.filter((e) => e.name === 'attributes/chunk');
        expect(chunkEvents.length).toBe(2);
        const [c1, c2] = chunkEvents;
        expect(c1.attributes?.chunkIndex).toBe('1');
        expect(c2.attributes?.chunkIndex).toBe('2');
        expect(c1.attributes?.chunkContextId).toBe(c2.attributes?.chunkContextId);
    });
});
//# sourceMappingURL=ChunkingTraceExporter.test.js.map