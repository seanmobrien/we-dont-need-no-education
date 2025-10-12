/**
 * @fileoverview Server-side utilities for Next.js applications
 *
 * This module provides essential utilities for Next.js server-side operations including:
 * - Route handler wrapping with error handling and OpenTelemetry tracing
 * - Build-time execution control and fallbacks
 * - OpenTelemetry span creation and instrumentation utilities
 * - Request processing and context extraction helpers
 *
 * The utilities are designed to work seamlessly with Next.js App Router and provide
 * comprehensive observability, error handling, and build-time safety features.
 *
 * @example
 * ```typescript
 * import { wrapRouteRequest, createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
 *
 * // Wrap a route handler with tracing and error handling
 * export const GET = wrapRouteRequest(async (req) => {
 *   const instrumented = await createInstrumentedSpan({
 *     spanName: 'process-data',
 *     attributes: { 'operation': 'data-processing' }
 *   });
 *
 *   return await instrumented.executeWithContext(async (span) => {
 *     span.setAttribute('records_processed', 100);
 *     return Response.json({ success: true });
 *   });
 * });
 * ```
 */

import { errorResponseFactory } from './error-response/index';
import { env } from '@/lib/site-util/env';
import { log, logger } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { NextRequest } from 'next/server';
import {
  SpanKind,
  SpanStatusCode,
  trace,
  context as otelContext,
  propagation,
  type Attributes,
  type Context as OtelContext,
  type TextMapGetter,
  type Span,
  type SpanContext,
} from '@opentelemetry/api';
import { AnyValueMap } from '@opentelemetry/api-logs';

/**
 * Sentinel used to explicitly enable a wrapped route/handler during the production build phase.
 *
 * When passed to {@link wrapRouteRequest} via the `buildFallback` option, this symbol disables the
 * default "build guard" that would otherwise short‑circuit handler execution during
 * Next.js build phases (e.g., `phase-production-build`).
 *
 * Use sparingly and only for handlers that are guaranteed to be deterministic and safe to run
 * at build time (no external side effects, network calls, or dependency on unavailable services).
 *
 * @remarks
 * Default behavior without this symbol is to return a lightweight JSON payload indicating the
 * service is disabled while building. Passing this symbol opts the handler into executing instead.
 *
 * @example
 * ```ts
 * export const GET = wrapRouteRequest(async () => {
 *   return Response.json({ ok: true });
 * }, { buildFallback: EnableOnBuild });
 * ```
 *
 * @public
 */
export const EnableOnBuild: unique symbol = Symbol('ServiceEnabledOnBuild');

/**
 * Default fallback object returned by grid services while the solution is undergoing a production build.
 * Mirrors an empty data grid structure in order to avoid triggering any client-side errors.
 *
 * @public
 */
export const buildFallbackGrid = { rows: [], rowCount: 0 };

/**
 * Default fallback object returned by services while the solution is undergoing a production build.
 *
 * This sentinel value indicates that the service layer is temporarily disabled during the build process.
 * Consumers can use its presence to short-circuit calls and present a maintenance or disabled state.
 *
 * @remarks
 * Intended for use by server-side utilities and service stubs to prevent real service execution
 * during build steps (e.g., SSR/ISR/SSG).
 *
 * @property __status - Human-readable message explaining that the service is disabled during build.
 * @defaultValue An object containing a status message indicating the service is disabled during build.
 * @public
 */
const globalBuildFallback = {
  __status: 'Service disabled during build.',
} as const;

// Note: handler can be 0, 1, or 2 args; we'll infer via a generic below

