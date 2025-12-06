/**
 * Type definitions for server-side response types
 * @module @/lib/nextjs-util/server/types
 */

import { Span } from '@opentelemetry/api';

declare module '@/lib/nextjs-util/server/types' {
  /**
   * Server error response type alias for Next.js Response objects
   */
  export type ServerErrorResponseType = Response;

  /**
   * Context type for wrapped responses, including original arguments and tracing span
   * @template TContext - A record type representing the original function's context parameters
   * @property {Promise<TContext>} params - The original arguments passed to the wrapped function
   * @property {Span} span - The tracing span associated with the request
   */
  export type WrappedResponseContext<TContext extends Record<string, unknown>> =
    {
      params: Promise<TContext>;
      span: Span;
    };
}
