import { ErrorResponse } from './error-response';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';

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
  options: { log?: boolean, disabledDuringBuild?: boolean; } = {},
) => {
  const { log: shouldLog = env('NODE_ENV') !== 'production'/*, disabledDuringBuild = true */ } = options ?? {};
  return async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    try {
      if (
        process.env.IS_BUILDING == '1' ||
        process.env.NEXT_PHASE === 'phase-production-build'
      ) {
        return Promise.resolve(
          new ErrorResponse('Route request disabled during build') as Awaited<
            ReturnType<T>
          >,
        );
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
