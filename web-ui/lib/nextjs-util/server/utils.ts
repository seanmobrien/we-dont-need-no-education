import { ErrorResponse } from './error-response';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';


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

/**
 * Wraps a route handler function with error handling and optional logging for Next.js API/app routes.
 *
 * This utility returns an async function that:
 *   - Logs the request arguments if logging is enabled
 *   - Calls the original handler and returns its result
 *   - Catches synchronous or async errors, logs them if logging is enabled, and returns an ErrorResponse
 *
 * @template T - The type of the route handler function
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapRouteRequest = <T extends (...args: any[]) => any>(
  fn: T,
  options: { log?: boolean, buildFallback?: object | typeof EnableOnBuild; } = { },
) => {
  const { log: shouldLog = env('NODE_ENV') !== 'production', buildFallback } = options ?? {};
  return async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    try {
      if (
        buildFallback !== EnableOnBuild &&
        (process.env.IS_BUILDING == '1' || process.env.NEXT_PHASE === 'phase-production-build')
      ) {
        return Promise.resolve(
          Response.json(
            buildFallback ?? globalBuildFallback,
            { status: 200, statusText: 'OK-BUILD-FALLBACK' }
         )) as Promise<Awaited<ReturnType<T>>>;
      }
      if (shouldLog) {
        if (args[0] && typeof args[0] === 'object' && 'params' in args[0]) {
          await args[0].params;
        }
        log((l) => l.info('Processing route request', { args }));
      }
      return await fn(...args);
    } catch (error) {
      if (shouldLog) {
        log((l) => l.error('Error processing route request', { error, args }));
      }
      return Promise.resolve(new ErrorResponse('An unexpected error occurred') as Awaited<ReturnType<T>>);
    }
  };
};
