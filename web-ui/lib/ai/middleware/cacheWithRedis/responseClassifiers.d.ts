/**
 * @fileoverview Response classification utilities for cache middleware.
 * Determines whether a response should be cached, jailed, or ignored.
 */

import type { CacheableResponse } from './types';

declare module '@/lib/ai/middleware/cacheWithRedis/responseClassifiers' {
  /**
   * Determines if a response should be cached immediately (successful response).
   * A successful response must have content, no errors, no warnings, and a valid finish reason.
   *
   * @param response - The AI response to evaluate.
   * @returns {boolean} True if the response is successful and should be cached immediately.
   */
  export const isSuccessfulResponse: (response: CacheableResponse) => boolean;

  /**
   * Determines if a response should be put in cache jail (problematic but not error).
   * A problematic response is one that has content but finished with a non-standard reason
   * (e.g., content-filter) or has warnings. Errors are never jailed.
   *
   * @param response - The AI response to evaluate.
   * @returns {boolean} True if the response is problematic and should go to cache jail.
   */
  export const isProblematicResponse: (response: CacheableResponse) => boolean;
}
