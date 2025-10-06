/**
 * @fileoverview TypeScript type definitions for application statistics and analytics
 *
 * This module defines the data structures used for collecting, processing, and displaying
 * statistics related to AI model usage, token consumption, request queuing, and system performance.
 * These types are used throughout the application for monitoring, analytics, and user-facing
 * statistics dashboards.
 *
 * The module includes types for:
 * - AI model statistics and usage tracking
 * - Token consumption metrics (prompt, completion, total)
 * - Request queuing and processing information
 * - API response structures for statistics endpoints
 *
 * @example
 * ```typescript
 * import type { ModelStat, StatisticsData } from '/types/statistics';
 *
 * // Working with model statistics
 * const modelStats: ModelStat[] = await fetchModelStats();
 * const activeModels = modelStats.filter(model => model.isActive);
 *
 * // Processing statistics data
 * const stats: StatisticsData = await fetchStatistics();
 * console.log('Total pending requests:', stats.queues.summary.totalPending);
 * ```
 *
 * @example
 * ```typescript
 * import type { TokenStats, QueueRequest } from '/types/statistics';
 *
 * // Analyzing token usage
 * const hourlyStats: TokenStats = {
 *   promptTokens: 1500,
 *   completionTokens: 800,
 *   totalTokens: 2300,
 *   requestCount: 5
 * };
 *
 * // Processing queued requests
 * const request: QueueRequest = {
 *   id: 'req-123',
 *   modelClassification: 'gpt-4',
 *   request: {
 *     params: {},
 *     messages: [{ role: 'user', content: 'Hello' }]
 *   },
 *   metadata: {
 *     submittedAt: '2025-01-01T00:00:00Z',
 *     generation: 1,
 *     chatHistoryId: 'chat-123',
 *     userId: 'user-456'
 *   },
 *   queueTime: 30000,
 *   tokenEstimate: 500
 * };
 * ```
 */

/**
 * Statistics for an individual AI model including usage metrics and availability.
 */
export interface ModelStat {
  /** Unique identifier for the model */
  id: string;
  /** Internal model name used by the provider */
  modelName: string;
  /** Human-readable display name for the model */
  displayName: string;
  /** Detailed description of the model's capabilities */
  description: string;
  /** Whether the model is currently active and available for use */
  isActive: boolean;
  /** Unique identifier of the AI provider */
  providerId: string;
  /** Internal name of the AI provider */
  providerName: string;
  /** Human-readable name of the AI provider */
  providerDisplayName: string;
  /** Maximum tokens allowed per message for this model */
  maxTokensPerMessage: number;
  /** Maximum tokens allowed per minute for rate limiting */
  maxTokensPerMinute: number;
  /** Maximum tokens allowed per day for rate limiting */
  maxTokensPerDay: number;
  /** Unique key used to identify this model in the system */
  modelKey: string;
  /** Whether the model is currently available for requests */
  available: boolean;
  /** Token usage statistics across different time periods */
  stats: {
    minute: TokenStats;
    hour: TokenStats;
    day: TokenStats;
  };
}

/**
 * Token usage statistics for a specific time period.
 */
export interface TokenStats {
  /** Number of tokens used for prompts/input */
  promptTokens: number;
  /** Number of tokens used for completions/output */
  completionTokens: number;
  /** Total number of tokens used (prompt + completion) */
  totalTokens: number;
  /** Number of requests made in this time period */
  requestCount: number;
}

/**
 * Represents a request waiting in the processing queue.
 */
export interface QueueRequest {
  /** Unique identifier for the queued request */
  id: string;
  /** Classification/category of the model being requested */
  modelClassification: string;
  /** The actual request data including parameters and messages */
  request: {
    params: Record<string, unknown>;
    messages: Array<{ role?: string; content?: string }>;
  };
  /** Metadata associated with the request */
  metadata: {
    submittedAt: string;
    generation: 1 | 2;
    chatHistoryId?: string;
    userId?: string;
  };
  /** Time in milliseconds the request has been in queue */
  queueTime: number;
  /** Estimated number of tokens this request will consume */
  tokenEstimate?: number;
}

/**
 * Statistics for a generation queue containing multiple requests.
 */
export interface QueueGenerationStats {
  /** Number of requests currently in this queue */
  size: number;
  /** Array of all requests in the queue */
  requests: QueueRequest[];
  /** Timestamp of the oldest request in the queue */
  oldestRequest?: Date;
  /** Timestamp of the newest request in the queue */
  newestRequest?: Date;
  /** Average size of requests in this queue */
  averageSize: number;
  /** The largest request in the queue by token estimate */
  largestRequest?: QueueRequest;
}

/**
 * Information about a specific queue classification.
 */
export interface QueueInfo {
  /** The classification/category name for this queue */
  classification: string;
  /** Statistics for different generation types */
  queues: {
    generation1: QueueGenerationStats;
    generation2: QueueGenerationStats;
  };
  /** Total number of pending requests across all generations */
  totalPending: number;
}

/**
 * Summary of queue statistics across all classifications.
 */
export interface QueueSummary {
  /** Total number of pending requests across all queues */
  totalPending: number;
  /** Number of generation 1 requests pending */
  totalGen1: number;
  /** Number of generation 2 requests pending */
  totalGen2: number;
}

/**
 * Complete statistics data structure returned by the statistics API.
 */
export interface StatisticsData {
  /** Array of statistics for all available models */
  models: ModelStat[];
  /** Queue statistics and information */
  queues: {
    summary: QueueSummary;
    queues: QueueInfo[];
  };
}

/**
 * Generic API response wrapper for statistics endpoints.
 *
 * @template T - The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** Whether the API request was successful */
  success: boolean;
  /** The response data payload */
  data: T;
  /** Error message if the request failed */
  error?: string;
  /** ISO timestamp of when the response was generated */
  timestamp?: string;
}
