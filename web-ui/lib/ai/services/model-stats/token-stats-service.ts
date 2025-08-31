/**
 * @module lib/ai/middleware/tokenStatsTracking/tokenStatsService
 * @fileoverview
 * TokenStatsService provides centralized logic for tracking AI token consumption, enforcing quotas, and reporting usage statistics.
 * It integrates Redis for fast, sliding-window statistics and PostgreSQL for persistent system-of-record storage.
 * This module is used by AI middleware, model factories, and quota enforcement logic throughout the application.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { eq, and, sql } from 'drizzle-orm';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import {
  ModelQuota,
  ProviderModelResponse,
  QuotaCheckResult,
  TokenStats,
  TokenStatsServiceType,
  TokenUsageData,
} from '../../middleware/tokenStatsTracking/types';
import { ProviderMap } from './provider-map';

/**
 * Service for tracking token consumption statistics and enforcing quotas.
 * Uses Redis for fast access and PostgreSQL as system of record.
 *
 * @implements {TokenStatsServiceType}
 */
class TokenStatsService implements TokenStatsServiceType {
  /** Singleton instance of TokenStatsService. */
  private static instance: TokenStatsService | undefined = undefined;

  /** In-memory cache for model quotas, keyed by `${provider}:${modelName}`. */
  private quotaCache = new Map<string, ModelQuota>();

  /** Timestamp of last quota cache update (ms since epoch). */
  private lastQuotaCacheUpdate = 0;

  /** Quota cache time-to-live in milliseconds (default: 5 minutes). */
  private readonly QUOTA_CACHE_TTL = 5 * 60 * 1000;

  /** Private constructor for singleton pattern. */
  private constructor() {}

  /**
   * Reset the singleton instance (for testing or reinitialization).
   * @function
   */
  static reset(): void {
    this.instance = undefined;
  }

  /**
   * Get the singleton instance of TokenStatsService.
   * @returns {TokenStatsService} The singleton instance.
   * @function
   */
  static get Instance(): TokenStatsService {
    if (!TokenStatsService.instance) {
      TokenStatsService.instance = new TokenStatsService();
    }
    return TokenStatsService.instance;
  }

  /**
   * Get the Redis key for token statistics for a given provider/model and window type.
   * @param {string} provider - Provider ID (e.g., 'azure-openai.chat').
   * @param {string} modelName - Model name (e.g., 'gpt-4').
   * @param {string} windowType - Time window ('minute', 'hour', 'day').
   * @returns {string} Redis key for token stats.
   * @private
   */
  private getRedisStatsKey(
    provider: string,
    modelName: string,
    windowType: string,
  ): string {
    return `token_stats:${provider}:${modelName}:${windowType}`;
  }

  /**
   * Get the Redis key for quota information for a given provider/model.
   * @param {string} provider - Provider ID.
   * @param {string} modelName - Model name.
   * @returns {string} Redis key for quota.
   * @private
   */
  private getRedisQuotaKey(provider: string, modelName: string): string {
    return `token_quota:${provider}:${modelName}`;
  }

  /**
   * Normalize provider and model names for consistent storage and lookup.
   * Handles both separate and 'provider:model' formats.
   * @param {string} providerOrModel - Provider name or 'provider:model' string.
   * @param {string} [modelName] - Optional model name.
   * @returns {{provider: string, modelName: string}} Normalized provider and model name.
   * @private
   */
  private async normalizeModelKey(
    providerOrModel: string,
    modelName?: string,
  ): Promise<{ provider: string; modelName: string }> {
    if (providerOrModel.includes(':')) {
      const [providerPart, modelPart] = providerOrModel.split(':', 2);
      const normalizedModelName = modelPart.trim();
      const providerMap = await ProviderMap.getInstance();
      return {
        provider: providerMap.name(providerPart.trim()) ?? providerPart.trim(),
        modelName: normalizedModelName.length
          ? normalizedModelName
          : (modelName?.trim() ?? ''),
      };
    }
    return {
      provider: providerOrModel?.trim() ?? '',
      modelName: modelName?.trim() ?? '',
    };
  }

