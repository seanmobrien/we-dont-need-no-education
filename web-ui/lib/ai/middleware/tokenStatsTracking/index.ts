/**
 * Token Statistics Tracking Module
 * 
 * This module provides comprehensive token consumption tracking and quota management
 * for AI model usage. It includes:
 * 
 * - Real-time token usage tracking per model/provider
 * - Sliding window statistics (minute, hour, day)
 * - Quota configuration and enforcement
 * - Redis caching for fast access
 * - PostgreSQL persistence for system of record
 * 
 * @example Basic usage with middleware
 * ```typescript
 * import { tokenStatsMiddleware } from '@/lib/ai/middleware/tokenStatsTracking';
 * import { wrapLanguageModel } from 'ai';
 * 
 * const model = wrapLanguageModel({
 *   model: baseModel,
 *   middleware: tokenStatsMiddleware({ enableQuotaEnforcement: true })
 * });
 * ```
 * 
 * @example Direct service usage
 * ```typescript
 * import { getTokenStatsService } from '@/lib/ai/middleware/tokenStatsTracking';
 * 
 * // Check quota before making a request
 * const quotaCheck = await getTokenStatsService().checkQuota('azure', 'hifi', 1000);
 * if (!quotaCheck.allowed) {
 *   throw new Error(quotaCheck.reason);
 * }
 * 
 * // Record usage after a successful request
 * await getTokenStatsService().safeRecordTokenUsage('azure', 'hifi', {
 *   promptTokens: 100,
 *   completionTokens: 200,
 *   totalTokens: 300
 * });
 * 
 * // Get current statistics
 * const stats = await getTokenStatsService().getTokenStats('azure', 'hifi');
 * console.log(`Current minute usage: ${stats.currentMinuteTokens}`);
 * ```
 */

export {
  getInstance as getTokenStatsService,
} from './token-stats-service';

export {
  type TokenUsageData,
  type ModelQuota,
  type TokenStats,
  type QuotaCheckResult,
  type TokenStatsMiddlewareConfig,
  type TokenStatsServiceType
} from './types';

export {
  tokenStatsMiddleware,
  tokenStatsWithQuotaMiddleware,
  tokenStatsLoggingOnlyMiddleware,
} from './tokenStatsMiddleware';