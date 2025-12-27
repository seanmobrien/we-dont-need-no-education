import { LanguageModelV2 } from '@ai-sdk/provider';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '@/lib/redis-client';
import { countTokens } from '../../../core/count-tokens';
import { auth } from '@/auth';
import { log } from '@repo/lib-logger';
import type {
  LanguageModelQueueOptions,
  QueuedRequest,
  LanguageModelMethod,
  ModelCapacity,
  RateLimitInfo,
  QueueMetrics,
} from './types';
import { MessageTooLargeForQueueError } from '../errors';
import { ModelMap } from '../../model-stats/model-map';

const REDIS_PREFIX = 'language-model-queue';
const FIFO_CHATQUEUE_QUEUE_EXPIRATION_HOURS = 6;
const FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS =
  FIFO_CHATQUEUE_QUEUE_EXPIRATION_HOURS * 60 * 60;
const FIFO_CHATQUEUE_MESSAGE_STALE_TIMEOUT = 5 * 60 * 1000;
const FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER = 1500; // Reserved tokens for response

export class LanguageModelQueue {
  private readonly model: LanguageModelV2;
  private readonly maxConcurrentRequests: number;
  private readonly _queueInstanceId: string;
  private readonly modelType: string;
  private processingInterval?: NodeJS.Timeout;
  private abortControllers = new Map<string, AbortController>();

  constructor(options: LanguageModelQueueOptions) {
    this.model = options.model;
    this.maxConcurrentRequests = options.maxConcurrentRequests;
    this._queueInstanceId = uuidv4();
    this.modelType = this.extractModelType(options.model);

    log((l) =>
      l.info('LanguageModelQueue initialized', {
        modelType: this.modelType,
        maxConcurrentRequests: this.maxConcurrentRequests,
        queueInstanceId: this._queueInstanceId,
      }),
    );

    // Start processing loop
    this.startProcessing();
  }

  get queueInstanceId(): string {
    return this._queueInstanceId;
  }

  private extractModelType(model: LanguageModelV2): string {
    // Try to extract from the model's provider and model ID
    if ('provider' in model && 'modelId' in model) {
      const modelWithProps = model as { provider: string; modelId: string };
      return `${modelWithProps.provider}:${modelWithProps.modelId}`;
    }
    // Fallback to a generic identifier
    return 'unknown-model';
  }

  private getQueueKey(): string {
    return `${REDIS_PREFIX}:queue:${this.modelType}`;
  }

  private getCapacityKey(): string {
    return `${REDIS_PREFIX}:capacity:${this.modelType}`;
  }