  /**
   * Normalize provider and model name, then retrieve the provider ID from ProviderMap.
   * @param {string} providerOrModel - Provider name or 'provider:model' string.
   * @param {string} [modelName] - Optional model name.
   * @returns {Promise<ProviderModelResponse>} Provider/model normalization result.
   * @private
   */
  private async normalizeProviderId(
    providerOrModel: string,
    modelName?: string,
  ): Promise<ProviderModelResponse> {
    const { provider, modelName: modelNameFromKey } =
      await this.normalizeModelKey(providerOrModel, modelName);
    try {
      const providerMap = await ProviderMap.getInstance();
      const providerId = providerMap.id(provider);
      return {
        rethrow: () => {
          if (!providerId) {
            throw new Error(`Unknown provider: ${provider}`);
          }
        },
        providerId: providerId!,
        provider,
        modelName: modelNameFromKey ?? modelName ?? '',
      };
    } catch (error) {
      const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error normalizing provider ID',
        extra: { providerOrModel, modelName },
        source: 'TokenStatsService.normalizeProviderId',
      });
      return {
        rethrow: () => {
          throw loggedError;
        },
        providerId: undefined as unknown as string,
        provider,
        modelName: modelNameFromKey ?? modelName ?? '',
      };
    }
  }

  /**
   * Get quota configuration for a provider/model from cache, Redis, or database.
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<ModelQuota|null>} Quota configuration or null if not found.
   */
  async getQuota(
    provider: string,
    modelName: string,
  ): Promise<ModelQuota | null> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);
    try {
      rethrow();
      const cacheKey = `${normalizedProvider}:${normalizedModel}`;

      // Check memory cache first
      if (
        this.quotaCache.has(cacheKey) &&
        Date.now() - this.lastQuotaCacheUpdate < this.QUOTA_CACHE_TTL
      ) {
        return this.quotaCache.get(cacheKey) || null;
      }

      // Try Redis cache
      const redis = await getRedisClient();
      const redisKey = this.getRedisQuotaKey(
        normalizedProvider!,
        normalizedModel,
      );
      const cached = await redis.get(redisKey);

      if (cached) {
        const quota = JSON.parse(cached) as ModelQuota;
        this.quotaCache.set(cacheKey, quota);
        return quota;
      }

      // Fallback to database
      const quota = await this.loadQuotaFromDatabase(
        normalizedProvider!,
        normalizedModel,
      );

      if (quota) {
        // Cache in Redis and memory
        await redis.setEx(redisKey, 300, JSON.stringify(quota)); // 5 minutes
        this.quotaCache.set(cacheKey, quota);
        this.lastQuotaCacheUpdate = Date.now();
      }

      return quota;
    } catch (error) {
      log((l) =>
        l.error('Error getting quota', {
          provider: provider,
          modelName: normalizedModel,
          error,
        }),
      );
      return null;
    }
  }

  /**
   * Load quota configuration from PostgreSQL database.
   * @param {string} provider - Provider ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<ModelQuota|null>} Quota configuration or null if not found.
   * @private
   */
  private async loadQuotaFromDatabase(
    provider: string,
    modelName: string,
  ): Promise<ModelQuota | null> {
    try {
      return await drizDbWithInit(async (db) => {
        const row = await db
          .select({
            id: schema.modelQuotas.id,
            providerId: schema.models.providerId,
            modelName: schema.models.modelName,
            maxTokensPerMessage: schema.modelQuotas.maxTokensPerMessage,
            maxTokensPerMinute: schema.modelQuotas.maxTokensPerMinute,
            maxTokensPerDay: schema.modelQuotas.maxTokensPerDay,
            isActive: schema.modelQuotas.isActive,
          })
          .from(schema.modelQuotas)
          .innerJoin(
            schema.models,
            eq(schema.modelQuotas.modelId, schema.models.id),
          )
          .where(
            and(
              eq(schema.models.providerId, provider),
              eq(schema.models.modelName, modelName),
            ),
          )
          .limit(1)
          .execute()
          .then((r) => r.at(0));

        if (!row) {
          return null;
        }
        return {
          id: row.id,
          provider: row.providerId,
          modelName: row.modelName,
          maxTokensPerMessage: row.maxTokensPerMessage || undefined,
          maxTokensPerMinute: row.maxTokensPerMinute || undefined,
          maxTokensPerDay: row.maxTokensPerDay || undefined,
          isActive: row.isActive,
        };
      });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error loading quota from database',
        extra: { provider, modelName },
        source: 'TokenStatsService.loadQuotaFromDatabase',
      });
      return null;
    }
  }

  /**
   * Get current token usage statistics for a provider/model from Redis.
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<TokenStats>} Aggregated token usage statistics.
   */
  async getTokenStats(
    provider: string,
    modelName: string,
  ): Promise<TokenStats> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);
    try {
      rethrow();

      const redis = await getRedisClient();

      // Get current stats from Redis sliding windows
      const currentMinuteKey = this.getRedisStatsKey(
        normalizedProvider,
        normalizedModel,
        'minute',
      );
      const lastHourKey = this.getRedisStatsKey(
        normalizedProvider,
        normalizedModel,
        'hour',
      );
      const last24HoursKey = this.getRedisStatsKey(
        normalizedProvider,
        normalizedModel,
        'day',
      );

      const [minuteData, hourData, dayData] = await Promise.all([
        redis.get(currentMinuteKey),
        redis.get(lastHourKey),
        redis.get(last24HoursKey),
      ]);

      return {
        currentMinuteTokens: minuteData
          ? JSON.parse(minuteData).totalTokens || 0
          : 0,
        lastHourTokens: hourData ? JSON.parse(hourData).totalTokens || 0 : 0,
        last24HoursTokens: dayData ? JSON.parse(dayData).totalTokens || 0 : 0,
        requestCount: minuteData ? JSON.parse(minuteData).requestCount || 0 : 0,
      };
    } catch (error) {
      log((l) =>
        l.error('Error getting token stats', {
          provider: normalizedProvider,
          modelName: normalizedModel,
          error,
        }),
      );
      return {
        currentMinuteTokens: 0,
        lastHourTokens: 0,
        last24HoursTokens: 0,
        requestCount: 0,
      };
    }
  }

  /**
   * Check if a token usage request would exceed quotas for a provider/model.
   * Returns a result indicating allowance, reason, and current usage.
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @param {number} requestedTokens - Number of tokens requested.
   * @returns {Promise<QuotaCheckResult>} Quota check result.
   */
  async checkQuota(
    provider: string,
    modelName: string,
    requestedTokens: number,
  ): Promise<QuotaCheckResult> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);

    try {
      rethrow();
      const [quota, currentStats] = await Promise.all([
        this.getQuota(normalizedProvider, normalizedModel),
        this.getTokenStats(normalizedProvider, normalizedModel),
      ]);

      // If no quota is configured, allow the request
      if (!quota) {
        return { allowed: true, currentUsage: currentStats };
      }

      // Check per-message limit
      if (
        quota.maxTokensPerMessage &&
        requestedTokens > quota.maxTokensPerMessage
      ) {
        return {
          allowed: false,
          reason: `Request tokens (${requestedTokens}) exceed per-message limit (${quota.maxTokensPerMessage})`,
          currentUsage: currentStats,
          quota,
        };
      }

      // Check per-minute limit
      if (
        quota.maxTokensPerMinute &&
        currentStats.currentMinuteTokens + requestedTokens >
          quota.maxTokensPerMinute
      ) {
        return {
          allowed: false,
          reason: `Request would exceed per-minute limit (${quota.maxTokensPerMinute})`,
          currentUsage: currentStats,
          quota,
        };
      }

      // Check daily limit
      if (
        quota.maxTokensPerDay &&
        currentStats.last24HoursTokens + requestedTokens > quota.maxTokensPerDay
      ) {
        return {
          allowed: false,
          reason: `Request would exceed daily limit (${quota.maxTokensPerDay})`,
          currentUsage: currentStats,
          quota,
        };
      }

      return { allowed: true, currentUsage: currentStats, quota };
    } catch (error) {
      log((l) =>
        l.error('Error checking quota', {
          provider: normalizedProvider,
          modelName: normalizedModel,
          error,
        }),
      );
      // On error, allow the request to avoid blocking legitimate usage
      return { allowed: true };
    }
  }

  /**
   * Safely record token usage for a provider/model.
   * Updates both Redis and PostgreSQL with sliding window statistics.
   * This method is guaranteed not to reject and can be safely ignored.
   *
   * @param {string} provider - Provider ID (e.g., 'azure-openai.chat').
   * @param {string} modelName - Model name (e.g., 'gpt-4').
   * @param {TokenUsageData} usage - Token usage data to record.
   * @returns {Promise<void>} Resolves when usage is recorded.
   * @throws Never - errors are handled internally.
   *
   * @example
   * await tokenStatsService.safeRecordTokenUsage('azure-openai.chat', 'gpt-4', {
   *   promptTokens: 100,
   *   completionTokens: 200,
   *   totalTokens: 300
   * });
   */
  async safeRecordTokenUsage(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);

    try {
      rethrow();
      await Promise.all([
        this.updateRedisStats(normalizedProvider, normalizedModel, usage),
        this.updateDatabaseStats(normalizedProvider, normalizedModel, usage),
      ]);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error recording token usage',
        extra: {
          provider: normalizedProvider,
          modelName: normalizedModel,
          usage,
        },
        source: 'TokenStatsService.safeRecordTokenUsage',
      });
    }
  }

  /**
   * Update Redis statistics for a provider/model with sliding windows.
   * @param {string} provider - Provider ID.
   * @param {string} modelName - Model name.
   * @param {TokenUsageData} usage - Token usage data.
   * @returns {Promise<void>} Resolves when Redis stats are updated.
   * @private
   */
  private async updateRedisStats(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);
    try {
      rethrow();
      const redis = await getRedisClient();
      const now = new Date();

      // Update each time window
      const windows = [
        {
          type: 'minute',
          duration: 60,
          start: new Date(Math.floor(now.getTime() / 60000) * 60000),
        },
        {
          type: 'hour',
          duration: 3600,
          start: new Date(Math.floor(now.getTime() / 3600000) * 3600000),
        },
        {
          type: 'day',
          duration: 86400,
          start: new Date(Math.floor(now.getTime() / 86400000) * 86400000),
        },
      ];

      for (const window of windows) {
        const key = this.getRedisStatsKey(
          normalizedProvider,
          normalizedModel,
          window.type,
        );

        // Use Redis transaction to atomically update stats
        const multi = redis.multi();

        // Get current data
        const currentData = await redis.get(key);
        const current = currentData
          ? JSON.parse(currentData)
          : {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              requestCount: 0,
              windowStart: window.start.toISOString(),
            };

        // Update stats
        const updated = {
          promptTokens: current.promptTokens + usage.promptTokens,
          completionTokens: current.completionTokens + usage.completionTokens,
          totalTokens: current.totalTokens + usage.totalTokens,
          requestCount: current.requestCount + 1,
          windowStart: window.start.toISOString(),
          lastUpdated: now.toISOString(),
        };

        // Set with appropriate TTL (window duration + buffer)
        multi.setEx(key, window.duration + 300, JSON.stringify(updated));
        await multi.exec();
      }
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to update Redis stats',
        extra: {
          provider: normalizedProvider,
          modelName: normalizedModel,
          usage,
        },
        source: 'TokenStatsService.updateRedisStats',
      });
    }
  }

  /**
   * Update PostgreSQL statistics for a provider/model for persistence.
   * @param {string} provider - Provider ID.
   * @param {string} modelName - Model name.
   * @param {TokenUsageData} usage - Token usage data.
   * @returns {Promise<void>} Resolves when database stats are updated.
   * @private
   */
  private async updateDatabaseStats(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    try {
      await drizDbWithInit(async (db) => {
        const now = new Date();

        const model = await db.query.models.findFirst({
          where: and(
            eq(schema.models.providerId, provider),
            eq(schema.models.modelName, modelName),
            eq(schema.models.isActive, true),
          ),
        });
        if (!model) {
          throw new Error(`Model not found: ${provider}:${modelName}`);
        }

        // Update each time window in the database
        const windows = [
          {
            type: 'minute',
            start: new Date(Math.floor(now.getTime() / 60000) * 60000),
          },
          {
            type: 'hour',
            start: new Date(Math.floor(now.getTime() / 3600000) * 3600000),
          },
          {
            type: 'day',
            start: new Date(Math.floor(now.getTime() / 86400000) * 86400000),
          },
        ];

        for (const window of windows) {
          const windowEnd = new Date(window.start.getTime());
          if (window.type === 'minute')
            windowEnd.setMinutes(windowEnd.getMinutes() + 1);
          else if (window.type === 'hour')
            windowEnd.setHours(windowEnd.getHours() + 1);
          else windowEnd.setDate(windowEnd.getDate() + 1);

          // Use upsert to update or insert stats
          await db
            .insert(schema.tokenConsumptionStats)
            .values({
              modelId: model.id,
              windowStart: window.start.toISOString(),
              windowEnd: windowEnd.toISOString(),
              windowType: window.type,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              requestCount: 1,
            })
            .onConflictDoUpdate({
              target: [
                schema.tokenConsumptionStats.modelId,
                schema.tokenConsumptionStats.windowStart,
                schema.tokenConsumptionStats.windowType,
              ],
              set: {
                promptTokens: sql`${schema.tokenConsumptionStats.promptTokens} + ${usage.promptTokens}`,
                completionTokens: sql`${schema.tokenConsumptionStats.completionTokens} + ${usage.completionTokens}`,
                totalTokens: sql`${schema.tokenConsumptionStats.totalTokens} + ${usage.totalTokens}`,
                requestCount: sql`${schema.tokenConsumptionStats.requestCount} + 1`,
                lastUpdated: new Date().toISOString(),
              },
            });
        }
      });
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to update database stats.',
        data: { provider, modelName, usage },
        source: 'TokenStatsService.updateDatabaseStats',
      });
    }
  }

  /**
   * Get a comprehensive token usage report for a provider/model.
   * Includes quota, current stats, and quota check result.
   * @param {string} provider - Provider name or ID.
   * @param {string} modelName - Model name.
   * @returns {Promise<{quota: ModelQuota|null, currentStats: TokenStats, quotaCheckResult: QuotaCheckResult}>}
   *   Usage report object.
   */
  async getUsageReport(
    provider: string,
    modelName: string,
  ): Promise<{
    quota: ModelQuota | null;
    currentStats: TokenStats;
    quotaCheckResult: QuotaCheckResult;
  }> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await this.normalizeProviderId(provider, modelName);
    try {
      rethrow();
      const [quota, currentStats] = await Promise.all([
        this.getQuota(normalizedProvider, normalizedModel),
        this.getTokenStats(normalizedProvider, normalizedModel),
      ]);

      const quotaCheckResult = await this.checkQuota(
        normalizedProvider,
        normalizedModel,
        0,
      );

      return { quota, currentStats, quotaCheckResult };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Get the singleton instance of TokenStatsService as TokenStatsServiceType.
 * @returns {TokenStatsServiceType} The singleton instance.
 */
export const getInstance = (): TokenStatsServiceType =>
  TokenStatsService.Instance;

/**
 * Reset the singleton instance of TokenStatsService.
 * @returns {void}
 */
export const reset = (): void => TokenStatsService.reset();
