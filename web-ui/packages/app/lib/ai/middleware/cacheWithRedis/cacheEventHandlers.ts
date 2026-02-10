import type { CacheableResponse } from './types';
import { getCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { log } from '@compliance-theater/logger';
import { generateChatId } from '@/lib/ai/core';

const config = getCacheConfig();

export const handleCacheHit = (
  cacheKey: string,
  parsed: CacheableResponse,
  context: string = ''
): void => {
  const responseSize =
    parsed.content?.reduce(
      (acc, part) => acc + (part.type === 'text' ? part.text.length : 0),
      0
    ) || 0;

  // Fix-up timestamps
  if (
    'response' in parsed &&
    parsed.response &&
    typeof parsed.response === 'object' &&
    parsed.response !== null
  ) {
    if ('timestamp' in parsed.response && parsed.response.timestamp) {
      try {
        const responseObj = parsed.response as Record<string, unknown>;
        responseObj.timestamp = new Date(Date.now());
      } catch (error) {
        log((l) =>
          l.warn('Failed to parse timestamp in cached response', {
            cacheKey,
            error: String(error),
          })
        );
        // If parsing fails, we just leave it as is
      }
    }
  }
  if ('id' in parsed && parsed.id) {
    try {
      parsed.id = String(parsed.id) + generateChatId();
    } catch (error) {
      log((l) =>
        l.warn('Failed to parse ID in cached response', {
          cacheKey,
          error: String(error),
        })
      );
      // If parsing fails, we just leave it as is
    }
  }

  // Record metrics
  if (config.enableMetrics) {
    metricsCollector.recordHit(cacheKey, responseSize);
  }

  if (config.enableLogging) {
    log((l) =>
      l.verbose(
        `🎯 ${context}Cache HIT for key: ${cacheKey.substring(
          0,
          config.maxKeyLogLength
        )}...`
      )
    );
  }
};

export const handleCacheMiss = (
  cacheKey: string,
  context: string = ''
): void => {
  // Record cache miss
  if (config.enableMetrics) {
    metricsCollector.recordMiss(cacheKey);
  }

  if (config.enableLogging) {
    log((l) =>
      l.verbose(
        `🔍 ${context}Cache MISS for key: ${cacheKey.substring(
          0,
          config.maxKeyLogLength
        )}...`
      )
    );
  }
};
