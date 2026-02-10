/**
 * @fileoverview Queue manager for rate limited requests.
 *
 * This module provides a singleton class for managing Redis-backed queues for
 * rate limited requests, including enqueueing, dequeueing, and response storage.
 */

import type { RateLimitedRequest, ProcessedResponse } from './types';

declare module '@/lib/ai/middleware/key-rate-limiter/queue-manager' {
  /**
   * Manager for rate limit queues and response storage.
   */
  export class RateLimitQueueManager {
    /**
     * Returns a singleton instance using a Symbol-backed global registry.
     * This avoids duplicate instances across HMR, SSR, or multi-bundle scenarios.
     * @returns {RateLimitQueueManager} The singleton instance.
     */
    static getInstance(): RateLimitQueueManager;

    /**
     * Enqueues a rate limited request for later processing.
     * @param request - The request to enqueue.
     */
    enqueueRequest(request: RateLimitedRequest): Promise<void>;

    /**
     * Dequeues requests from a specific generation and model classification queue.
     * @param generation - The generation queue identifier (1 or 2).
     * @param modelClassification - The model classification.
     * @param maxCount - Maximum number of requests to dequeue (default: 10).
     * @returns Array of dequeued requests.
     */
    dequeueRequests(
      generation: 1 | 2,
      modelClassification: string,
      maxCount?: number,
    ): Promise<RateLimitedRequest[]>;

    /**
     * Gets the current size of a specific queue.
     * @param generation - The generation queue identifier (1 or 2).
     * @param modelClassification - The model classification.
     * @returns The number of items in the queue.
     */
    getQueueSize(
      generation: 1 | 2,
      modelClassification: string,
    ): Promise<number>;

    /**
     * Stores a processed response for retrieval by the client.
     * @param response - The processed response to store.
     */
    storeResponse(response: ProcessedResponse): Promise<void>;

    /**
     * Retrieves a stored response by request ID.
     * @param requestId - The ID of the request.
     * @returns The processed response or null if not found.
     */
    getResponse(requestId: string): Promise<ProcessedResponse | null>;

    /**
     * Removes a stored response.
     * @param requestId - The ID of the request.
     */
    removeResponse(requestId: string): Promise<void>;

    /**
     * Checks if a request exists in either the queue or response storage.
     * @param requestId - The ID of the request.
     * @returns True if the request exists, false otherwise.
     */
    checkIfRequestExists(requestId: string): Promise<boolean>;
  }

  /**
   * The global singleton instance of the RateLimitQueueManager.
   */
  export const rateLimitQueueManager: RateLimitQueueManager;
}