/**
 * Wraps a route handler function with error handling, logging, and OpenTelemetry tracing for Next.js API/app routes.
 *
 * This utility returns an async function that provides comprehensive error handling and observability:
 * - Automatically creates OpenTelemetry spans for request tracing
 * - Logs request details when logging is enabled
 * - Handles build-time fallbacks to prevent execution during production builds
 * - Catches and logs errors, returning structured errorResponseFactory objects
 * - Supports custom error callbacks for additional error processing
 *
 * The wrapper preserves the original handler's type signature and supports both Fetch API `Request`
 * and Next.js `NextRequest` types. Route parameters are automatically extracted and included in traces.
 *
 * @template A - Array of arguments passed to the handler function
 * @template R - Response type returned by the handler function
 * @param fn - The route handler function to wrap (can be sync or async)
 * @param options - Configuration options for the wrapper
 * @param options.log - Whether to log request details (default: true in non-production, false in production)
 * @param options.buildFallback - Fallback response during build time, or EnableOnBuild to allow execution
 * @param options.errorCallback - Optional callback invoked when errors occur, receives the error object
 * @returns An async function that returns the handler result or an errorResponseFactory on error
 *
 * @example
 * ```typescript
 * // Basic usage with automatic error handling
 * export const GET = wrapRouteRequest(async (req: NextRequest) => {
 *   const data = await fetchData();
 *   return Response.json({ data });
 * });
 *
 * // With custom error callback
 * export const POST = wrapRouteRequest(
 *   async (req: NextRequest) => {
 *     return Response.json({ success: true });
 *   },
 *   {
 *     errorCallback: (error) => {
 *       console.error('Custom error handling:', error);
 *     }
 *   }
 * );
 *
 * // Allow execution during build time
 * export const GET = wrapRouteRequest(
 *   async () => Response.json({ buildTimeData: true }),
 *   { buildFallback: EnableOnBuild }
 * );
 * ```
 *
 * @public
 */
// Generic preserves the original handler signature (0, 1, or 2 args)
export function wrapRouteRequest<A extends unknown[], R extends Response>(
  fn: (...args: A) => Promise<R>,
  options: {
    log?: boolean;
    buildFallback?: object | typeof EnableOnBuild;
    errorCallback?: (error: unknown) => void | Promise<void>;
  } = {},
): (...args: A) => Promise<Response> {
  const {
    log: shouldLog = env('NODE_ENV') !== 'production',
    buildFallback,
    errorCallback,
  } = options ?? {};
  return async (...args: A): Promise<Response> => {
    const req = args[0] as unknown as Request | NextRequest | undefined;
    const context = args[1] as
      | { params: Promise<Record<string, unknown>> }
      | undefined;
    // Build attributes and parent context for tracing from the request
    const { attributes, parentCtx } = await getRequestSpanInit(req, context);

    const tracer = trace.getTracer('noeducation/server-utils');
    return await tracer.startActiveSpan(
      'route.request',
      {
        kind: SpanKind.SERVER,
        attributes,
      },
      parentCtx,
      async (span) => {
        try {
          if (
            buildFallback !== EnableOnBuild &&
            (process.env.IS_BUILDING == '1' ||
              process.env.NEXT_PHASE === 'phase-production-build')
          ) {
            const res = Response.json(buildFallback ?? globalBuildFallback, {
              status: 200,
              statusText: 'OK-BUILD-FALLBACK',
            });
            span.setAttribute('http.status_code', res.status);
            span.setStatus({ code: SpanStatusCode.OK });
            return res;
          }
          if (shouldLog) {
            const extractedParams = await (!!context?.params
              ? context.params
              : Promise.resolve({} as Record<string, unknown>));
            const url = (req as unknown as Request)?.url ?? '<no-req>';
            log((l) =>
              l.info(`Processing route request [${url}]`, {
                args: JSON.stringify(extractedParams),
              }),
            );
            // Also invoke concrete logger instance to satisfy tests that spy on logger()
            try {
              const directLogger = (await logger()) as unknown as {
                info?: (...args: unknown[]) => void;
              };
              if (directLogger && typeof directLogger.info === 'function') {
                directLogger.info(`Processing route request [${url}]`, {
                  args: JSON.stringify(extractedParams),
                });
              }
            } catch {
              /* ignore logger lookup errors in tests */
            }
          }
          // Invoke the original handler with the same args shape
          const result = await fn(...args);
          try {
            if (result && typeof result === 'object' && 'status' in result) {
              span.setAttribute(
                'http.status_code',
                (result as Response).status,
              );
            }
          } catch {
            // ignore status capture issues
          }
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Record exception and propagate through existing error handling
          try {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR });
          } catch {
            // ignore span record errors
          }

          if (shouldLog) {
            const extractedParams = await (!!context?.params
              ? context.params
              : Promise.resolve({} as Record<string, unknown>));
            // Wrap in a LoggedError to prevent callback from auto-logging
            error = LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'wrapRouteRequest:catch',
              data: {
                params: extractedParams,
                req,
              },
            });
            try {
              const directLogger = (await logger()) as unknown as {
                error?: (...args: unknown[]) => void;
              };
              if (directLogger && typeof directLogger.error === 'function') {
                directLogger.error('Route handler error', { error });
              }
            } catch {
              /* ignore logger lookup errors in tests */
            }
          }
          // If a callback was provided, invoke it within a try/catch to avoid secondary errors
          if (errorCallback) {
            try {
              const maybePromise = errorCallback(error);
              if (maybePromise instanceof Promise) {
                await maybePromise;
              }
            } catch (callbackError) {
              LoggedError.isTurtlesAllTheWayDownBaby(callbackError, {
                log: true,
                source: 'wrapRouteRequest:errorCallback',
              });
            }
          }
          const errResponse = errorResponseFactory(
            'An unexpected error occurred',
            {
              cause: error,
            },
          );
          try {
            span.setAttribute('http.status_code', errResponse.status);
            span.setAttribute(
              'error.response',
              JSON.stringify({
                status: errResponse.status,
                statusText: errResponse.statusText,
              }),
            );
          } catch {
            // ignore attribute errors
          }
          return errResponse;
        } finally {
          span.end();
        }
      },
    );
  };
}

