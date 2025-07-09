/**
 * @fileoverview Stream utilities for converting cached responses to streams
 */

import type { LanguageModelV1StreamPart } from 'ai';
import type { CacheableResponse } from './types';
import { getCacheConfig } from './config';

const config = getCacheConfig();

/**
 * Converts cached text response to a ReadableStream for streaming APIs
 *
 * @param parsed - The cached response to convert to a stream
 * @returns A ReadableStream that emits the cached content as streaming chunks
 */
export const createStreamFromCachedText = (
  parsed: CacheableResponse,
): ReadableStream<LanguageModelV1StreamPart> => {
  return new ReadableStream<LanguageModelV1StreamPart>({
    start(controller) {
      // Emit text deltas to simulate streaming
      const text = parsed.text || '';

      for (let i = 0; i < text.length; i += config.streamChunkSize) {
        const chunk = text.slice(i, i + config.streamChunkSize);
        controller.enqueue({
          type: 'text-delta',
          textDelta: chunk,
        });
      }

      // Emit finish event with proper type casting
      const finishReason = (parsed.finishReason || 'stop') as
        | 'stop'
        | 'length'
        | 'content-filter'
        | 'tool-calls'
        | 'error'
        | 'other'
        | 'unknown';

      if (parsed.usage) {
        controller.enqueue({
          type: 'finish',
          finishReason,
          usage: parsed.usage as {
            promptTokens: number;
            completionTokens: number;
          },
        });
      } else {
        controller.enqueue({
          type: 'finish',
          finishReason,
          usage: { promptTokens: 0, completionTokens: 0 },
        });
      }

      controller.close();
    },
  });
};
