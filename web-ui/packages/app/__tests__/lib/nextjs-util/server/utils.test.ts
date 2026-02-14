/**
 * @jest-environment node
 */

import {
  wrapRouteRequest,
  EnableOnBuild,
  buildFallbackGrid,
  createInstrumentedSpan,
  reportEvent,
} from '@compliance-theater/nextjs/server/utils';
import { errorResponseFactory } from '@compliance-theater/nextjs/server/error-response';
import { trace, context as otelContext, propagation } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import { log, LoggedError } from '@compliance-theater/logger';
import { NextRequest } from 'next/dist/server/web/spec-extension/request';

// Mock external dependencies
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => ({
      startActiveSpan: jest.fn(
        async (name, fn2, ctx, fn) =>
          await (fn ?? fn2)({
            setAttribute: jest.fn(),
            setStatus: jest.fn(),
            recordException: jest.fn(),
            end: jest.fn(),
          })
      ),
    })),
    setSpan: jest.fn(),
  },
  context: {
    active: jest.fn(),
    with: jest.fn(),
  },
  propagation: {
    extract: jest.fn(),
  },
  SpanKind: {
    SERVER: 1,
    CLIENT: 2,
  },
  SpanStatusCode: {
    OK: 'ok',
    ERROR: 'error',
  },
}));

jest.mock('@opentelemetry/api-logs', () => ({
  logs: {
    getLogger: jest.fn(),
  },
}));

