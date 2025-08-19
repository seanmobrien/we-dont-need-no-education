import { ErrorResponse } from './error-response/index';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { NextRequest } from 'next/server';


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
  options: { log?: boolean; buildFallback?: object | typeof EnableOnBuild } = {},
): (...args: A) => Promise<Response> {
  const { log: shouldLog = env('NODE_ENV') !== 'production', buildFallback } =
    options ?? {};
  return async (
    ...args: A
  ): Promise<Response> => {
    const req = (args[0] as unknown as Request | NextRequest | undefined);
    const context = (args[1] as
      | { params: Promise<Record<string, unknown>> }
      | undefined);
    try {
      if (
        buildFallback !== EnableOnBuild &&
        (process.env.IS_BUILDING == '1' ||
          process.env.NEXT_PHASE === 'phase-production-build')
      ) {
        return Response.json(buildFallback ?? globalBuildFallback, {
          status: 200,
          statusText: 'OK-BUILD-FALLBACK',
        });
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
  return await fn(...args);
    } catch (error) {
      if (shouldLog) {
        const extractedParams = await (!!context?.params
          ? context.params
          : Promise.resolve({} as Record<string, unknown>));
        LoggedError.isTurtlesAllTheWayDownBaby(error,{
          log: true,
          source: 'wrapRouteRequest:catch',
          data: {
            params: extractedParams,
            req,
          }
        });
      }
      return new ErrorResponse('An unexpected error occurred', { cause: error });
    }
  };
}