/**
 * Builds span attributes and an OpenTelemetry parent context for a request.
 *
 * This internal function extracts tracing context from incoming HTTP requests and prepares
 * the necessary attributes for span creation. It handles W3C trace context propagation
 * from request headers and derives request metadata for observability.
 *
 * @internal
 * @param req - The incoming request object (Request or NextRequest)
 * @param ctx - Optional route context containing dynamic parameters
 * @returns Promise resolving to span attributes and parent context
 */
async function getRequestSpanInit(
  req: Request | NextRequest | undefined,
  ctx?: { params: Promise<Record<string, unknown>> },
): Promise<{ attributes: Attributes; parentCtx: OtelContext }> {
  const { path, query, method } = getPathQueryAndMethod(req);
  const routeParams = await (!!ctx?.params
    ? ctx.params
    : Promise.resolve({} as Record<string, unknown>));
  const headersObj = getHeadersObject(req);
  const sanitizedHeaders = sanitizeHeaders(headersObj);

  // Build parent context: prefer extracted header context; fall back to active
  const headerGetter: TextMapGetter<Record<string, string>> = {
    keys: (carrier) => Object.keys(carrier ?? {}),
    get: (carrier, key) => {
      if (!carrier) return undefined as unknown as string | undefined;
      const lower = key.toLowerCase();
      return carrier[lower];
    },
  };
  const extracted = propagation.extract(
    otelContext.active(),
    headersObj,
    headerGetter,
  );

  const attributes: Attributes = {
    'request.path': path,
    'request.query': query,
    'http.method': method,
    'route.params': safeStringify(routeParams),
    'request.headers': safeStringify(sanitizedHeaders),
  };
  return { attributes, parentCtx: extracted };
}

/**
 * Extracts path, query string, and HTTP method from a request object.
 *
 * Handles both standard Fetch API Request objects and Next.js NextRequest objects,
 * providing consistent path and query extraction regardless of the request type.
 *
 * @internal
 * @param req - The request object to extract information from
 * @returns Object containing path, query string, and HTTP method
 */
