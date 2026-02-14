import { createClient } from '@compliance-theater/redis';
import { globalRequiredSingletonAsync } from '@compliance-theater/typescript/singleton-provider';
import { CacheHandler } from '@fortedigital/nextjs-cache-handler';
import createRedisHandler from '@fortedigital/nextjs-cache-handler/redis-strings';

CacheHandler.onCreation(async () => {
  // Use global scope to prevent multiple connections in some environments
  return globalRequiredSingletonAsync(
    '@compliance-theater/app/cacheHandlerConfig',
    async () => {
      const client = await createClient({
        database: 1, // Use a separate Redis database for nextjs caching
      });

      // The redis-strings handler automatically manages Buffer conversion for Next.js 15
      const redisHandler = await createRedisHandler({
        client,
        // keyPrefix: 'next-app:',
      });

      return {
        handlers: [redisHandler],
      };
    },
  );
});

export default CacheHandler;
