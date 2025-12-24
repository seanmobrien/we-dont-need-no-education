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

declare module '@/lib/ai/middleware/tokenStatsTracking/types' {
  /**
   * Represents token usage data for a single request or operation.
   * Used to record prompt, completion, and total tokens consumed.
   */
  export interface TokenUsageData {
    /** Number of tokens used for the prompt. */
    promptTokens: number;
    /** Number of tokens used for the completion. */
    completionTokens: number;
    /** Total tokens used (prompt + completion). */
    totalTokens: number;
    /** Optional estimated token count (for streaming or partial requests). */
    estimatedTokens?: number;
  }

  /**
   * Represents quota configuration for a specific model and provider.
   * Used to enforce limits on token usage per message, minute, or day.
   */
  export interface ModelQuota {
    /** Unique identifier for the quota record. */
    id: string;
    /** Provider ID (e.g., 'azure', 'google'). */
    provider: string;
    /** Model name (e.g., 'hifi', 'gemini-pro'). */
    modelName: string;
    /** Maximum tokens allowed per message/request. */
    maxTokensPerMessage?: number;
    /** Maximum tokens allowed per minute. */
    maxTokensPerMinute?: number;
    /** Maximum tokens allowed per day. */
    maxTokensPerDay?: number;
    /** Whether the quota is currently enforced. */
    isActive: boolean;
  }

  /**
   * Result of a quota check operation.
   * Indicates whether a request is allowed, the reason for denial, current usage, and quota details.
   */
  export interface QuotaCheckResult {
    /** Whether the request is allowed under current quota. */
    allowed: boolean;
    /** Optional reason for denial (e.g., 'Rate limit exceeded'). */
    reason?: string;
    /** Current token usage statistics. */
    currentUsage?: TokenStats;
    /** Quota configuration used for the check. */
    quota?: ModelQuota;
    /** Optional timestamp indicating when to retry. */
    tryAgainAfter?: Date;
  }

  /**
   * Aggregated token usage statistics for a provider/model.
   * Used for reporting and quota enforcement.
   */
  export interface TokenStats {
    /** Tokens used in the current minute. */
    currentMinuteTokens: number;
    /** Tokens used in the last hour. */
    lastHourTokens: number;
    /** Tokens used in the last 24 hours. */
    last24HoursTokens: number;
    /** Number of requests made in the tracked period. */
    requestCount: number;
  }

  /**
   * Configuration options for the token statistics tracking middleware.
   * Allows enabling logging, quota enforcement, and overriding provider/model.
   */
  export interface TokenStatsMiddlewareConfig {
    /** Enable verbose logging for token usage. */
    enableLogging?: boolean;
    /** Enable quota enforcement logic. */
    enableQuotaEnforcement?: boolean;
    /** Override provider for the middleware (default: extracted from model ID). */
    provider?: string;
    /** Override model name for the middleware (default: extracted from model ID). */
    modelName?: string;
  }

  /**
   * Error type for quota enforcement failures.
   * Extends the standard Error object and includes quota check result details.
   */
  export type QuotaEnforcementError = Error & {
    /** Quota check result associated with the error. */
    quota?: QuotaCheckResult;
  };

  /**
   * Response type for provider/model operations.
   * Used to return provider/model information and error details from service methods.
   */
  export type ProviderModelResponse = {
    /** Optional error object if the operation failed. */
    error?: unknown;
    /** Unique provider identifier. */
    providerId: string;
    /** Provider name. */
    provider: string;
    /** Model name. */
    modelName: string;
    /** Function to rethrow the error if needed. */
    rethrow: () => void;
  };

  /**
   * Type representing all public members of TokenStatsService.
   * Used for strong typing of the TokenStatsService singleton and for mocking in tests.
   */
  export type TokenStatsServiceType = {
    /** Retrieves quota configuration for a provider/model. */
    getQuota(provider: string, modelName: string): Promise<ModelQuota | null>;
    /** Retrieves token usage statistics for a provider/model. */
    getTokenStats(provider: string, modelName: string): Promise<TokenStats>;
    /** Checks if a token usage request is allowed under current quota. */
    checkQuota(
      provider: string,
      modelName: string,
      requestedTokens: number,
    ): Promise<QuotaCheckResult>;
    /** Safely records token usage for a provider/model. */
    safeRecordTokenUsage(
      provider: string,
      modelName: string,
      usage: TokenUsageData,
    ): Promise<void>;
    /** Retrieves a comprehensive usage report for a provider/model. */
    getUsageReport(
      provider: string,
      modelName: string,
    ): Promise<{
      quota: ModelQuota | null;
      currentStats: TokenStats;
      quotaCheckResult: QuotaCheckResult;
    }>;
  };
}
