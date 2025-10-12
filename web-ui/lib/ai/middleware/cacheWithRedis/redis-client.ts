import { createClient, RedisClientType } from 'redis';
import { env } from '@/lib/site-util/env';
import { isError } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';

export type { RedisClientType } from 'redis';

/**
 * Redis client singleton manager using global symbol registry
 */
class RedisClientManager {
  /** Symbol-based global registry key for Redis client singleton. */
  static readonly #REGISTRY_KEY = Symbol.for('@noeducation/redis:RedisClient');

  /** Global singleton Redis client via symbol registry. */
  private static get client(): RedisClientType | null {
    type GlobalReg = { [k: symbol]: RedisClientType | null };
    const g = globalThis as unknown as GlobalReg;
    return g[this.#REGISTRY_KEY] ?? null;
  }
  private static set client(value: RedisClientType | null) {
    type GlobalReg = { [k: symbol]: RedisClientType | null };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = value;
  }

  /**
   * Get or create a Redis client instance
   * Uses singleton pattern to ensure we reuse the same connection
   */
  static async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient({
        url: env('REDIS_URL'),
        password: env('REDIS_PASSWORD'),
      });

      this.client.on('error', (err) => {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          message: 'Redis client error',
          data: {
            redisUrl: env('REDIS_URL'),
          },
          source: 'redis-client',
          log: true,
        });
      });

      this.client.on('connect', () => {
        log((l) => l.info('Redis client connected'));
      });

      this.client.on('reconnecting', () => {
        log((l) => l.warn('Redis client reconnecting'));
      });

      this.client.on('ready', () => {
        log((l) => l.info('Redis client ready'));
      });

      await this.client.connect();
    }

    return this.client;
  }

  /**
   * Close the Redis connection
   * Should be called when the application shuts down
   */
  static async closeClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        if (
          !isError(error) ||
          !error.message.includes('The client is closed')
        ) {
          console.error('Error closing Redis client:', error);
          throw error; // Re-throw to ensure we handle this in the application shutdown
        }
      }
      this.client = null;
    }
  }
}

/**
 * Get or create a Redis client instance
 * Uses singleton pattern to ensure we reuse the same connection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  return RedisClientManager.getClient();
}

/**
 * Close the Redis connection
 * Should be called when the application shuts down
 */
export async function closeRedisClient(): Promise<void> {
  return RedisClientManager.closeClient();
}
