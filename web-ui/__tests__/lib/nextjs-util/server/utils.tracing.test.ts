/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { trace } from '@opentelemetry/api';

describe('wrapRouteRequest tracing', () => {
  test('extracts parent from trace headers and sets attributes', async () => {
    // Create a dummy handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handler = wrapRouteRequest(async (_req: any) => {
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    });

    // Build a minimal Request-like object with W3C trace headers.
    // Use a plain object so we don't depend on global polyfills for Request/Headers.
    const headerEntries: Array<[string, string]> = [
      [
        'traceparent',
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      ],
      ['tracestate', 'rojo=00f067aa0ba902b7'],
      ['authorization', 'Bearer secret'],
      ['cookie', 'a=b'],
      ['x-api-key', 'secret'],
      ['x-custom', 'ok'],
    ];
    const req = {
      url: 'https://example.com/api/thing?id=123',
      method: 'POST',
      headers: new Map(headerEntries), // Iterable<[string, string]>
    } as any;

    // Provide a mock tracer so we can capture startActiveSpan args reliably
    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    } as any;
    const startActiveSpanSpy = jest
      .fn()
      .mockImplementation(
        async (
          name: string,
          options: any,
          parent: any,
          fn: (span: any) => Promise<Response> | Response,
        ) => {
          return await fn(mockSpan);
        },
      );
    const getTracerSpy = jest
      .spyOn(trace, 'getTracer')
      .mockReturnValue({ startActiveSpan: startActiveSpanSpy } as any);

    const res = await handler(req as any);
    expect(res.status).toBe(201);

    // Verify startActiveSpan was called with expected attributes
    expect(startActiveSpanSpy).toHaveBeenCalled();
    const call = startActiveSpanSpy.mock.calls[0];
    const spanName = call[0];
    const options = call[1];
    const parentContext = call[2];
    expect(spanName).toBe('route.request');
    expect(options?.attributes?.['request.path']).toBe('/api/thing');
    expect(options?.attributes?.['request.query']).toBe('id=123');
    expect(options?.attributes?.['http.method']).toBe('POST');
    expect(options?.attributes?.['route.params']).toBeDefined();
    expect(typeof options?.attributes?.['request.headers']).toBe('string');
    const headers = JSON.parse(options?.attributes?.['request.headers']);
    // Sensitive headers should be redacted
    expect(headers.authorization).toBe('***');
    expect(headers.cookie).toBe('***');
    expect(headers['x-api-key']).toBe('***');
    // Non-sensitive preserved
    expect(headers['x-custom']).toBe('ok');

    // Ensure a context object is present (extracted from headers)
    expect(parentContext).toBeDefined();
    getTracerSpy.mockRestore();
  });

  test('handles NextRequest.nextUrl path/query extraction and header redaction', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handler = wrapRouteRequest(async (_req: any) => {
      return new Response(JSON.stringify({ ok: true }), { status: 202 });
    });

    // Build a NextRequest-like object with nextUrl and iterable headers
    const headerEntries: Array<[string, string]> = [
      [
        'traceparent',
        '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01',
      ],
      ['tracestate', 'foo=bar'],
      ['authorization', 'Bearer topsecret'],
      ['cookie', 'sid=xyz'],
      ['x-api-key', 'supersecret'],
      ['x-non-sensitive', 'value'],
    ];
    const req = {
      nextUrl: new URL('https://example.com/app/route?x=1&y=2'),
      method: 'GET',
      headers: new Map(headerEntries),
    } as any;

    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    } as any;
    const startActiveSpanSpy = jest
      .fn()
      .mockImplementation(
        async (
          name: string,
          options: any,
          parent: any,
          fn: (span: any) => Promise<Response> | Response,
        ) => {
          return await fn(mockSpan);
        },
      );
    const getTracerSpy = jest
      .spyOn(trace, 'getTracer')
      .mockReturnValue({ startActiveSpan: startActiveSpanSpy } as any);

    const res = await handler(req as any);
    expect(res.status).toBe(202);

    expect(startActiveSpanSpy).toHaveBeenCalled();
    const call = startActiveSpanSpy.mock.calls[0];
    const spanName = call[0];
    const options = call[1];
    const parentContext = call[2];
    expect(spanName).toBe('route.request');
    expect(options?.attributes?.['request.path']).toBe('/app/route');
    expect(options?.attributes?.['request.query']).toBe('x=1&y=2');
    expect(options?.attributes?.['http.method']).toBe('GET');
    expect(typeof options?.attributes?.['route.params']).toBe('string');
    const headers = JSON.parse(options?.attributes?.['request.headers']);
    expect(headers.authorization).toBe('***');
    expect(headers.cookie).toBe('***');
    expect(headers['x-api-key']).toBe('***');
    expect(headers['x-non-sensitive']).toBe('value');
    expect(parentContext).toBeDefined();

    getTracerSpy.mockRestore();
  });
});
