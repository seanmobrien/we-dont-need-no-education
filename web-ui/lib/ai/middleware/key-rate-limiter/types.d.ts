/**
 * @fileoverview Type definitions for Key Rate Limiter Middleware.
 *
 * This module defines the core interfaces and types used by the rate limiting system,
 * including request structures, response formats, metrics, and configuration options.
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

declare module '@/lib/ai/middleware/key-rate-limiter/types' {
  /**
   * Represents a request that has been rate limited and queued.
   */
  export interface RateLimitedRequest {
    /** Unique identifier for the request */
    id: string;
    /** Classification of the model being requested (e.g., 'hifi', 'lofi') */
    modelClassification: string;
    /** The original request parameters */
    request: {
      params: unknown;
      messages: unknown;
    };
    /** Metadata associated with the request */
    metadata: {
      chatHistoryId?: string;
      chatTurnId?: string;
      userId?: string;
      retryAfter?: number;
      submittedAt: string;
      /** Generation queue identifier (1 or 2) */
      generation: 1 | 2;
    };
  }

  /**
   * Represents the result of a processed request.
   */
  export interface ProcessedResponse {
    /** Request identifier */
    id: string;
    /** Successful response data */
    response?: unknown;
    /** Error details if the request failed */
    error?: {
      type: 'rate_limit' | 'server_error' | 'censored' | 'will_not_retry';
      message: string;
      retryAfter?: number;
    };
    /** Timestamp when processing completed */
    processedAt: string;
  }

  /**
   * Metrics tracked for rate limiting performance.
   */
  export interface RateLimitMetrics {
    messagesProcessed: number;
    operationDurationMs: number;
    queueSize: number;
    errorCount: number;
  }

  /**
   * Supported model classifications.
   */
  export type ModelClassification =
    | 'hifi'
    | 'lofi'
    | 'completions'
    | 'embedding';

  /**
   * Configuration for model failover strategies.
   */
  export type ModelFailoverConfig = {
    primaryProvider: 'azure' | 'google';
    fallbackProvider: 'azure' | 'google';
  };

  /**
   * Context provided to the retry middleware for rate limiting decisions.
   */
  export type RateLimitRetryContext = {
    modelClass: ModelClassification;
    failover: ModelFailoverConfig;
  };

  /**
   * Extended middleware type that includes rate limit context.
   */
  export type RetryRateLimitMiddlewareType = LanguageModelV2Middleware & {
    rateLimitContext: () => RateLimitRetryContext | undefined;
  };

  /**
   * Options for creating the rate limit middleware factory.
   */
  export type RateLimitFactoryOptions = {
    model: LanguageModel;
  };
}
