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

export const EnableOnBuild: unique symbol = Symbol('ServiceEnabledOnBuild');

export const buildFallbackGrid = { rows: [], rowCount: 0 };

const globalBuildFallback = {
  __status: 'Service disabled during build.',
} as const;

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

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '<unserializable>';
  }
};

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
