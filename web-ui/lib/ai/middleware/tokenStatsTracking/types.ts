export interface TokenUsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedTokens?: number;
}

export interface ModelQuota {
  id: string;
  provider: string;
  modelName: string;
  maxTokensPerMessage?: number;
  maxTokensPerMinute?: number;
  maxTokensPerDay?: number;
  isActive: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: TokenStats;
  quota?: ModelQuota;
  tryAgainAfter?: Date;
}

export interface TokenStats {
  currentMinuteTokens: number;
  lastHourTokens: number;
  last24HoursTokens: number;
  requestCount: number;
}
/**
 * Middleware configuration for token statistics tracking
 */
export interface TokenStatsMiddlewareConfig {
  enableLogging?: boolean;
  enableQuotaEnforcement?: boolean;
  // Provider and model can be overridden, otherwise extracted from model ID
  provider?: string;
  modelName?: string;
}

export type QuotaEnforcementError = Error & {
  quota?: QuotaCheckResult
};
