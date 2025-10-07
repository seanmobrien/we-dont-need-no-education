import { ChunkingLogExporter } from '/instrument/chunking/ChunkingLogExporter';
import type {
  ReadableLogRecord,
  LogRecordExporter,
} from '@opentelemetry/sdk-logs';
import type { ExportResult } from '@opentelemetry/core';
import type { AnyValueMap } from '@opentelemetry/api-logs';

class CaptureLogExporter implements LogRecordExporter {
  public captured: ReadableLogRecord[] = [];
  export(
    records: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    this.captured = records;
    resultCallback({} as ExportResult);
  }
  async shutdown(): Promise<void> {
    // no-op
  }
}

function makeRecord(attrs: AnyValueMap, body?: string): ReadableLogRecord {
  // Provide only the fields the wrapper touches; cast through unknown to satisfy type
  const rec = {
    attributes: attrs,
    body,
  } as unknown as ReadableLogRecord;
  return rec;
}

describe('ChunkingLogExporter', () => {
  it('adds chunk metadata and splits oversized body and attributes with context id and order', (done) => {
    const inner = new CaptureLogExporter();
    const exporter = new ChunkingLogExporter(inner, { maxChunkChars: 5 });

    const rec = makeRecord(
      { trace_id: 't', span_id: 's', big: 'abcdefghij' },
      'klmnopqrst',
    );
    exporter.export([rec], () => {
      const captured = inner.captured[0] as unknown as {
        attributes: Record<string, unknown>;
      };
      const attrs = captured.attributes;
      // body should be chunked into two 5-char chunks
      expect(attrs['body_chunked']).toBe('true');
      expect(attrs['body_totalChunks']).toBe('2');
      expect(typeof attrs['body_chunkContextId']).toBe('string');
      expect(attrs['body_chunk_1']).toBe('klmno');
      expect(attrs['body_chunk_2']).toBe('pqrst');

      // attribute 'big' chunked similarly
      expect(attrs['big_chunked']).toBe('true');
      expect(attrs['big_totalChunks']).toBe('2');
      expect(typeof attrs['big_chunkContextId']).toBe('string');
      expect(attrs['big_chunk_1']).toBe('abcde');
      expect(attrs['big_chunk_2']).toBe('fghij');
      done();
    });
  });
});
