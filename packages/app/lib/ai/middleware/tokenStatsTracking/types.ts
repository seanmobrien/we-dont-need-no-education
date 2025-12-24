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

export interface TokenStatsMiddlewareConfig {
  enableLogging?: boolean;
  enableQuotaEnforcement?: boolean;
  provider?: string;
  modelName?: string;
}

export type QuotaEnforcementError = Error & {
  quota?: QuotaCheckResult
};

export type ProviderModelResponse = {
  error?: unknown;
  providerId: string;
  provider: string;
  modelName: string;
  rethrow: () => void;
};

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