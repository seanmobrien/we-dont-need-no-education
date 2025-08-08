import { ServerErrorResponseType } from './types';
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
  options: { log?: boolean } = {},
) => {
  const { log: shouldLog = env('NODE_ENV') !== 'production' } = options ?? {};
  return async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | ServerErrorResponseType> => {
    try {
      if (shouldLog) {
        log((l) => l.info('Processing route request', { args }));
      }
      return await fn(...args);
    } catch (error) {
      if (shouldLog) {
        log((l) => l.error('Error processing route request', { error, args }));
      }
      return new ErrorResponse(error);
    }
  };
};
