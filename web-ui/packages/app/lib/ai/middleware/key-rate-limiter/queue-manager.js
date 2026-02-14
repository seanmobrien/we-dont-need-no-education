import { getRedisClient } from '@compliance-theater/redis';
import { SingletonProvider } from '@compliance-theater/typescript';
const REDIS_PREFIX = 'rate-limit';
const EXPIRATION_HOURS = 6;
const EXPIRATION_SECONDS = EXPIRATION_HOURS * 60 * 60;
export class RateLimitQueueManager {
    static getInstance() {
        const GLOBAL_KEY = Symbol.for('@noeducation/key-rate-limiter:QueueManager');
        return SingletonProvider.Instance.getRequired(GLOBAL_KEY, () => new RateLimitQueueManager());
    }
    getQueueKey(generation, modelClassification) {
        return `${REDIS_PREFIX}:queue:gen${generation}:${modelClassification}`;
    }
    getResponseKey(requestId) {
        return `${REDIS_PREFIX}:response:${requestId}`;
    }
    async enqueueRequest(request) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey(request.metadata.generation, request.modelClassification);
        await redis
            .multi()
            .lPush(queueKey, JSON.stringify(request))
            .expire(queueKey, EXPIRATION_SECONDS)
            .exec();
    }
    async dequeueRequests(generation, modelClassification, maxCount = 10) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey(generation, modelClassification);
        const requests = await redis.lRange(queueKey, 0, maxCount - 1);
        if (requests.length > 0) {
            await redis.lTrim(queueKey, requests.length, -1);
        }
        return requests.map((req) => JSON.parse(req));
    }
    async getQueueSize(generation, modelClassification) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey(generation, modelClassification);
        return await redis.lLen(queueKey);
    }
    async storeResponse(response) {
        const redis = await getRedisClient();
        const responseKey = this.getResponseKey(response.id);
        await redis
            .multi()
            .set(responseKey, JSON.stringify(response))
            .expire(responseKey, EXPIRATION_SECONDS)
            .exec();
    }
    async getResponse(requestId) {
        const redis = await getRedisClient();
        const responseKey = this.getResponseKey(requestId);
        const response = await redis.get(responseKey);
        return response ? JSON.parse(response) : null;
    }
    async removeResponse(requestId) {
        const redis = await getRedisClient();
        const responseKey = this.getResponseKey(requestId);
        await redis.del(responseKey);
    }
    async checkIfRequestExists(requestId) {
        const redis = await getRedisClient();
        const responseKey = this.getResponseKey(requestId);
        const responseExists = await redis.exists(responseKey);
        if (responseExists) {
            return true;
        }
        const modelClassifications = ['hifi', 'lofi', 'completions', 'embedding'];
        for (const classification of modelClassifications) {
            for (const generation of [1, 2]) {
                const queueKey = this.getQueueKey(generation, classification);
                const requests = await redis.lRange(queueKey, 0, -1);
                const requestExists = requests.some((req) => {
                    try {
                        const parsed = JSON.parse(req);
                        return parsed.id === requestId;
                    }
                    catch {
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
//# sourceMappingURL=queue-manager.js.map