/**
 * ChunkingLogExporter
 *
 * A LogRecordExporter decorator that inspects log bodies and attributes, splitting
 * oversized string values into multiple synthetic log records to avoid exceeding
 * downstream property limits. Each chunk carries a chunkContextId and ordering
 * information to allow reassembly on the consumer side.
 */
import type {
  ReadableLogRecord,
  LogRecordExporter,
} from '@opentelemetry/sdk-logs';
import type { AnyValueMap } from '@opentelemetry/api-logs';
import type { ExportResult } from '@opentelemetry/core';
import { LoggedError } from '@/lib/react-util';
import { log } from '@repo/lib-logger';

export type LogChunkingOptions = {
  /** Maximum characters allowed in any single property or body before chunking */
  maxChunkChars?: number;
  /** If true, keep a truncated preview of original value */
  keepOriginalKey?: boolean;
};

function makeChunkContextId(
  traceId: string | undefined,
  spanId: string | undefined,
  key: string,
): string {
  const seed = `${traceId ?? 'no-trace'}:${spanId ?? 'no-span'}:${key}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

export class ChunkingLogExporter implements LogRecordExporter {
  private readonly inner: LogRecordExporter;
  private readonly maxChunkChars: number;
  private readonly keepOriginalKey: boolean;

  constructor(inner: LogRecordExporter, opts: LogChunkingOptions = {}) {
    this.inner = inner;
    this.maxChunkChars = opts.maxChunkChars ?? 8000;
    this.keepOriginalKey = opts.keepOriginalKey ?? false;
  }

  export(
    records: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    for (const rec of records) {
      const base = rec as unknown as {
        attributes: AnyValueMap;
        body?: unknown;
      };
      const attrs = (base.attributes ?? {}) as Record<string, unknown>;
      const traceId = attrs['trace_id'] as string | undefined;
      const spanId = attrs['span_id'] as string | undefined;

      // Body chunking (add chunk_* properties on attributes)
      if (
        typeof base.body === 'string' &&
        base.body.length > this.maxChunkChars
      ) {
        const s = base.body;
        const totalChunks = Math.ceil(s.length / this.maxChunkChars);
        const ctxId = makeChunkContextId(traceId, spanId, 'body');
        attrs['body_chunked'] = 'true';
        attrs['body_totalChunks'] = String(totalChunks);
        attrs['body_chunkContextId'] = ctxId;
        for (let i = 0; i < totalChunks; i++) {
          const chunk = s.slice(
            i * this.maxChunkChars,
            (i + 1) * this.maxChunkChars,
          );
          attrs[`body_chunk_${i + 1}`] = chunk;
        }
        // NOTE: When the record has already been emitted the body property throws an error,
        // which we believe winds up crashing the child process.  Handle this defensively.
        try {
          base.body = this.keepOriginalKey
            ? s.slice(0, this.maxChunkChars)
            : '[chunked]';
        } catch (innerError) {
          // Unable to update body - exporting this record will likely fail / be skipped, so write details out to console
          // so that it's not completely invisible.
          // IMPORTANT: This direct use of console.warn is an intentional and necessary exception to the project logging standard,
          // because using the log() utility here would cause infinite recursion (log() would trigger this same code path).
          // See CodeQL rule: "Do not use console.warn directly; use log() unless it would cause recursion."
          console.warn(`Unable to update log record body - ${LoggedError.buildMessage(innerError)}.  Full record: ${base.body ?? '<null>'}`)
        }
      }

      // Prepare a snapshot of original entries to avoid iterating over keys we add below
      const originalEntries = Object.entries(attrs);
      const isChunkMetaKey = (k: string) =>
        k === 'body_chunked' ||
        k === 'body_totalChunks' ||
        k === 'body_chunkContextId' ||
        k.startsWith('body_chunk_') ||
        k.endsWith('_chunked') ||
        k.endsWith('_totalChunks') ||
        k.endsWith('_chunkContextId') ||
        /_chunk_\d+$/.test(k);

      // Attribute chunking (split into key_chunk_* properties and add metadata)
      for (const [key, rawVal] of originalEntries) {
        if (isChunkMetaKey(key)) continue; // don't process metadata keys we add
        if (rawVal == null) continue;
        if (typeof key !== 'string') continue;
        let s: string;
        if (typeof rawVal === 'string') s = rawVal;
        else {
          try {
            s = JSON.stringify(rawVal);
          } catch {
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
            const chunk = s.slice(
              i * this.maxChunkChars,
              (i + 1) * this.maxChunkChars,
            );
            attrs[`${key}_chunk_${i + 1}`] = chunk;
          }
          if (!this.keepOriginalKey) {
            delete (attrs as Record<string, unknown>)[key];
          } else {
            (attrs as Record<string, unknown>)[key] = s.slice(
              0,
              this.maxChunkChars,
            );
          }
        }
      }
      // write back mutated attributes
      (base.attributes as unknown as Record<string, unknown>) = attrs;
    }
    this.inner.export(records, resultCallback);
  }

  async shutdown(): Promise<void> {
    await this.inner.shutdown?.();
  }
}

export default ChunkingLogExporter;
