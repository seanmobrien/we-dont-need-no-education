import { createClient, RedisClientType } from 'redis';
import { env } from '@/lib/site-util/env';
import { isError } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';

let redisClient: RedisClientType | null = null;

/**
 * Get or create a Redis client instance
 * Uses singleton pattern to ensure we reuse the same connection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: env('REDIS_URL'),
      password: env('REDIS_PASSWORD'),
    });

    redisClient.on('error', (err) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        message: 'Redis client error',
        data: {
          redisUrl: env('REDIS_URL'),
        },
        source: 'redis-client',
        log: true,
      });
    });

    redisClient.on('connect', () => {
      log((l) => l.info('Redis client connected'));
    });

    redisClient.on('reconnecting', () => {
      log((l) => l.warn('Redis client reconnecting'));
    });

    redisClient.on('ready', () => {
      log((l) => l.info('Redis client ready'));
    });

    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Close the Redis connection
 * Should be called when the application shuts down
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      if (!isError(error) || !error.message.includes('The client is closed')) {
        console.error('Error closing Redis client:', error);
        throw error; // Re-throw to ensure we handle this in the application shutdown
      }
    }
    redisClient = null;
  }
}
