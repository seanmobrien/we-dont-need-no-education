/**
 * @fileoverview Types and error classes for the FIFO rate-aware model queue system
 */

import { LanguageModelV2 } from '@ai-sdk/provider';

/**
 * Status of a queued request
 */
export type QueuedRequestStatus = 'pending' | 'processing';

/**
 * Method type for language model operations
 */
export type LanguageModelMethod =
  | 'generateText'
  | 'generateObject'
  | 'streamText'
  | 'streamObject';

/**
 * Configuration options for LanguageModelQueue constructor
 */
export interface LanguageModelQueueOptions {
  /** The language model the queue is attached to */
  model: LanguageModelV2;
  /** Maximum number of concurrent requests the queue will run */
  maxConcurrentRequests: number;
}

/**
 * A queued request record stored in Redis
 */
export interface QueuedRequest {
  /** Unique request identifier */
  id: string;
  /** Model type from the LanguageModelV2 */
  modelType: string;
  /** Method used to queue the request */
  method: LanguageModelMethod;
  /** Request parameters */
  params: unknown;
  /** Number of tokens needed to process the request */
  tokenCount: number;
  /** User ID making the request */
  userId: string;
  /** Status of the request */
  status: QueuedRequestStatus;
  /** Datetime the request was added to the queue */
  queuedAt: string;
  /** Datetime processing began (only set when status is 'processing') */
  processingStartedAt?: string;
  /** Queue instance ID of the queue processing the request */
  processingQueueInstanceId?: string;
}

/**
 * Model capacity tracking information
 */
export interface ModelCapacity {
  /** Available tokens per minute */
  tokensPerMinute: number;
  /** Available requests per minute */
  requestsPerMinute?: number;
  /** Timestamp when capacity was last updated */
  lastUpdated: string;
  /** Timestamp when capacity will reset (for rate limit scenarios) */
  resetAt?: string;
}

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  /** Remaining tokens from x-ratelimit-remaining-tokens header */
  remainingTokens?: number;
  /** Remaining requests from x-ratelimit-remaining-requests header */
  remainingRequests?: number;
  /** Retry after datetime from x-retry-after header */
  retryAfter?: string;
}

/**
 * Queue processing metrics for Application Insights
 */
export interface QueueMetrics {
  /** Number of requests currently being processed */
  activeRequests: number;
  /** Total number of requests in the queue */
  queueSize: number;
  /** Available model token capacity */
  availableTokens: number;
  /** Queue instance ID */
  queueInstanceId: string;
  /** Model type */
  modelType: string;
}
