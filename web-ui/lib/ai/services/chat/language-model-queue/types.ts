import { LanguageModelV2 } from '@ai-sdk/provider';

export type QueuedRequestStatus = 'pending' | 'processing';

export type LanguageModelMethod =
  | 'generateText'
  | 'generateObject'
  | 'streamText'
  | 'streamObject';

export interface LanguageModelQueueOptions {
  model: LanguageModelV2;
  maxConcurrentRequests: number;
}

export interface QueuedRequest {
  id: string;
  modelType: string;
  method: LanguageModelMethod;
  params: unknown;
  tokenCount: number;
  userId: string;
  status: QueuedRequestStatus;
  queuedAt: string;
  processingStartedAt?: string;
  processingQueueInstanceId?: string;
}

export interface ModelCapacity {
  tokensPerMinute: number;
  requestsPerMinute?: number;
  lastUpdated: string;
  resetAt?: string;
}

export interface RateLimitInfo {
  remainingTokens?: number;
  remainingRequests?: number;
  retryAfter?: string;
}

export interface QueueMetrics {
  activeRequests: number;
  queueSize: number;
  availableTokens: number;
  queueInstanceId: string;
  modelType: string;
}
