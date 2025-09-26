import { ErrorResponse } from './error-response/index';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
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
} from '@opentelemetry/api';

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
 * Mirrors an empty data grid structure in order to avoid triggering any client-side errors..
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
 * Wraps a route handler function with error handling and optional logging for Next.js API/app routes.
 *
 * This utility returns an async function that:
 *   - Logs the request arguments if logging is enabled
 *   - Calls the original handler and returns its result
 *   - Catches synchronous or async errors, logs them if logging is enabled, and returns an ErrorResponse
 *
 * Supports both Fetch API `Request` and Next.js `NextRequest`. The type you use in your handler
 * will be preserved by the wrapper and passed through unchanged.
 *
 * @template TContext - The type of the dynamic route params (default: object)
 * @template TReq - Request type: Fetch API `Request` or Next.js `NextRequest` (inferred)
 * @param fn - The route handler function to wrap (can be sync or async)
 * @param options - Optional config:
 *   - log: boolean (default: true in non-production, false in production)
 * @returns An async function that returns the handler result or an ErrorResponse on error
 *
 * @example
 * ```typescript
 * // In a Next.js API route
 * export default wrapRouteRequest(async (req, res) => {
 *   // ...
 * });
 *
 * // With logging disabled
 * export default wrapRouteRequest(handler, { log: false });
 * ```
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
          const errResponse = new ErrorResponse(
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
 * - Extracts W3C trace context from incoming headers when present
 * - Falls back to the active context when not present
 * - Derives request path, query, method, route params, and sanitized headers
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

function getPathQueryAndMethod(req: Request | NextRequest | undefined): {
  path: string;
  query: string;
  method: string;
} {
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
}

function getHeadersObject(
  req: Request | NextRequest | undefined,
): Record<string, string> {
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
}

function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
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
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '<unserializable>';
  }
}
