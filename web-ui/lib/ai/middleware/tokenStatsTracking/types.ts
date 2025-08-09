/**
 * @module lib/ai/middleware/tokenStatsTracking/types
 * @fileoverview
 * TypeScript interfaces and types for token usage tracking, quota enforcement, and provider/model responses
 * in the AI middleware system. These types are used throughout the token statistics tracking middleware,
 * service, and related components to ensure type safety and consistent data structures.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

/**
 * Represents token usage data for a single request or operation.
 * Used to record prompt, completion, and total tokens consumed.
 *
 * @property {number} promptTokens - Number of tokens used for the prompt.
 * @property {number} completionTokens - Number of tokens used for the completion.
 * @property {number} totalTokens - Total tokens used (prompt + completion).
 * @property {number} [estimatedTokens] - Optional estimated token count (for streaming or partial requests).
 */
export interface TokenUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedTokens?: number;
}

/**
 * Represents quota configuration for a specific model and provider.
 * Used to enforce limits on token usage per message, minute, or day.
 *
 * @property {string} id - Unique identifier for the quota record.
 * @property {string} provider - Provider ID (e.g., 'azure', 'google').
 * @property {string} modelName - Model name (e.g., 'hifi', 'gemini-pro').
 * @property {number} [maxTokensPerMessage] - Maximum tokens allowed per message/request.
 * @property {number} [maxTokensPerMinute] - Maximum tokens allowed per minute.
 * @property {number} [maxTokensPerDay] - Maximum tokens allowed per day.
 * @property {boolean} isActive - Whether the quota is currently enforced.
 */
export interface ModelQuota {
  id: string;
  provider: string;
  modelName: string;
  maxTokensPerMessage?: number;
  maxTokensPerMinute?: number;
  maxTokensPerDay?: number;
  isActive: boolean;
}

/**
 * Result of a quota check operation.
 * Indicates whether a request is allowed, the reason for denial, current usage, and quota details.
 *
 * @property {boolean} allowed - Whether the request is allowed under current quota.
 * @property {string} [reason] - Optional reason for denial (e.g., 'Rate limit exceeded').
 * @property {TokenStats} [currentUsage] - Current token usage statistics.
 * @property {ModelQuota} [quota] - Quota configuration used for the check.
 * @property {Date} [tryAgainAfter] - Optional timestamp indicating when to retry.
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: TokenStats;
  quota?: ModelQuota;
  tryAgainAfter?: Date;
}

/**
 * Aggregated token usage statistics for a provider/model.
 * Used for reporting and quota enforcement.
 *
 * @property {number} currentMinuteTokens - Tokens used in the current minute.
 * @property {number} lastHourTokens - Tokens used in the last hour.
 * @property {number} last24HoursTokens - Tokens used in the last 24 hours.
 * @property {number} requestCount - Number of requests made in the tracked period.
 */
export interface TokenStats {
  currentMinuteTokens: number;
  lastHourTokens: number;
  last24HoursTokens: number;
  requestCount: number;
}

/**
 * Configuration options for the token statistics tracking middleware.
 * Allows enabling logging, quota enforcement, and overriding provider/model.
 *
 * @property {boolean} [enableLogging] - Enable verbose logging for token usage.
 * @property {boolean} [enableQuotaEnforcement] - Enable quota enforcement logic.
 * @property {string} [provider] - Override provider for the middleware (default: extracted from model ID).
 * @property {string} [modelName] - Override model name for the middleware (default: extracted from model ID).
 */
export interface TokenStatsMiddlewareConfig {
  enableLogging?: boolean;
  enableQuotaEnforcement?: boolean;
  provider?: string;
  modelName?: string;
}

/**
 * Error type for quota enforcement failures.
 * Extends the standard Error object and includes quota check result details.
 *
 * @property {QuotaCheckResult} [quota] - Quota check result associated with the error.
 */
export type QuotaEnforcementError = Error & {
  quota?: QuotaCheckResult
};

/**
 * Response type for provider/model operations.
 * Used to return provider/model information and error details from service methods.
 *
 * @property {unknown} [error] - Optional error object if the operation failed.
 * @property {string} providerId - Unique provider identifier.
 * @property {string} provider - Provider name.
 * @property {string} modelName - Model name.
 * @property {() => void} rethrow - Function to rethrow the error if needed.
 */
export type ProviderModelResponse = {
  error?: unknown;
  providerId: string;
  provider: string;
  modelName: string;
  rethrow: () => void;
};

/**
 * Type representing all public members of TokenStatsService.
 * Used for strong typing of the TokenStatsService singleton and for mocking in tests.
 *
 * @property {function} getQuota - Retrieves quota configuration for a provider/model.
 * @property {function} getTokenStats - Retrieves token usage statistics for a provider/model.
 * @property {function} checkQuota - Checks if a token usage request is allowed under current quota.
 * @property {function} safeRecordTokenUsage - Safely records token usage for a provider/model.
 * @property {function} getUsageReport - Retrieves a comprehensive usage report for a provider/model.
 */
export type TokenStatsServiceType = {
  getQuota(provider: string, modelName: string): Promise<ModelQuota | null>;
  getTokenStats(provider: string, modelName: string): Promise<TokenStats>;
  checkQuota(
    provider: string,
    modelName: string,
    requestedTokens: number
  ): Promise<QuotaCheckResult>;
  safeRecordTokenUsage(
    provider: string,
    modelName: string,
    usage: TokenUsageData
  ): Promise<void>;
  getUsageReport(
    provider: string,
    modelName: string
  ): Promise<{
    quota: ModelQuota | null;
    currentStats: TokenStats;
    quotaCheckResult: QuotaCheckResult;
  }>;
};