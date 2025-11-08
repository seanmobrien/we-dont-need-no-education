/**
 * @jest-environment node
 */

import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import { LRUCache } from 'lru-cache';
import { UrlFilteredSpanExporter } from '@/instrument/url-filter/url-filter-trace-exporter';
import type { SpanContext } from '@opentelemetry/api';

describe('UrlFilteredSpanExporter', () => {
  let innerExporter: InMemorySpanExporter;
  let testCache: LRUCache<string, boolean>;

  beforeEach(() => {
    innerExporter = new InMemorySpanExporter();
    testCache = new LRUCache<string, boolean>({ max: 100, ttl: 60000 });
    process.env.LOG_LEVEL_SERVER = 'info';
  });

  afterEach(() => {
    innerExporter.reset();
    testCache.clear();
  });

  describe('Basic Filtering', () => {
    it('should export spans that do not match filter rules', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span = tracer.startSpan('test-span');
      span.setAttribute('http.url', '/api/public');
      span.end();

      const spans = [span] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1);
        expect(exported[0].name).toBe('test-span');
        done();
      });
    });

    it('should filter spans that match string pattern in attributes', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span = tracer.startSpan('auth-span');
      span.setAttribute('http.url', '/api/auth/login');
      span.end();

      const spans = [span] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        done();
      });
    });

    it('should skip filter spans if log level is silly', (done) => {
      process.env.LOG_LEVEL_SERVER = 'silly';
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span = tracer.startSpan('auth-span');
      span.setAttribute('http.url', '/api/auth/login');
      span.end();

      const spans = [span] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1);
        done();
      });
    });

    it('should filter spans that match regex pattern', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: [/\/admin\//],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span = tracer.startSpan('admin-span');
      span.setAttribute('http.url', '/admin/users');
      span.end();

      const spans = [span] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        done();
      });
    });

    it('should filter spans that match pattern in span name', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/secret'],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span = tracer.startSpan('GET /secret/endpoint');
      span.end();

      const spans = [span] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        done();
      });
    });

    it('should handle multiple filter rules', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth', '/health', /\/admin\//],
        cache: testCache,
      });

      const provider = new BasicTracerProvider();
      const tracer = provider.getTracer('test');

      const span1 = tracer.startSpan('span1');
      span1.setAttribute('http.url', '/api/public');
      span1.end();

      const span2 = tracer.startSpan('span2');
      span2.setAttribute('http.url', '/api/auth/login');
      span2.end();

      const span3 = tracer.startSpan('span3');
      span3.setAttribute('http.url', '/health');
      span3.end();

      const span4 = tracer.startSpan('span4');
      span4.setAttribute('http.url', '/admin/users');
      span4.end();

      const spans = [span1, span2, span3, span4] as unknown as ReadableSpan[];
      exporter.export(spans, (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1);
        expect(exported[0].name).toBe('span1');
        done();
      });
    });
  });

  describe('Hierarchical Filtering', () => {
    it('should filter child span when parent is filtered', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      // Create mock spans with parent-child relationship
      const parentSpanContext: SpanContext = {
        traceId: 'trace123',
        spanId: 'parent123',
        traceFlags: 1,
      };

      const childSpanContext: SpanContext = {
        traceId: 'trace123',
        spanId: 'child123',
        traceFlags: 1,
      };

      const parentSpan = {
        name: 'parent-span',
        spanContext: () => parentSpanContext,
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      const childSpan = {
        name: 'child-span',
        spanContext: () => childSpanContext,
        attributes: { 'http.url': '/api/public' },
        parentSpanId: 'parent123',
      } as unknown as ReadableSpan;

      exporter.export([parentSpan, childSpan], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        // Verify both parent and child are cached as filtered
        expect(testCache.has('parent123')).toBe(true);
        expect(testCache.has('child123')).toBe(true);
        done();
      });
    });

    it('should filter grandchild when grandparent is filtered', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const rootSpan = {
        name: 'root',
        spanContext: () => ({
          spanId: 'root1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      const childSpan = {
        name: 'child',
        spanContext: () => ({
          spanId: 'child1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/public' },
        parentSpanId: 'root1',
      } as unknown as ReadableSpan;

      const grandchildSpan = {
        name: 'grandchild',
        spanContext: () => ({
          spanId: 'grandchild1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/data' },
        parentSpanId: 'child1',
      } as unknown as ReadableSpan;

      exporter.export(
        [rootSpan, childSpan, grandchildSpan],
        (result: ExportResult) => {
          const exported = innerExporter.getFinishedSpans();
          expect(exported.length).toBe(0);
          expect(testCache.has('root1')).toBe(true);
          expect(testCache.has('child1')).toBe(true);
          expect(testCache.has('grandchild1')).toBe(true);
          done();
        },
      );
    });

    it('should handle child-before-parent order in array', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const parentSpan = {
        name: 'parent',
        spanContext: () => ({
          spanId: 'parent1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      const childSpan = {
        name: 'child',
        spanContext: () => ({
          spanId: 'child1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/public' },
        parentSpanId: 'parent1',
      } as unknown as ReadableSpan;

      // Child before parent in array
      exporter.export([childSpan, parentSpan], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        done();
      });
    });

    it('should filter across batches using cache', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const parentSpan = {
        name: 'parent',
        spanContext: () => ({
          spanId: 'parent1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      // First batch: export parent
      exporter.export([parentSpan], (result1: ExportResult) => {
        expect(innerExporter.getFinishedSpans().length).toBe(0);
        expect(testCache.has('parent1')).toBe(true);

        // Second batch: export child
        const childSpan = {
          name: 'child',
          spanContext: () => ({
            spanId: 'child1',
            traceId: 'trace1',
            traceFlags: 1,
          }),
          attributes: { 'http.url': '/api/public' },
          parentSpanId: 'parent1',
        } as unknown as ReadableSpan;

        exporter.export([childSpan], (result2: ExportResult) => {
          const exported = innerExporter.getFinishedSpans();
          expect(exported.length).toBe(0);
          expect(testCache.has('child1')).toBe(true);
          done();
        });
      });
    });

    it('should not filter child when parent is not filtered', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const parentSpan = {
        name: 'parent',
        spanContext: () => ({
          spanId: 'parent1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/public' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      const childSpan = {
        name: 'child',
        spanContext: () => ({
          spanId: 'child1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/data' },
        parentSpanId: 'parent1',
      } as unknown as ReadableSpan;

      exporter.export([parentSpan, childSpan], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(2);
        done();
      });
    });

    it('should prevent infinite loops with circular parent references', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      // Create circular reference (malformed but defensive)
      const span1 = {
        name: 'span1',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/public' },
        parentSpanId: 'span2',
      } as unknown as ReadableSpan;

      const span2 = {
        name: 'span2',
        spanContext: () => ({
          spanId: 'span2',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/public' },
        parentSpanId: 'span1',
      } as unknown as ReadableSpan;

      // Should not throw or hang
      exporter.export([span1, span2], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(2); // Both retained
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should keep span if individual filter evaluation fails', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const malformedSpan = {
        name: 'malformed',
        spanContext: () => {
          throw new Error('spanContext error');
        },
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([malformedSpan], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1); // Kept despite error
        done();
      });
    });

    it('should export all spans if filtering completely fails', (done) => {
      // Create exporter with broken cache
      const brokenCache = {
        has: () => {
          throw new Error('Cache error');
        },
        set: () => {},
        get: () => undefined,
        clear: () => {},
        size: 0,
      } as unknown as LRUCache<string, boolean>;

      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: brokenCache,
      });

      const span = {
        name: 'test',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([span], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1); // Fail-safe: export all
        done();
      });
    });

    it('should handle spans with no attributes gracefully', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const span = {
        name: 'test-span',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: {},
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([span], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(1); // No match, kept
        done();
      });
    });

    it('should handle empty span array', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      exporter.export([], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0);
        done();
      });
    });
  });

  describe('Cache Management', () => {
    it('should use injected cache', (done) => {
      const customCache = new LRUCache<string, boolean>({ max: 10 });
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: customCache,
      });

      const span = {
        name: 'test',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([span], (result: ExportResult) => {
        expect(customCache.has('span1')).toBe(true);
        expect(customCache.size).toBe(1);
        done();
      });
    });

    it('should support clearFilterCache method', () => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      testCache.set('test-span-id', true);
      expect(exporter.getFilterCacheSize()).toBe(1);

      exporter.clearFilterCache();
      expect(exporter.getFilterCacheSize()).toBe(0);
    });

    it('should support getFilterCacheSize method', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const span = {
        name: 'test',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: { 'http.url': '/api/auth/login' },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      expect(exporter.getFilterCacheSize()).toBe(0);

      exporter.export([span], (result: ExportResult) => {
        expect(exporter.getFilterCacheSize()).toBe(1);
        done();
      });
    });
  });

  describe('Integration with URL Extraction', () => {
    it('should extract URLs from nested attributes', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const span = {
        name: 'test',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: {
          nested: {
            'http.url': '/api/auth/login',
          },
        },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([span], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0); // Filtered
        done();
      });
    });

    it('should extract URLs from array attributes', (done) => {
      const exporter = new UrlFilteredSpanExporter(innerExporter, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      const span = {
        name: 'test',
        spanContext: () => ({
          spanId: 'span1',
          traceId: 'trace1',
          traceFlags: 1,
        }),
        attributes: {
          urls: ['/api/public', '/api/auth/login'],
        },
        parentSpanId: undefined,
      } as unknown as ReadableSpan;

      exporter.export([span], (result: ExportResult) => {
        const exported = innerExporter.getFinishedSpans();
        expect(exported.length).toBe(0); // Filtered due to second URL
        done();
      });
    });
  });

  describe('Shutdown', () => {
    it('should delegate shutdown to inner exporter', async () => {
      const mockShutdown = jest.fn().mockResolvedValue(undefined);
      const mockInner = {
        export: jest.fn(),
        shutdown: mockShutdown,
      } as unknown as SpanExporter;

      const exporter = new UrlFilteredSpanExporter(mockInner, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      await exporter.shutdown();
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle inner exporter without shutdown method', async () => {
      const mockInner = {
        export: jest.fn(),
      } as unknown as SpanExporter;

      const exporter = new UrlFilteredSpanExporter(mockInner, {
        rules: ['/api/auth'],
        cache: testCache,
      });

      await expect(exporter.shutdown()).resolves.toBeUndefined();
    });
  });
});
