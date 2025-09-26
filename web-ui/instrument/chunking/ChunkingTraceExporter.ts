/**
 * ChunkingTraceExporter
 *
 * A SpanExporter decorator that inspects all span attributes and event attributes
 * and splits any oversized string values into multiple chunk events so they can
 * be safely ingested by downstream exporters (e.g., Azure Monitor / App Insights)
 * that enforce strict per-property size limits.
 *
 * The exporter augments the original span/event attributes with metadata:
 * - `${key}_chunked` = 'true' when chunking occurs
 * - `${key}_totalChunks` = total number of chunks
 *
 * For each chunk, an event is appended to the span with attributes:
 * - chunkContextId: stable identifier tying all chunks from the same source together
 * - chunkKey: the original attribute key
 * - chunkIndex: 1-based index of the chunk
 * - totalChunks: total number of chunks
 * - chunk: the chunk text
 *
 * Chunk context id is derived from traceId/spanId/source/key to enable reassembly
 * on the downstream side.
 */
import type {
  ReadableSpan,
  SpanExporter,
  TimedEvent,
} from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import { hrTime } from '@opentelemetry/core';
import type { Attributes } from '@opentelemetry/api';

export type ChunkingTraceOptions = {
  /** Maximum characters allowed in any single attribute value before chunking */
  maxChunkChars?: number;
  /** Name suffix for generated chunk events */
  eventName?: string;
  /** If true, keep a truncated preview of original value under the same key */
  keepOriginalKey?: boolean;
};

/**
 * Compute a compact, stable chunkContextId from span context and source/key.
 * Uses a small, non-cryptographic hash to avoid heavy dependencies.
 */
function makeChunkContextId(
  traceId: string,
  spanId: string,
  source: string,
  key: string,
): string {
  const seed = `${traceId}:${spanId}:${source}:${key}`;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export class ChunkingTraceExporter implements SpanExporter {
  private readonly inner: SpanExporter;
  private readonly maxChunkChars: number;
  private readonly eventName: string;
  private readonly keepOriginalKey: boolean;

  constructor(inner: SpanExporter, opts: ChunkingTraceOptions = {}) {
    this.inner = inner;
    this.maxChunkChars = opts.maxChunkChars ?? 8000;
    this.eventName = opts.eventName ?? 'chunk';
    this.keepOriginalKey = opts.keepOriginalKey ?? false;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    const out: ReadableSpan[] = [];
    for (const span of spans) {
      const mSpan = span as unknown as Mutable<ReadableSpan> & {
        events?: TimedEvent[];
      };
      const sc = span.spanContext();
      const traceId: string = sc?.traceId ?? 'unknown-trace';
      const spanId: string = sc?.spanId ?? 'unknown-span';

      // Snapshot original events and collect chunk events separately to avoid mutation during iteration
      const originalEvents: TimedEvent[] = Array.isArray(mSpan.events)
        ? [...mSpan.events]
        : [];
      const chunkEvents: TimedEvent[] = [];

      // Clone attributes and events to avoid mutating original references
      const newAttrs = this.chunkAttributes(
        (mSpan.attributes ?? {}) as Attributes,
        chunkEvents,
        traceId,
        spanId,
        'attributes',
      );

      const newEvents: TimedEvent[] = [];
      for (const ev of originalEvents) {
        const evCopy: Mutable<TimedEvent> = { ...ev } as Mutable<TimedEvent>;
        evCopy.attributes = this.chunkAttributes(
          (ev.attributes ?? {}) as Attributes,
          chunkEvents,
          traceId,
          spanId,
          ev.name ?? 'event',
        ) as Attributes;
        newEvents.push(evCopy);
      }

      if (chunkEvents.length) {
        newEvents.push(...chunkEvents);
      }

      // Preserve instance methods and internals by using the original span as prototype
      const spanCopy: Mutable<ReadableSpan> = Object.create(
        span,
      ) as Mutable<ReadableSpan>;
      Object.defineProperty(spanCopy, 'attributes', {
        value: newAttrs as Attributes,
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
      out.push(spanCopy as ReadableSpan);
    }
    this.inner.export(out, resultCallback);
  }

  private chunkAttributes(
    attrs: Attributes,
    chunkEventsOut: TimedEvent[],
    traceId: string,
    spanId: string,
    sourceName: string,
  ): Attributes {
    const result: Record<string, unknown> = {
      ...(attrs as Record<string, unknown>),
    };
    for (const [key, rawVal] of Object.entries(attrs)) {
      if (rawVal == null) continue;
      let str: string;
      if (typeof rawVal === 'string') {
        str = rawVal;
      } else {
        try {
          str = JSON.stringify(rawVal);
        } catch {
          str = String(rawVal);
        }
      }
      if (str.length > this.maxChunkChars) {
        const totalChunks = Math.ceil(str.length / this.maxChunkChars);
        const chunkContextId = makeChunkContextId(
          traceId,
          spanId,
          sourceName,
          key,
        );
        result[`${key}_chunked`] = 'true';
        result[`${key}_totalChunks`] = String(totalChunks);
        if (!this.keepOriginalKey) {
          delete result[key];
        } else {
          result[key] = str.slice(0, this.maxChunkChars);
        }
        for (let i = 0; i < totalChunks; i++) {
          const chunk = str.slice(
            i * this.maxChunkChars,
            (i + 1) * this.maxChunkChars,
          );
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
    return result as Attributes;
  }

  async shutdown(): Promise<void> {
    await this.inner.shutdown();
  }

  async forceFlush(): Promise<void> {
    if (
      typeof (this.inner as unknown as { forceFlush?: () => Promise<void> })
        .forceFlush === 'function'
    ) {
      await (
        this.inner as unknown as { forceFlush: () => Promise<void> }
      ).forceFlush();
    }
  }
}

export default ChunkingTraceExporter;
