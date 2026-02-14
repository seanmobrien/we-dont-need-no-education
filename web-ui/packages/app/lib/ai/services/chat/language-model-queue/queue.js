import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '@compliance-theater/redis';
import { countTokens } from '../../../core/count-tokens';
import { auth } from '@/auth';
import { log } from '@compliance-theater/logger';
import { MessageTooLargeForQueueError } from '../errors';
import { ModelMap } from '../../model-stats/model-map';
const REDIS_PREFIX = 'language-model-queue';
const FIFO_CHATQUEUE_QUEUE_EXPIRATION_HOURS = 6;
const FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS = FIFO_CHATQUEUE_QUEUE_EXPIRATION_HOURS * 60 * 60;
const FIFO_CHATQUEUE_MESSAGE_STALE_TIMEOUT = 5 * 60 * 1000;
const FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER = 1500;
export class LanguageModelQueue {
    model;
    maxConcurrentRequests;
    _queueInstanceId;
    modelType;
    processingInterval;
    abortControllers = new Map();
    constructor(options) {
        this.model = options.model;
        this.maxConcurrentRequests = options.maxConcurrentRequests;
        this._queueInstanceId = uuidv4();
        this.modelType = this.extractModelType(options.model);
        log((l) => l.info('LanguageModelQueue initialized', {
            modelType: this.modelType,
            maxConcurrentRequests: this.maxConcurrentRequests,
            queueInstanceId: this._queueInstanceId,
        }));
        this.startProcessing();
    }
    get queueInstanceId() {
        return this._queueInstanceId;
    }
    extractModelType(model) {
        if ('provider' in model && 'modelId' in model) {
            const modelWithProps = model;
            return `${modelWithProps.provider}:${modelWithProps.modelId}`;
        }
        return 'unknown-model';
    }
    getQueueKey() {
        return `${REDIS_PREFIX}:queue:${this.modelType}`;
    }
    getCapacityKey() {
        return `${REDIS_PREFIX}:capacity:${this.modelType}`;
    }
    getProcessingKey() {
        return `${REDIS_PREFIX}:processing:${this.modelType}`;
    }
    async getCurrentUserId() {
        try {
            const session = await auth();
            return session?.user?.id || 'anonymous';
        }
        catch (error) {
            log((l) => l.warn('Failed to get user ID from auth', { error }));
            return 'anonymous';
        }
    }
    async getModelTokenLimit() {
        try {
            const quotaRecord = await (await ModelMap.getInstance()).getModelFromLanguageModel(this.model);
            return quotaRecord?.quota?.maxTokensPerMinute || 50000;
        }
        catch (error) {
            log((l) => l.warn('Failed to get model token limit', { error }));
            return 10000;
        }
    }
    async validateMessageSize(tokenCount) {
        const maxTokensPerMinute = await this.getModelTokenLimit();
        const maxAllowedTokens = maxTokensPerMinute - FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER;
        if (tokenCount > maxAllowedTokens) {
            throw new MessageTooLargeForQueueError(tokenCount, maxAllowedTokens, this.modelType);
        }
    }
    async createQueuedRequest(method, params, tokenCount) {
        const userId = await this.getCurrentUserId();
        return {
            id: uuidv4(),
            modelType: this.modelType,
            method,
            params,
            tokenCount,
            userId,
            status: 'pending',
            queuedAt: new Date().toISOString(),
        };
    }
    async enqueueRequest(request) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey();
        await redis
            .multi()
            .lPush(queueKey, JSON.stringify(request))
            .expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS)
            .exec();
        log((l) => l.info('Request enqueued', {
            requestId: request.id,
            method: request.method,
            tokenCount: request.tokenCount,
            queueInstanceId: this._queueInstanceId,
        }));
    }
    async getModelCapacity() {
        try {
            const redis = await getRedisClient();
            const capacityKey = this.getCapacityKey();
            const data = await redis.get(capacityKey);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        }
        catch (error) {
            log((l) => l.warn('Failed to get model capacity', { error }));
            return null;
        }
    }
    async updateModelCapacity(capacity) {
        try {
            const redis = await getRedisClient();
            const capacityKey = this.getCapacityKey();
            await redis
                .multi()
                .set(capacityKey, JSON.stringify(capacity))
                .expire(capacityKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS)
                .exec();
        }
        catch (error) {
            log((l) => l.warn('Failed to update model capacity', { error }));
        }
    }
    extractRateLimitInfo(headers) {
        const info = {};
        const remainingTokens = headers['x-ratelimit-remaining-tokens'];
        if (remainingTokens) {
            info.remainingTokens = parseInt(Array.isArray(remainingTokens) ? remainingTokens[0] : remainingTokens);
        }
        const remainingRequests = headers['x-ratelimit-remaining-requests'];
        if (remainingRequests) {
            info.remainingRequests = parseInt(Array.isArray(remainingRequests)
                ? remainingRequests[0]
                : remainingRequests);
        }
        const retryAfter = headers['x-retry-after'];
        if (retryAfter) {
            info.retryAfter = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
        }
        return info;
    }
    async hasCapacity(tokenCount) {
        const capacity = await this.getModelCapacity();
        if (!capacity) {
            return true;
        }
        if (capacity.resetAt) {
            const resetTime = new Date(capacity.resetAt);
            if (new Date() < resetTime) {
                return false;
            }
        }
        const requiredTokens = tokenCount + FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER;
        return capacity.tokensPerMinute >= requiredTokens;
    }
    async generateText(params, signal) {
        return this.processRequest('generateText', params, signal);
    }
    async generateObject(params, signal) {
        return this.processRequest('generateObject', params, signal);
    }
    async streamText(params, signal) {
        return this.processRequest('streamText', params, signal);
    }
    async streamObject(params, signal) {
        return this.processRequest('streamObject', params, signal);
    }
    async processRequest(method, params, signal) {
        const tokenCount = this.estimateTokenCount(params);
        await this.validateMessageSize(tokenCount);
        const queuedRequest = await this.createQueuedRequest(method, params, tokenCount);
        if (signal) {
            this.abortControllers.set(queuedRequest.id, new AbortController());
            signal.addEventListener('abort', () => {
                this.handleAbort(queuedRequest.id);
            });
        }
        await this.enqueueRequest(queuedRequest);
        return new Promise((resolve, reject) => {
            this.waitForRequestCompletion(queuedRequest.id, resolve, reject);
        });
    }
    estimateTokenCount(params) {
        try {
            if (params && typeof params === 'object' && 'messages' in params) {
                const messages = params.messages;
                if (Array.isArray(messages)) {
                    return countTokens({ prompt: messages });
                }
            }
            const str = JSON.stringify(params);
            return Math.ceil(str.length / 4);
        }
        catch (error) {
            log((l) => l.warn('Failed to count tokens, using fallback', { error }));
            return 1000;
        }
    }
    async handleAbort(requestId) {
        try {
            const redis = await getRedisClient();
            const queueKey = this.getQueueKey();
            const requests = await redis.lRange(queueKey, 0, -1);
            const filteredRequests = requests.filter((req) => {
                try {
                    const parsed = JSON.parse(req);
                    return parsed.id !== requestId;
                }
                catch {
                    return true;
                }
            });
            await redis.del(queueKey);
            if (filteredRequests.length > 0) {
                await redis.lPush(queueKey, filteredRequests);
                await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
            }
            this.abortControllers.delete(requestId);
            log((l) => l.info('Request aborted', { requestId }));
        }
        catch (error) {
            log((l) => l.warn('Failed to handle abort', { requestId, error }));
        }
    }
    async waitForRequestCompletion(requestId, resolve, reject) {
        setTimeout(() => {
            reject(new Error(`Request processing not yet implemented for request ${requestId}`));
        }, 1000);
    }
    startProcessing() {
        this.processingInterval = setInterval(() => {
            this.processQueue().catch((error) => {
                log((l) => l.error('Error in processing loop', { error }));
            });
        }, 1000);
    }
    async processQueue() {
        try {
            const redis = await getRedisClient();
            const queueKey = this.getQueueKey();
            const requests = await redis.lRange(queueKey, 0, -1);
            if (requests.length === 0) {
                return;
            }
            const parsedRequests = requests
                .map((req) => {
                try {
                    return JSON.parse(req);
                }
                catch {
                    return null;
                }
            })
                .filter((req) => req !== null);
            const pendingRequests = parsedRequests.filter((req) => req.status === 'pending');
            if (pendingRequests.length === 0) {
                return;
            }
            const processingCount = parsedRequests.filter((req) => req.status === 'processing').length;
            const availableSlots = this.maxConcurrentRequests - processingCount;
            if (availableSlots <= 0) {
                return;
            }
            await this.selectAndProcessRequests(pendingRequests, availableSlots);
        }
        catch (error) {
            log((l) => l.error('Error processing queue', { error }));
        }
    }
    async selectAndProcessRequests(pendingRequests, availableSlots) {
        const requestsToProcess = [];
        const now = new Date();
        for (const request of pendingRequests) {
            if (requestsToProcess.length >= availableSlots) {
                break;
            }
            const hasCapacityForRequest = await this.hasCapacity(request.tokenCount);
            if (hasCapacityForRequest) {
                requestsToProcess.push(request);
            }
            else {
                const queuedTime = new Date(request.queuedAt);
                const timeDiff = now.getTime() - queuedTime.getTime();
                if (timeDiff > FIFO_CHATQUEUE_MESSAGE_STALE_TIMEOUT) {
                    requestsToProcess.push(request);
                }
            }
        }
        for (const request of requestsToProcess) {
            await this.executeRequest(request);
        }
    }
    async executeRequest(request) {
        try {
            await this.markRequestAsProcessing(request);
            const result = await this.callModel(request);
            await this.handleRequestSuccess(request, result);
        }
        catch (error) {
            await this.handleRequestError(request, error);
        }
    }
    async markRequestAsProcessing(request) {
        const updatedRequest = {
            ...request,
            status: 'processing',
            processingStartedAt: new Date().toISOString(),
            processingQueueInstanceId: this._queueInstanceId,
        };
        await this.updateRequestInQueue(request.id, updatedRequest);
    }
    async updateRequestInQueue(requestId, updatedRequest) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey();
        const requests = await redis.lRange(queueKey, 0, -1);
        const updatedRequests = requests.map((req) => {
            try {
                const parsed = JSON.parse(req);
                if (parsed.id === requestId) {
                    return JSON.stringify(updatedRequest);
                }
                return req;
            }
            catch {
                return req;
            }
        });
        await redis.del(queueKey);
        if (updatedRequests.length > 0) {
            await redis.lPush(queueKey, updatedRequests);
            await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
        }
    }
    async callModel(request) {
        throw new Error('Model calling not yet implemented');
    }
    async handleRequestSuccess(request, result) {
        await this.removeRequestFromQueue(request.id);
        if (result && typeof result === 'object' && 'rawResponse' in result) {
            const rawResponse = result.rawResponse;
            if (rawResponse && rawResponse.headers) {
                await this.updateCapacityFromHeaders(rawResponse.headers);
            }
        }
        await this.reportMetrics();
        log((l) => l.info('Request completed successfully', { requestId: request.id }));
    }
    async handleRequestError(request, error) {
        const isRateLimitError = this.isRateLimitError(error);
        if (isRateLimitError) {
            const resetRequest = {
                ...request,
                status: 'pending',
                processingStartedAt: undefined,
                processingQueueInstanceId: undefined,
            };
            await this.updateRequestInQueue(request.id, resetRequest);
            await this.handleRateLimitError(error);
        }
        else {
            await this.removeRequestFromQueue(request.id);
        }
        log((l) => l.error('Request failed', {
            requestId: request.id,
            error,
            isRateLimitError,
        }));
    }
    async removeRequestFromQueue(requestId) {
        const redis = await getRedisClient();
        const queueKey = this.getQueueKey();
        const requests = await redis.lRange(queueKey, 0, -1);
        const filteredRequests = requests.filter((req) => {
            try {
                const parsed = JSON.parse(req);
                return parsed.id !== requestId;
            }
            catch {
                return true;
            }
        });
        await redis.del(queueKey);
        if (filteredRequests.length > 0) {
            await redis.lPush(queueKey, filteredRequests);
            await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
        }
    }
    isRateLimitError(error) {
        if (error && typeof error === 'object') {
            const errorObj = error;
            if (errorObj.code === 'rate_limit_exceeded' ||
                errorObj.status === 429 ||
                (errorObj.message && errorObj.message.includes('rate limit'))) {
                return true;
            }
            if (errorObj.headers && errorObj.headers['x-retry-after']) {
                return true;
            }
        }
        return false;
    }
    async handleRateLimitError(error) {
        let retryAfter;
        if (error && typeof error === 'object') {
            const errorObj = error;
            if (errorObj.headers && errorObj.headers['x-retry-after']) {
                retryAfter = Array.isArray(errorObj.headers['x-retry-after'])
                    ? errorObj.headers['x-retry-after'][0]
                    : errorObj.headers['x-retry-after'];
            }
        }
        const capacity = {
            tokensPerMinute: 0,
            lastUpdated: new Date().toISOString(),
            resetAt: retryAfter || new Date(Date.now() + 60000).toISOString(),
        };
        await this.updateModelCapacity(capacity);
    }
    async updateCapacityFromHeaders(headers) {
        const rateLimitInfo = this.extractRateLimitInfo(headers);
        if (rateLimitInfo.remainingTokens !== undefined) {
            const capacity = {
                tokensPerMinute: rateLimitInfo.remainingTokens,
                requestsPerMinute: rateLimitInfo.remainingRequests,
                lastUpdated: new Date().toISOString(),
                resetAt: rateLimitInfo.retryAfter,
            };
            await this.updateModelCapacity(capacity);
        }
    }
    async reportMetrics() {
        try {
            const redis = await getRedisClient();
            const queueKey = this.getQueueKey();
            const requests = await redis.lRange(queueKey, 0, -1);
            const parsedRequests = requests
                .map((req) => {
                try {
                    return JSON.parse(req);
                }
                catch {
                    return null;
                }
            })
                .filter((req) => req !== null);
            const activeRequests = parsedRequests.filter((req) => req.status === 'processing').length;
            const queueSize = parsedRequests.length;
            const capacity = await this.getModelCapacity();
            const availableTokens = capacity?.tokensPerMinute || 0;
            const metrics = {
                activeRequests,
                queueSize,
                availableTokens,
                queueInstanceId: this._queueInstanceId,
                modelType: this.modelType,
            };
            log((l) => l.info('Queue metrics', { metrics }));
        }
        catch (error) {
            log((l) => l.warn('Failed to report metrics', { error }));
        }
    }
    dispose() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }
        this.abortControllers.forEach((controller) => {
            controller.abort();
        });
        this.abortControllers.clear();
        log((l) => l.info('LanguageModelQueue disposed', {
            queueInstanceId: this._queueInstanceId,
        }));
    }
}
//# sourceMappingURL=queue.js.map