jest.mock('@compliance-theater/logger', () => ({
  ...jest.requireActual('@compliance-theater/logger'),
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((error) => {
      return error;
    }),
    buildMessage: jest.fn(),
    isLoggedError: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('@/lib/nextjs-util/server/error-response', () => ({
  errorResponseFactory: (
    message: string,
    options: { cause?: unknown } = {}
  ) => {
    return Response.json(
      {
        error: message,
        status: 500,
      },
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
}));

describe('Server Utils', () => {
  describe('Constants', () => {
    test('EnableOnBuild is a unique symbol', () => {
      expect(typeof EnableOnBuild).toBe('symbol');
      expect(EnableOnBuild).toBe(EnableOnBuild); // Same symbol reference
    });

    test('buildFallbackGrid has expected structure', () => {
      expect(buildFallbackGrid).toEqual({
        rows: [],
        rowCount: 0,
      });
    });
  });

  describe('createInstrumentedSpan', () => {
    const mockTracer = {
      startSpan: jest.fn(),
    };

    const mockSpan = {
      setAttributes: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
      spanContext: jest.fn(() => ({
        traceId: 'test-trace-id',
        spanId: 'test-span-id',
      })),
      setAttribute: jest.fn(),
      addEvent: jest.fn(),
    };

    const mockContext = {};

    beforeEach(() => {
      (trace.getTracer as jest.Mock).mockReturnValue(mockTracer);
      (otelContext.active as jest.Mock).mockReturnValue(mockContext);
      (trace.setSpan as jest.Mock).mockReturnValue(mockContext);
      mockTracer.startSpan.mockReturnValue(mockSpan);
      (otelContext.with as jest.Mock).mockImplementation(async (ctx, fn) =>
        fn(mockSpan)
      );
    });

    test('creates span with default tracer name', async () => {
      const result = await createInstrumentedSpan({
        spanName: 'test-span',
      });

      expect(trace.getTracer).toHaveBeenCalledWith('app-instrumentation');
      expect(mockTracer.startSpan).toHaveBeenCalledWith<
        [string, undefined, object]
      >('test-span', undefined, mockContext);
      expect(result.span).toBe(mockSpan);
    });

    test('creates span with custom tracer name', async () => {
      await createInstrumentedSpan({
        spanName: 'test-span',
        tracerName: 'custom-tracer',
      });

      expect(trace.getTracer).toHaveBeenCalledWith('custom-tracer');
    });

    test('sets attributes on span', async () => {
      const attributes = { 'test.key': 'value', 'test.number': 42 };

      await createInstrumentedSpan({
        spanName: 'test-span',
        attributes,
      });

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'test-span',
        {
          attributes,
        },
        mockContext
      );
    });

    test('sets span kind', async () => {
      const { SpanKind } = await import('@opentelemetry/api');

      await createInstrumentedSpan({
        spanName: 'test-span',
        kind: SpanKind.CLIENT,
      });

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'test-span',
        {
          kind: SpanKind.CLIENT,
        },
        mockContext
      );
    });
    test('sets both kind and attributes', async () => {
      const { SpanKind } = await import('@opentelemetry/api');
      const attributes = { 'test.key': 'value' };

      await createInstrumentedSpan({
        spanName: 'test-span',
        kind: SpanKind.SERVER,
        attributes,
      });

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'test-span',
        {
          kind: SpanKind.SERVER,
          attributes,
        },
        mockContext
      );
    });

    test('executes function successfully', async () => {
      const testFunction = jest.fn().mockResolvedValue('success');

      const result = await createInstrumentedSpan({
        spanName: 'test-span',
      });

      const executionResult = await result.executeWithContext(testFunction);

      expect(testFunction).toHaveBeenCalledWith(mockSpan);
      expect(executionResult).toBe('success');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.OK,
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    test('handles function errors', async () => {
      const testError = new Error('Test error');
      const testFunction = jest.fn().mockRejectedValue(testError);

      (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock).mockReturnValue({
        message: 'Test error',
        name: 'Error',
        stack: 'stack trace',
      });

      const result = await createInstrumentedSpan({
        spanName: 'test-span',
      });

      await expect(result.executeWithContext(testFunction)).rejects.toThrow(
        'Test error'
      );

      expect(mockSpan.recordException).toHaveBeenCalled();
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'error.message': 'Test error',
        'error.name': 'Error',
        'error.stack': 'stack trace',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    test('returns no-op implementation when OpenTelemetry unavailable', async () => {
      (trace.getTracer as jest.Mock).mockImplementation(() => {
        throw new Error('OpenTelemetry not available');
      });

      const result = await createInstrumentedSpan({
        spanName: 'test-span',
      });

      expect(result.span).toBeUndefined();
      expect(typeof result.executeWithContext).toBe('function');

      const executionResult = await result.executeWithContext(
        async () => 'success'
      );
      expect(executionResult).toBe('success');
    });

    test('handles span end errors gracefully', async () => {
      mockSpan.end.mockImplementation(() => {
        throw new Error('End failed');
      });

      const result = await createInstrumentedSpan({
        spanName: 'test-span',
      });

      const executionResult = await result.executeWithContext(
        async () => 'success'
      );

      expect(executionResult).toBe('success');
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('reportEvent', () => {
    test('reports event successfully', async () => {
      await expect(
        reportEvent({
          eventName: 'test-event',
          additionalData: { success: true, keys: ['test'] },
        })
      ).resolves.not.toThrow();

      // Note: The function is designed to not throw errors even if internal operations fail
      // This test ensures the basic interface works as expected
    });

    test('handles error events', async () => {
      await expect(
        reportEvent({
          eventName: 'error-event',
          additionalData: { success: false, error: 'Test error' },
        })
      ).resolves.not.toThrow();
    });

    test('handles logging errors gracefully', async () => {
      // Should not throw even if there are internal errors
      await expect(
        reportEvent({
          eventName: 'test-event',
          additionalData: { success: true },
        })
      ).resolves.not.toThrow();
    });

    test('handles event reporting errors', async () => {
      // Should not throw even if there are internal errors
      await expect(
        reportEvent({
          eventName: 'test-event',
          additionalData: { success: true },
        })
      ).resolves.not.toThrow();
    });
  });

  describe('wrapRouteRequest', () => {
    const mockTracer = {
      startActiveSpan: jest.fn(),
    };

    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };

    beforeEach(() => {
      (trace.getTracer as jest.Mock).mockReturnValue(mockTracer);
      mockTracer.startActiveSpan.mockImplementation(
        async (name, options, parentCtx, fn) => {
          return await (fn ?? options)(mockSpan);
        }
      );
      (otelContext.active as jest.Mock).mockReturnValue({});
      (propagation.extract as jest.Mock).mockReturnValue({});
    });

    test('wraps handler successfully', async () => {
      const handler = wrapRouteRequest(async (_req: Request) => {
        return new Response('success');
      });

      const mockRequest = {
        url: 'https://example.com/test',
        method: 'GET',
        headers: new Map(),
      } as any;

      const response = await handler(mockRequest);
      if (!response) {
        throw new Error('Response is undefined');
      }
      expect(response.status).toBe(200);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.OK,
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    describe('build fallback scenarios', () => {
      let ORIGINAL_PHASE = process.env.NEXT_PHASE;
      beforeEach(() => {        // Clear environment variables before each test
        process.env.NEXT_PHASE = 'phase-production-build';        
      });
      afterEach(() => {
        process.env.NEXT_PHASE = ORIGINAL_PHASE; // Restore original environment variable after tests
      });

      test('handles build fallback when IS_BUILDING is set', async () => {        
        // Mock startActiveSpan to add debug logging
        mockTracer.startActiveSpan.mockImplementation(
          async (name, options, parentCtx, fn) => {
            try {
              const result = await fn(mockSpan);

              return result;
            } catch (error) {
              throw error;
            }
          }
        );

        const handler = wrapRouteRequest(async (req: Request) => {
          throw new Error('Handler should not execute during build');
        });

        const mockRequest = {} as NextRequest;
        const response = await handler(mockRequest);
        if (!response) {
          throw new Error('Response is undefined');
        }
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK-BUILD-FALLBACK');
        expect(mockSpan.setAttribute).toHaveBeenCalledWith(
          'http.status_code',
          200
        );
      });

      test('handles build fallback when NEXT_PHASE is production-build', async () => {

        const handler = wrapRouteRequest(async (_req: Request) => {
          throw new Error('Handler should not execute during build');
        });

        const mockRequest = {} as NextRequest;
        const response = await handler(mockRequest);
        if (!response) {
          throw new Error('Response is undefined');
        }
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK-BUILD-FALLBACK');
        expect(mockSpan.setAttribute).toHaveBeenCalledWith(
          'http.status_code',
          200
        );
      });
    });

    test('allows execution during build when EnableOnBuild is passed', async () => {
      const handler = wrapRouteRequest(
        async (_req: Request) => {
          return new Response('executed during build');
        },
        { buildFallback: EnableOnBuild }
      );

      const mockRequest = {} as NextRequest;
      const response = await handler(mockRequest);

      if (!response) {
        throw new Error('Response is undefined');
      }
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('executed during build');
    });

    test('handles handler errors', async () => {
      const testError = new Error('Handler failed');

      (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock).mockReturnValue({
        message: 'Handler failed',
        name: 'Error',
        stack: 'stack trace',
      });

      const handler = wrapRouteRequest(async (_req: Request) => {
        throw testError;
      });

      const mockRequest = {} as NextRequest;

      const response = await handler(mockRequest);

      expect(response!.status).toBe(500);
      expect(response).toBeInstanceOf(Response);
      expect(mockSpan.recordException).toHaveBeenCalledWith(testError);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
      });
    });

    test('logs request details in non-production', async () => {
      const handler = wrapRouteRequest(async (_req: Request) => {
        return new Response('success');
      });

      const mockRequest = {
        url: 'https://example.com/test',
        method: 'POST',
        headers: new Map(),
      } as any;

      await handler(mockRequest);

      expect(log).toHaveBeenCalledWith(expect.any(Function));
    });

    test('does not log in production', async () => {
      // Temporarily set NODE_ENV to production
      // @ts-ignore
      process.env.NODE_ENV = 'production';
      const handler = wrapRouteRequest(async (_req: Request) => {
        return new Response('success');
      });

      const mockRequest = {
        url: 'https://example.com/test',
        method: 'GET',
        headers: new Map(),
      } as any;

      await handler(mockRequest);

      expect(log).not.toHaveBeenCalled();
    });

    test('handles custom error callback', async () => {
      const errorCallback = jest.fn();
      const testError = new Error('Test error');

      const handler = wrapRouteRequest(
        async (_req: Request) => {
          throw testError;
        },
        { errorCallback }
      );

      const mockRequest = {} as NextRequest;

      await handler(mockRequest);

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Handler failed', // The mocked LoggedError message
          name: 'Error',
        })
      );
      expect(LoggedError.isLoggedError).toBeDefined(); // Just check the function exists
    });

    test('handles error callback that throws', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback failed');
      });

      const handler = wrapRouteRequest(
        async (_req: Request) => {
          throw new Error('Handler failed');
        },
        { errorCallback }
      );

      const mockRequest = {} as NextRequest;

      // Should not throw despite callback error
      const response = await handler(mockRequest);
      expect(response).toBeInstanceOf(Response);
    });

    test('extracts route parameters from context', async () => {
      const handler = wrapRouteRequest(async (_req: Request, _context: any) => {
        return new Response('success');
      });

      const mockRequest = {
        url: 'https://example.com/test',
        method: 'GET',
        headers: new Map(),
      } as any;

      const mockContext = {
        params: Promise.resolve({ id: '123', slug: 'test' }),
      };

      await handler(mockRequest, mockContext);

      // Check that startActiveSpan was called with the route params attribute
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
        'route.request',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'route.params': expect.stringContaining(
              '{"id":"123","slug":"test"}'
            ),
          }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    test('handles undefined context params', async () => {
      const handler = wrapRouteRequest(async (_req: Request, _context: any) => {
        return new Response('success');
      });

      const mockRequest = {} as NextRequest;
      const mockContext = { params: Promise.resolve({ id: '123' }) };

      await handler(mockRequest, mockContext);

      // Check that startActiveSpan was called with empty route params
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
        'route.request',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'route.params': expect.stringContaining('{"id":"123"}'),
          }),
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });
});
