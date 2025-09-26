import { getRedisClient } from '../cacheWithRedis/redis-client';
import type { RateLimitedRequest, ProcessedResponse } from './types';

const REDIS_PREFIX = 'rate-limit';
const EXPIRATION_HOURS = 6;
const EXPIRATION_SECONDS = EXPIRATION_HOURS * 60 * 60;

export class RateLimitQueueManager {
  /**
   * Returns a singleton instance using a Symbol-backed global registry.
   * This avoids duplicate instances across HMR, SSR, or multi-bundle scenarios.
   */
  static getInstance(): RateLimitQueueManager {
    const GLOBAL_KEY = Symbol.for('@noeducation/key-rate-limiter:QueueManager');
    const globalRegistry = globalThis as unknown as {
      [key: symbol]: RateLimitQueueManager | undefined;
    };
    if (!globalRegistry[GLOBAL_KEY]) {
      globalRegistry[GLOBAL_KEY] = new RateLimitQueueManager();
    }
    return globalRegistry[GLOBAL_KEY]!;
  }

  private getQueueKey(generation: 1 | 2, modelClassification: string): string {
    return `${REDIS_PREFIX}:queue:gen${generation}:${modelClassification}`;
  }

  private getResponseKey(requestId: string): string {
    return `${REDIS_PREFIX}:response:${requestId}`;
  }

  async enqueueRequest(request: RateLimitedRequest): Promise<void> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey(
      request.metadata.generation,
      request.modelClassification,
    );

    await redis
      .multi()
      .lPush(queueKey, JSON.stringify(request))
      .expire(queueKey, EXPIRATION_SECONDS)
      .exec();
  }

  async dequeueRequests(
    generation: 1 | 2,
    modelClassification: string,
    maxCount: number = 10,
  ): Promise<RateLimitedRequest[]> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey(generation, modelClassification);

    const requests = await redis.lRange(queueKey, 0, maxCount - 1);
    if (requests.length > 0) {
      await redis.lTrim(queueKey, requests.length, -1);
    }

    return requests.map((req) => JSON.parse(req) as RateLimitedRequest);
  }

  async getQueueSize(
    generation: 1 | 2,
    modelClassification: string,
  ): Promise<number> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey(generation, modelClassification);
    return await redis.lLen(queueKey);
  }

  async storeResponse(response: ProcessedResponse): Promise<void> {
    const redis = await getRedisClient();
    const responseKey = this.getResponseKey(response.id);

    await redis
      .multi()
      .set(responseKey, JSON.stringify(response))
      .expire(responseKey, EXPIRATION_SECONDS)
      .exec();
  }

  async getResponse(requestId: string): Promise<ProcessedResponse | null> {
    const redis = await getRedisClient();
    const responseKey = this.getResponseKey(requestId);

    const response = await redis.get(responseKey);
    return response ? (JSON.parse(response) as ProcessedResponse) : null;
  }

  async removeResponse(requestId: string): Promise<void> {
    const redis = await getRedisClient();
    const responseKey = this.getResponseKey(requestId);
    await redis.del(responseKey);
  }

  async checkIfRequestExists(requestId: string): Promise<boolean> {
    const redis = await getRedisClient();
    const responseKey = this.getResponseKey(requestId);

    // Check both queue and response storage
    const responseExists = await redis.exists(responseKey);
    if (responseExists) {
      return true;
    }

    // Check all queues for the request
    const modelClassifications = ['hifi', 'lofi', 'completions', 'embedding'];
    for (const classification of modelClassifications) {
      for (const generation of [1, 2] as const) {
        const queueKey = this.getQueueKey(generation, classification);
        const requests = await redis.lRange(queueKey, 0, -1);
        const requestExists = requests.some((req) => {
          try {
            const parsed = JSON.parse(req) as RateLimitedRequest;
            return parsed.id === requestId;
          } catch {
            return false;
          }
        });
        if (requestExists) {
          return true;
        }
      }
    }

    return false;
  }
}

export const rateLimitQueueManager = RateLimitQueueManager.getInstance();
