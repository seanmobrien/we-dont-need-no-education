import type { CacheableResponse } from './types';
import {
  isSuccessfulResponse,
  isProblematicResponse,
} from './responseClassifiers';
import { cacheSuccessfulResponse, handleCacheJail } from './cacheOperations';
import { getCacheConfig } from './config';
import type { getRedisClient } from '@/lib/redis-client';
import { log } from '@compliance-theater/logger';

const config = getCacheConfig();

export const handleResponseCaching = async (
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  cacheKey: string,
  response: CacheableResponse,
  context: string = ''
): Promise<void> => {
  const isSuccessful = isSuccessfulResponse(response);
  const isProblematic = isProblematicResponse(response);

  if (isSuccessful) {
    await cacheSuccessfulResponse(redis, cacheKey, response, context);
  } else if (isProblematic) {
    await handleCacheJail(redis, cacheKey, response, context);
  } else {
    // Log why we're not caching
    if (config.enableLogging) {
      log((l) =>
        l.warn(
          `❌ Not caching ${context}response (finishReason: ${
            response.finishReason
          }, hasText: ${!!(
            response.content && response.content.length > 0
          )}) for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`
        )
      );
    }
  }
};
