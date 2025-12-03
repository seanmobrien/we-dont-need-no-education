/**
 * @fileoverview Stream utilities for converting cached responses to streams.
 */

import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import type { CacheableResponse } from './types';

declare module '@/lib/ai/middleware/cacheWithRedis/streamUtils' {
  /**
   * Converts a cached text response into a ReadableStream that simulates streaming.
   * Emits the content in chunks to mimic the behavior of a live AI model stream.
   *
   * @param parsed - The cached response object containing the content and metadata.
   * @returns {ReadableStream<LanguageModelV2StreamPart>} A stream that emits the cached content.
   */
  export const createStreamFromCachedText: (
    parsed: CacheableResponse,
  ) => ReadableStream<LanguageModelV2StreamPart>;
}
