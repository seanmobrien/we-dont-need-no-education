/**
 * @fileoverview Response classification utilities for cache middleware
 */

import type { CacheableResponse } from './types';

/**
 * Determines if a response should be cached immediately (successful response)
 *
 * @param response - The AI response to evaluate
 * @returns true if the response is successful and should be cached immediately
 */
export const isSuccessfulResponse = (response: CacheableResponse): boolean => {
  return !!(
    response &&
    response.finishReason !== 'error' &&
    response.text !== undefined &&
    response.text !== null &&
    response.text.length > 0 &&
    response.finishReason !== 'other' &&
    response.finishReason !== 'content-filter' &&
    (!response.warnings || response.warnings.length === 0)
  );
};

/**
 * Determines if a response should be put in cache jail (problematic but not error)
 *
 * @param response - The AI response to evaluate
 * @returns true if the response is problematic and should go to cache jail
 */
export const isProblematicResponse = (response: CacheableResponse): boolean => {
  return !!(
    response &&
    response.text &&
    response.text.length > 0 &&
    response.finishReason !== 'error' && // Never jail errors
    (response.finishReason === 'other' ||
      response.finishReason === 'content-filter' ||
      (response.warnings && response.warnings.length > 0))
  );
};