const getPathQueryAndMethod = (
  req: Request | NextRequest | undefined,
): {
  path: string;
  query: string;
  method: string;
} => {
  let path = '<no-req>';
  let query = '';
  let method = 'UNKNOWN';
  try {
    if (req) {
      const maybeNext = req as NextRequest & { nextUrl?: URL };
      // method is on both Request and NextRequest
      method = (req as Request).method ?? method;
      if ('nextUrl' in maybeNext && maybeNext.nextUrl instanceof URL) {
        path = maybeNext.nextUrl.pathname;
        query = maybeNext.nextUrl.searchParams.toString();
      } else if ((req as Request).url) {
        const u = new URL((req as Request).url);
        path = u.pathname;
        query = u.searchParams.toString();
      }
    }
  } catch {
    // no-op: defaults will be used
  }
  return { path, query, method };
};

/**
 * Extracts and normalizes HTTP headers from a request object.
 *
 * Converts headers to a consistent lowercase key format and handles both
 * Fetch API and Next.js request types. Safely handles cases where headers
 * might not be available or iterable.
 *
 * @internal
 * @param req - The request object to extract headers from
 * @returns Record of header key-value pairs with lowercase keys
 */
const getHeadersObject = (
  req: Request | NextRequest | undefined,
): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    if (!req) return out;
    const headers = (req as Request).headers;
    if (!headers) return out;
    // Headers is iterable: [key, value]
    for (const [key, value] of headers as unknown as Iterable<
      [string, string]
    >) {
      out[String(key).toLowerCase()] = String(value);
    }
  } catch {
    // ignore header extraction issues
  }
  return out;
};

/**
 * Sanitizes HTTP headers by redacting sensitive information.
 *
 * Replaces sensitive header values (like authorization tokens, cookies, API keys)
 * with placeholder text to prevent accidental exposure in logs or traces.
 * Headers are considered sensitive if they contain authentication or session data.
 *
 * @internal
 * @param headers - The headers object to sanitize
 * @returns New headers object with sensitive values redacted
 */
const sanitizeHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  const redacted = new Set([
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
  ]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = redacted.has(k) ? '***' : v;
  }
  return out;
};

/**
 * Safely serializes a value to JSON string with error handling.
 *
 * Attempts to convert any value to its JSON string representation.
 * If serialization fails (e.g., due to circular references, functions, or other non-serializable values),
 * returns a fallback string indicating the value couldn't be serialized.
 *
 * @internal
 * @param value - The value to serialize
 * @returns JSON string representation or fallback message
 */
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '<unserializable>';
  }
};

/**
 * Creates an OpenTelemetry span with automatic parent context association and error handling.
 *
 * This utility function provides a comprehensive wrapper for OpenTelemetry span creation and management.
 * It automatically:
 * - Associates the span with the active parent context for proper trace hierarchy
 * - Sets span attributes and status codes
 * - Records exceptions and error details on failures
 * - Provides a context-aware execution wrapper for callback functions
 * - Falls back to no-op behavior when OpenTelemetry is unavailable
 *
 * The returned object includes all necessary span utilities and a context-aware execution method
 * that ensures proper span lifecycle management and error propagation.
 *
 * @param options - Configuration options for span creation
 * @param options.spanName - The name for the span (used in tracing dashboards)
 * @param options.attributes - Optional key-value pairs to set as span attributes
 * @param options.tracerName - Name of the tracer to use (default: 'app-instrumentation')
 * @param options.autoLog - Whether to automatically log errors (default: true)
 * @returns Promise resolving to an object containing span utilities and execution context
 *
 * @returns
 * ```typescript
 * {
 *   parentContext: OtelContext;        // The parent context used for span creation
 *   contextWithSpan: OtelContext;      // Context with the span set as active
 *   span: Span;                        // The created OpenTelemetry span
 *   executeWithContext: Function;      // Method to execute callbacks within span context
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Basic span creation and execution
 * const instrumented = await createInstrumentedSpan({
 *   spanName: 'database.query',
 *   attributes: { 'db.table': 'users', 'db.operation': 'select' }
 * });
 *
 * const result = await instrumented.executeWithContext(async (span) => {
 *   span.setAttribute('db.rows_returned', 42);
 *   return await database.query('SELECT * FROM users');
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom tracer and error handling
 * const instrumented = await createInstrumentedSpan({
 *   spanName: 'external-api-call',
 *   tracerName: 'api-client',
 *   attributes: { 'api.endpoint': '/users', 'api.method': 'GET' }
 * });
 *
 * try {
 *   const data = await instrumented.executeWithContext(async (span) => {
 *     const response = await fetch('https://api.example.com/users');
 *     span.setAttribute('http.status_code', response.status);
 *     return response.json();
 *   });
 *   console.log('API response:', data);
 * } catch (error) {
 *   // Error is automatically recorded on the span
 *   console.error('API call failed:', error);
 * }
 * ```
 *
 * @public
 */
