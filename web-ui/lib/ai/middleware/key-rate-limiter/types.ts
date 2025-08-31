import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { LanguageModel } from 'ai';

export interface RateLimitedRequest {
  id: string;
  modelClassification: string;
  request: {
    params: unknown;
    messages: unknown;
  };
  metadata: {
    chatHistoryId?: string;
    chatTurnId?: string;
    userId?: string;
    retryAfter?: number;
    submittedAt: string;
    generation: 1 | 2; // gen-1 or gen-2 retry queue
  };
}

export interface ProcessedResponse {
  id: string;
  response?: unknown;
  error?: {
    type: 'rate_limit' | 'server_error' | 'censored' | 'will_not_retry';
    message: string;
    retryAfter?: number;
  };
  processedAt: string;
}

export interface RateLimitMetrics {
  messagesProcessed: number;
  operationDurationMs: number;
  queueSize: number;
  errorCount: number;
}

export type ModelClassification = 'hifi' | 'lofi' | 'completions' | 'embedding';

export interface ModelFailoverConfig {
  primaryProvider: 'azure' | 'google';
  fallbackProvider: 'azure' | 'google';
  // modelClassification: ModelClassification;
}

export type RateLimitRetryContext = {
  modelClass: ModelClassification;
  failover: ModelFailoverConfig;
};

export type RetryRateLimitMiddlewareType = LanguageModelV2Middleware & {
  rateLimitContext: () => RateLimitRetryContext | undefined;
};

export type RateLimitFactoryOptions = {
  model: LanguageModel;
};