  private getProcessingKey(): string {
    return `${REDIS_PREFIX}:processing:${this.modelType}`;
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const session = await auth();
      return session?.user?.id || 'anonymous';
    } catch (error) {
      log((l) => l.warn('Failed to get user ID from auth', { error }));
      return 'anonymous';
    }
  }

  private async getModelTokenLimit(): Promise<number> {
    try {
      const quotaRecord = await (
        await ModelMap.getInstance()
      ).getModelFromLanguageModel(this.model);
      // This would need to be implemented to query the models table
      // For now, return a reasonable default
      // TODO: Implement actual database query to get model limits
      return quotaRecord?.quota?.maxTokensPerMinute || 50000; // Default limit
    } catch (error) {
      log((l) => l.warn('Failed to get model token limit', { error }));
      return 10000; // Conservative fallback
    }
  }

  private async validateMessageSize(tokenCount: number): Promise<void> {
    const maxTokensPerMinute = await this.getModelTokenLimit();
    const maxAllowedTokens =
      maxTokensPerMinute - FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER;

    if (tokenCount > maxAllowedTokens) {
      throw new MessageTooLargeForQueueError(
        tokenCount,
        maxAllowedTokens,
        this.modelType,
      );
    }
  }

  private async createQueuedRequest(
    method: LanguageModelMethod,
    params: unknown,
    tokenCount: number,
  ): Promise<QueuedRequest> {
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

  private async enqueueRequest(request: QueuedRequest): Promise<void> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey();

    await redis
      .multi()
      .lPush(queueKey, JSON.stringify(request))
      .expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS)
      .exec();

    log((l) =>
      l.info('Request enqueued', {
        requestId: request.id,
        method: request.method,
        tokenCount: request.tokenCount,
        queueInstanceId: this._queueInstanceId,
      }),
    );
  }

  private async getModelCapacity(): Promise<ModelCapacity | null> {
    try {
      const redis = await getRedisClient();
      const capacityKey = this.getCapacityKey();
      const data = await redis.get(capacityKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as ModelCapacity;
    } catch (error) {
      log((l) => l.warn('Failed to get model capacity', { error }));
      return null;
    }
  }

  private async updateModelCapacity(capacity: ModelCapacity): Promise<void> {
    try {
      const redis = await getRedisClient();
      const capacityKey = this.getCapacityKey();

      await redis
        .multi()
        .set(capacityKey, JSON.stringify(capacity))
        .expire(capacityKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS)
        .exec();
    } catch (error) {
      log((l) => l.warn('Failed to update model capacity', { error }));
    }
  }

  private extractRateLimitInfo(
    headers: Record<string, string | string[]>,
  ): RateLimitInfo {
    const info: RateLimitInfo = {};

    const remainingTokens = headers['x-ratelimit-remaining-tokens'];
    if (remainingTokens) {
      info.remainingTokens = parseInt(
        Array.isArray(remainingTokens) ? remainingTokens[0] : remainingTokens,
      );
    }

    const remainingRequests = headers['x-ratelimit-remaining-requests'];
    if (remainingRequests) {
      info.remainingRequests = parseInt(
        Array.isArray(remainingRequests)
          ? remainingRequests[0]
          : remainingRequests,
      );
    }

    const retryAfter = headers['x-retry-after'];
    if (retryAfter) {
      info.retryAfter = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
    }

    return info;
  }

  private async hasCapacity(tokenCount: number): Promise<boolean> {
    const capacity = await this.getModelCapacity();

    if (!capacity) {
      // No capacity data available, assume we have capacity
      return true;
    }

    // Check if we're still in a rate limit period
    if (capacity.resetAt) {
      const resetTime = new Date(capacity.resetAt);
      if (new Date() < resetTime) {
        return false;
      }
    }

    // Check token capacity
    const requiredTokens = tokenCount + FIFO_CHATQUEUE_OUTPUT_TOKEN_BUFFER;
    return capacity.tokensPerMinute >= requiredTokens;
  }

  async generateText(params: unknown, signal?: AbortSignal): Promise<unknown> {
    return this.processRequest('generateText', params, signal);
  }

  async generateObject(
    params: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.processRequest('generateObject', params, signal);
  }

  async streamText(params: unknown, signal?: AbortSignal): Promise<unknown> {
    return this.processRequest('streamText', params, signal);
  }

  async streamObject(params: unknown, signal?: AbortSignal): Promise<unknown> {
    return this.processRequest('streamObject', params, signal);
  }

  private async processRequest(
    method: LanguageModelMethod,
    params: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    // Count tokens in the request
    const tokenCount = this.estimateTokenCount(params);

    // Validate message size
    await this.validateMessageSize(tokenCount);

    // Create queued request
    const queuedRequest = await this.createQueuedRequest(
      method,
      params,
      tokenCount,
    );

    // Set up abort handling
    if (signal) {
      this.abortControllers.set(queuedRequest.id, new AbortController());

      signal.addEventListener('abort', () => {
        this.handleAbort(queuedRequest.id);
      });
    }

    // Enqueue the request
    await this.enqueueRequest(queuedRequest);

    // Return a promise that resolves when the request is processed
    return new Promise((resolve, reject) => {
      this.waitForRequestCompletion(queuedRequest.id, resolve, reject);
    });
  }

  private estimateTokenCount(params: unknown): number {
    try {
      // Try to extract messages from params for token counting
      if (params && typeof params === 'object' && 'messages' in params) {
        const messages = (params as { messages: unknown }).messages;
        if (Array.isArray(messages)) {
          return countTokens({ prompt: messages });
        }
      }

      // Fallback estimation based on string length
      const str = JSON.stringify(params);
      return Math.ceil(str.length / 4); // Rough estimation: 4 chars per token
    } catch (error) {
      log((l) => l.warn('Failed to count tokens, using fallback', { error }));
      return 1000; // Conservative fallback
    }
  }

  private async handleAbort(requestId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      const queueKey = this.getQueueKey();

      // Remove the request from the queue
      const requests = await redis.lRange(queueKey, 0, -1);
      const filteredRequests = requests.filter((req) => {
        try {
          const parsed = JSON.parse(req) as QueuedRequest;
          return parsed.id !== requestId;
        } catch {
          return true; // Keep unparseable requests
        }
      });

      // Update the queue
      await redis.del(queueKey);
      if (filteredRequests.length > 0) {
        await redis.lPush(queueKey, filteredRequests);
        await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
      }

      // Clean up abort controller
      this.abortControllers.delete(requestId);

      log((l) => l.info('Request aborted', { requestId }));
    } catch (error) {
      log((l) => l.warn('Failed to handle abort', { requestId, error }));
    }
  }

  private async waitForRequestCompletion(
    requestId: string,
    resolve: (value: unknown) => void,
    reject: (reason: unknown) => void,
  ): Promise<void> {
    // This would be implemented to poll for completion or use pub/sub
    // For now, this is a placeholder
    setTimeout(() => {
      reject(
        new Error(
          `Request processing not yet implemented for request ${requestId}`,
        ),
      );
    }, 1000);
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        log((l) => l.error('Error in processing loop', { error }));
      });
    }, 1000); // Process every second
  }

  private async processQueue(): Promise<void> {
    try {
      // Get current queue state
      const redis = await getRedisClient();
      const queueKey = this.getQueueKey();
      const requests = await redis.lRange(queueKey, 0, -1);

      if (requests.length === 0) {
        return; // Nothing to process
      }

      // Parse requests
      const parsedRequests = requests
        .map((req) => {
          try {
            return JSON.parse(req) as QueuedRequest;
          } catch {
            return null;
          }
        })
        .filter((req) => req !== null) as QueuedRequest[];

      // Filter to pending requests only
      const pendingRequests = parsedRequests.filter(
        (req) => req.status === 'pending',
      );

      if (pendingRequests.length === 0) {
        return;
      }

      // Check how many are currently processing
      const processingCount = parsedRequests.filter(
        (req) => req.status === 'processing',
      ).length;
      const availableSlots = this.maxConcurrentRequests - processingCount;

      if (availableSlots <= 0) {
        return; // No available processing slots
      }

      // Process requests with FIFO + capacity-aware logic
      await this.selectAndProcessRequests(pendingRequests, availableSlots);
    } catch (error) {
      log((l) => l.error('Error processing queue', { error }));
    }
  }

  private async selectAndProcessRequests(
    pendingRequests: QueuedRequest[],
    availableSlots: number,
  ): Promise<void> {
    const requestsToProcess: QueuedRequest[] = [];
    const now = new Date();

    for (const request of pendingRequests) {
      if (requestsToProcess.length >= availableSlots) {
        break;
      }

      const hasCapacityForRequest = await this.hasCapacity(request.tokenCount);

      if (hasCapacityForRequest) {
        requestsToProcess.push(request);
      } else {
        // Check if we should wait for capacity to process this request due to the stale-message rule
        const queuedTime = new Date(request.queuedAt);
        const timeDiff = now.getTime() - queuedTime.getTime();

        if (timeDiff > FIFO_CHATQUEUE_MESSAGE_STALE_TIMEOUT) {
          // Don't skip requests older than 5 minutes
          requestsToProcess.push(request);
        }
        // Otherwise skip this request and continue to the next
      }
    }

    // Process selected requests
    for (const request of requestsToProcess) {
      await this.executeRequest(request);
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    try {
      // Mark as processing
      await this.markRequestAsProcessing(request);

      // Execute the actual model call
      const result = await this.callModel(request);

      // Handle successful completion
      await this.handleRequestSuccess(request, result);
    } catch (error) {
      // Handle errors
      await this.handleRequestError(request, error);
    }
  }

  private async markRequestAsProcessing(request: QueuedRequest): Promise<void> {
    const updatedRequest: QueuedRequest = {
      ...request,
      status: 'processing',
      processingStartedAt: new Date().toISOString(),
      processingQueueInstanceId: this._queueInstanceId,
    };

    await this.updateRequestInQueue(request.id, updatedRequest);
  }

  private async updateRequestInQueue(
    requestId: string,
    updatedRequest: QueuedRequest,
  ): Promise<void> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey();

    // Get all requests
    const requests = await redis.lRange(queueKey, 0, -1);

    // Update the specific request
    const updatedRequests = requests.map((req) => {
      try {
        const parsed = JSON.parse(req) as QueuedRequest;
        if (parsed.id === requestId) {
          return JSON.stringify(updatedRequest);
        }
        return req;
      } catch {
        return req;
      }
    });

    // Replace the queue
    await redis.del(queueKey);
    if (updatedRequests.length > 0) {
      await redis.lPush(queueKey, updatedRequests);
      await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async callModel(request: QueuedRequest): Promise<unknown> {
    // This would implement the actual model calls
    // For now, this is a placeholder
    throw new Error('Model calling not yet implemented');
  }

  private async handleRequestSuccess(
    request: QueuedRequest,
    result: unknown,
  ): Promise<void> {
    // Remove from queue
    await this.removeRequestFromQueue(request.id);

    // Update capacity based on response headers if available
    if (result && typeof result === 'object' && 'rawResponse' in result) {
      const rawResponse = (
        result as {
          rawResponse?: { headers?: Record<string, string | string[]> };
        }
      ).rawResponse;
      if (rawResponse && rawResponse.headers) {
        await this.updateCapacityFromHeaders(rawResponse.headers);
      }
    }

    // Report metrics
    await this.reportMetrics();

    log((l) =>
      l.info('Request completed successfully', { requestId: request.id }),
    );
  }

  private async handleRequestError(
    request: QueuedRequest,
    error: unknown,
  ): Promise<void> {
    const isRateLimitError = this.isRateLimitError(error);

    if (isRateLimitError) {
      // Reset request to pending and update capacity
      const resetRequest: QueuedRequest = {
        ...request,
        status: 'pending',
        processingStartedAt: undefined,
        processingQueueInstanceId: undefined,
      };

      await this.updateRequestInQueue(request.id, resetRequest);
      await this.handleRateLimitError(error);
    } else {
      // Remove from queue for non-rate-limit errors
      await this.removeRequestFromQueue(request.id);
    }

    log((l) =>
      l.error('Request failed', {
        requestId: request.id,
        error,
        isRateLimitError,
      }),
    );
  }

  private async removeRequestFromQueue(requestId: string): Promise<void> {
    const redis = await getRedisClient();
    const queueKey = this.getQueueKey();

    const requests = await redis.lRange(queueKey, 0, -1);
    const filteredRequests = requests.filter((req) => {
      try {
        const parsed = JSON.parse(req) as QueuedRequest;
        return parsed.id !== requestId;
      } catch {
        return true;
      }
    });

    await redis.del(queueKey);
    if (filteredRequests.length > 0) {
      await redis.lPush(queueKey, filteredRequests);
      await redis.expire(queueKey, FIFO_CHATQUEUE_QUEUE_EXPIRATION_SECONDS);
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const errorObj = error as {
        code?: string;
        status?: number;
        message?: string;
        headers?: Record<string, string | string[]>;
      };

      // Check for common rate limit indicators
      if (
        errorObj.code === 'rate_limit_exceeded' ||
        errorObj.status === 429 ||
        (errorObj.message && errorObj.message.includes('rate limit'))
      ) {
        return true;
      }

      // Check for x-retry-after header presence
      if (errorObj.headers && errorObj.headers['x-retry-after']) {
        return true;
      }
    }

    return false;
  }

  private async handleRateLimitError(error: unknown): Promise<void> {
    // Extract retry-after information
    let retryAfter: string | undefined;

    if (error && typeof error === 'object') {
      const errorObj = error as { headers?: Record<string, string | string[]> };
      if (errorObj.headers && errorObj.headers['x-retry-after']) {
        retryAfter = Array.isArray(errorObj.headers['x-retry-after'])
          ? errorObj.headers['x-retry-after'][0]
          : errorObj.headers['x-retry-after'];
      }
    }

    // Update capacity to indicate no tokens available
    const capacity: ModelCapacity = {
      tokensPerMinute: 0,
      lastUpdated: new Date().toISOString(),
      resetAt: retryAfter || new Date(Date.now() + 60000).toISOString(), // Default 1 minute
    };

    await this.updateModelCapacity(capacity);
  }

  private async updateCapacityFromHeaders(
    headers: Record<string, string | string[]>,
  ): Promise<void> {
    const rateLimitInfo = this.extractRateLimitInfo(headers);

    if (rateLimitInfo.remainingTokens !== undefined) {
      const capacity: ModelCapacity = {
        tokensPerMinute: rateLimitInfo.remainingTokens,
        requestsPerMinute: rateLimitInfo.remainingRequests,
        lastUpdated: new Date().toISOString(),
        resetAt: rateLimitInfo.retryAfter,
      };

      await this.updateModelCapacity(capacity);
    }
  }

  private async reportMetrics(): Promise<void> {
    try {
      const redis = await getRedisClient();
      const queueKey = this.getQueueKey();
      const requests = await redis.lRange(queueKey, 0, -1);

      const parsedRequests = requests
        .map((req) => {
          try {
            return JSON.parse(req) as QueuedRequest;
          } catch {
            return null;
          }
        })
        .filter((req) => req !== null) as QueuedRequest[];

      const activeRequests = parsedRequests.filter(
        (req) => req.status === 'processing',
      ).length;
      const queueSize = parsedRequests.length;

      const capacity = await this.getModelCapacity();
      const availableTokens = capacity?.tokensPerMinute || 0;

      const metrics: QueueMetrics = {
        activeRequests,
        queueSize,
        availableTokens,
        queueInstanceId: this._queueInstanceId,
        modelType: this.modelType,
      };

      log((l) => l.info('Queue metrics', { metrics }));
    } catch (error) {
      log((l) => l.warn('Failed to report metrics', { error }));
    }
  }

  dispose(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Abort any pending requests
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();

    log((l) =>
      l.info('LanguageModelQueue disposed', {
        queueInstanceId: this._queueInstanceId,
      }),
    );
  }
}