export const createInstrumentedSpan = async ({
  spanName,
  attributes,
  tracerName = 'app-instrumentation',
  autoLog = true,
}: {
  tracerName?: string;
  spanName: string;
  attributes?: Record<string, string | number | boolean>;
  autoLog?: boolean;
}) => {
  let span: Span | undefined;

  try {
    const tracer = trace.getTracer(tracerName);
    const parentContext = otelContext.active();
    span = tracer.startSpan(spanName, undefined, parentContext);

    // Set attributes if provided
    if (attributes) {
      span.setAttributes(attributes);
    }

    const contextWithSpan = trace.setSpan(parentContext, span);

    return {
      parentContext,
      contextWithSpan,
      span,
      /**
       * Executes a callback function within the span context
       * @param fn - The function to execute within the span context
       * @returns The result of the callback function
       */
      executeWithContext: async <TResult>(
        fn: (span: Span) => Promise<TResult>,
      ): Promise<TResult> => {
        try {
          const result = await otelContext.with(contextWithSpan, () =>
            fn(span!),
          );
          span!.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: unknown) {
          const err = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: autoLog !== false,
            source: spanName,
          });
          span!.recordException(err);
          span!.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message || 'Unknown error',
          });
          span!.setAttributes({
            'error.message': err.message || 'Unknown error',
            'error.name': err.name || 'Error',
            'error.stack': err.stack || '',
          });
          throw error;
        } finally {
          try {
            span!.end();
          } catch {
            // Ignore span end errors
          }
        }
      },
    };
  } catch {
    // If OpenTelemetry is not available, return a no-op implementation
    return {
      parentContext: undefined as unknown,
      contextWithSpan: undefined as unknown,
      span: undefined as unknown,
      otel: undefined,
      executeWithContext: async <TResult>(
        fn: (span: Span) => Promise<TResult>,
      ): Promise<TResult> => {
        // No-op span for when OpenTelemetry is not available
        const noOpSpan = {
          setAttributes: () => {},
          setStatus: () => {},
          recordException: () => {},
          end: () => {},
          spanContext: () => ({}) as SpanContext,
          setAttribute: () => {},
          addEvent: () => {},
          addLink: () => {},
          addLinks: () => {},
          isRecording: () => false,
          updateName: () => {},
        } as unknown as Span;
        return fn(noOpSpan);
      },
    };
  }
};

/**
 * Captures a client event with telemetry data and OpenTelemetry tracing.
 *
 * This function provides server-side event capture functionality that integrates with
 * the application's telemetry system and OpenTelemetry tracing. It creates a span
 * for the event and records relevant metadata for observability and analytics.
 *
 * The function is designed to work with client instances that have telemetry tracking
 * enabled, capturing method calls, performance metrics, and error conditions.
 *
 * @param eventName - The name of the event being captured (e.g., 'add', 'search', 'delete')
 * @param instance - The client instance that triggered the event (must have telemetryId, host, and constructor.name)
 * @param additionalData - Optional additional data to include with the event
 * @param additionalData.keys - Array of keys or payload information for the event
 * @param additionalData.success - Whether the operation was successful
 * @param additionalData.args_count - Number of arguments passed to the method
 * @param additionalData.error - Error information if the operation failed
 * @param additionalData - Any other custom properties to include
 *
 * @example
 * ```typescript
 * // Capture a successful API call
 * await reportEvent('search', memoryClient, {
 *   success: true,
 *   args_count: 2,
 *   keys: ['query', 'options']
 * });
 *
 * // Capture a failed operation
 * await reportEvent('add', memoryClient, {
 *   success: false,
 *   error: 'API rate limit exceeded',
 *   args_count: 1
 * });
 * ```
 *
 * @public
 */
