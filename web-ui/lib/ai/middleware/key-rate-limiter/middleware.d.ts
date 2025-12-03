/**
 * @fileoverview Middleware factory for key rate limiting.
 *
 * This module provides a factory function to create a rate limiting middleware
 * that handles model availability, failover strategies, and request metrics.
 */

import type {
  RateLimitFactoryOptions,
  RateLimitRetryContext,
  RetryRateLimitMiddlewareType,
} from './types';

declare module '@/lib/ai/middleware/key-rate-limiter/middleware' {
  /**
   * Factory function to create a retry rate limit middleware.
   *
   * This middleware wraps the language model generation and streaming processes
   * to enforce rate limits, handle errors, and manage model failovers.
   *
   * @param factoryOptions - Options for creating the middleware, either as factory options or a retry context.
   * @returns A promise that resolves to the configured middleware instance.
   */
  export const retryRateLimitMiddlewareFactory: (
    factoryOptions: RateLimitFactoryOptions | RateLimitRetryContext,
  ) => Promise<RetryRateLimitMiddlewareType>;
}
