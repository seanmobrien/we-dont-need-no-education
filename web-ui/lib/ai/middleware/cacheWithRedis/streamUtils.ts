/**
 * @fileoverview Stream utilities for converting cached responses to streams
 */

import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';
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
): ReadableStream<LanguageModelV2StreamPart> => {
  return new ReadableStream<LanguageModelV2StreamPart>({
    start(controller) {
      // Emit text deltas to simulate streaming
      const text = parsed.content?.reduce((acc, part) => acc + (part.type === 'text' ? part.text : ''), '') || '';

      for (let i = 0; i < text.length; i += config.streamChunkSize) {
        const chunk = text.slice(i, i + config.streamChunkSize);
        controller.enqueue({
          type: 'text-delta',
          id: parsed.id,
          delta: chunk,
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
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
          },
        });
      } else {
        controller.enqueue({
          type: 'finish',
          finishReason,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        });
      }

      controller.close();
    },
  });
};