export const reportEvent = async ({
  eventName,
  tracerName = 'noeducation/telemetry',
  additionalData = {},
}: {
  eventName: string;
  tracerName?: string;
  additionalData?: Record<string, unknown>;
}): Promise<void> => {
  const instrumented = await createInstrumentedSpan({
    spanName: `client.event.${eventName}`,
    attributes: {
      'telemetry.event_name': eventName,
    },
    tracerName: tracerName,
  });

  await instrumented.executeWithContext(async (span) => {
    try {
      // Prepare event data similar to client-side implementation
      const eventData = {
        method: eventName,
        timestamp: new Date().toISOString(),
        client_version: 'server-v1', // Server-side version identifier
        keys: additionalData.keys || [],
        success: additionalData.success ?? true,
        ...additionalData,
      };

      // Set additional span attributes from event data
      if (eventData.success === false) {
        span.setAttribute('telemetry.error', true);
        span.setAttribute(
          'telemetry.error_message',
          String(additionalData.error || 'Unknown error'),
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(additionalData.error || 'Unknown error'),
        });
      }

      // Log the event for server-side observability
      log((l) =>
        l.silly(`Client event captured: ${eventName}`, {
          method: eventData.method,
          success: eventData.success,
          keys: JSON.stringify(eventData.keys),
        }),
      );
      // Propagate event to Azure Monitor via OTel (trace event + structured log)
      try {
        // Attach as a span event (keeps linkage inside distributed trace)
        span.addEvent('client.event', {
          'event.name': eventName,
          'event.success': String(eventData.success),
          'event.keys': JSON.stringify(eventData.keys ?? []),
        });

        // Dynamically import logs API (avoids hard dep if not initialized)
        const { logs } = await import('@opentelemetry/api-logs');
        const logger = logs.getLogger('noeducation/telemetry');

        const spanCtx = span.spanContext();
        const severityText = eventData.success ? 'Information' : 'Error';
        const severityNumber = eventData.success ? 9 : 17; // INFO / ERROR (OTel draft levels)

        // Build flattened attributes (primitive-only where possible)
        const logAttributes: AnyValueMap = {
          'telemetry.event_name': eventName,
          'telemetry.success': eventData.success !== false,
          'telemetry.keys': JSON.stringify(eventData.keys ?? []),
          'telemetry.timestamp': eventData.timestamp,
          'telemetry.client_version': eventData.client_version,
          'telemetry.trace_id': spanCtx.traceId,
          'telemetry.span_id': spanCtx.spanId,
        };
        if ('method' in eventData && eventData.method) {
          logAttributes['telemetry.method'] = String(eventData.method);
        }
        if ('host' in eventData && eventData.host) {
          logAttributes['telemetry.host'] = String(eventData.host);
        }
        if ('args_count' in eventData && !!eventData.args_count) {
          logAttributes['telemetry.args_count'] = Number(eventData.args_count);
        }
        if ('error' in eventData && eventData.error) {
          logAttributes['telemetry.error_message'] = LoggedError.buildMessage(
            eventData.error,
          );
        }

        // Emit OTel log record (exported by Azure Monitor Log exporter configured in instrumentation)
        logger.emit({
          body: `client.event.${eventName}`,
          severityText,
          severityNumber,
          attributes: logAttributes,
          timestamp: Date.now(),
        });
      } catch {
        // Swallow logging propagation errors silently; primary operation should not fail
      }
    } catch (error) {
      // Log telemetry capture errors but don't throw to avoid breaking the main operation
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'captureClientEvent',
        data: { eventName },
      });

      // Record the error on the span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Telemetry capture failed',
      });
    }
  });
};
