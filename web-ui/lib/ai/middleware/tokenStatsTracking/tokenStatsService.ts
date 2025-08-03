import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { modelQuotas, models, tokenConsumptionStats } from '@/drizzle/schema';
import { eq, and,  sql } from 'drizzle-orm';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { ModelQuota, QuotaCheckResult, TokenStats, TokenUsageData } from './types';



/**
 * Service for tracking token consumption statistics and enforcing quotas
 * Uses Redis for fast access and PostgreSQL as system of record
 */
export class TokenStatsService {
  private static instance: TokenStatsService;
  private quotaCache = new Map<string, ModelQuota>();
  private lastQuotaCacheUpdate = 0;
  private readonly QUOTA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): TokenStatsService {
    if (!TokenStatsService.instance) {
      TokenStatsService.instance = new TokenStatsService();
    }
    return TokenStatsService.instance;
  }

  /**
   * Get Redis key for token statistics
   */
  private getRedisStatsKey(provider: string, modelName: string, windowType: string): string {
    return `token_stats:${provider}:${modelName}:${windowType}`;
  }

  /**
   * Get Redis key for quota information
   */
  private getRedisQuotaKey(provider: string, modelName: string): string {
    return `token_quota:${provider}:${modelName}`;
  }

  /**
   * Normalize provider and model names for consistent storage
   */
  private normalizeModelKey(provider: string, modelName: string): { provider: string; modelName: string } {
    // Handle provider:model format
    if (modelName.includes(':')) {
      const [providerPart, modelPart] = modelName.split(':', 2);
      return { provider: providerPart, modelName: modelPart };
    }
    return { provider, modelName };
  }

  /**
   * Get quota configuration from cache or database
   */
  async getQuota(provider: string, modelName: string): Promise<ModelQuota | null> {
    const { provider: normalizedProvider, modelName: normalizedModel } = this.normalizeModelKey(provider, modelName);
    const cacheKey = `${normalizedProvider}:${normalizedModel}`;
    
    // Check memory cache first
    if (this.quotaCache.has(cacheKey) && Date.now() - this.lastQuotaCacheUpdate < this.QUOTA_CACHE_TTL) {
      return this.quotaCache.get(cacheKey) || null;
    }

    try {
      // Try Redis cache
      const redis = await getRedisClient();
      const redisKey = this.getRedisQuotaKey(normalizedProvider, normalizedModel);
      const cached = await redis.get(redisKey);
      
      if (cached) {
        const quota = JSON.parse(cached) as ModelQuota;
        this.quotaCache.set(cacheKey, quota);
        return quota;
      }

      // Fallback to database
      const quota = await this.loadQuotaFromDatabase(normalizedProvider, normalizedModel);
      
      if (quota) {
        // Cache in Redis and memory
        await redis.setEx(redisKey, 300, JSON.stringify(quota)); // 5 minutes
        this.quotaCache.set(cacheKey, quota);
        this.lastQuotaCacheUpdate = Date.now();
      }

      return quota;
    } catch (error) {
      log(l => l.error('Error getting quota', { provider: normalizedProvider, modelName: normalizedModel, error }));
      return null;
    }
  }

  /**
   * Load quota configuration from PostgreSQL
   */
  private async loadQuotaFromDatabase(provider: string, modelName: string): Promise<ModelQuota | null> {
    try {
      return await drizDbWithInit(async (db) => {
        const row = await db.query.modelQuotas.findFirst({
          with: {
            model: true, // Include quota details
          },
          where: and(
            eq(models.providerId, provider),
            eq(models.modelName, modelName),
            eq(models.isActive, true),
            eq(modelQuotas.isActive, true),
          ),
        });
        if (!row) {
          return null;
        }
        return {
          id: row.id,
          provider: row.model.providerId,
          modelName: row.model.modelName,
          maxTokensPerMessage: row.maxTokensPerMessage || undefined,
          maxTokensPerMinute: row.maxTokensPerMinute || undefined,
          maxTokensPerDay: row.maxTokensPerDay || undefined,
          isActive: row.isActive, // always true or we wouldn't have selected the row
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
   * Get current token statistics from Redis
   */
  async getTokenStats(provider: string, modelName: string): Promise<TokenStats> {
    const { provider: normalizedProvider, modelName: normalizedModel } = this.normalizeModelKey(provider, modelName);
    
    try {
      const redis = await getRedisClient();
      
      // Get current stats from Redis sliding windows
      const currentMinuteKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'minute');
      const lastHourKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'hour');
      const last24HoursKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'day');
      
      const [minuteData, hourData, dayData] = await Promise.all([
        redis.get(currentMinuteKey),
        redis.get(lastHourKey),
        redis.get(last24HoursKey),
      ]);

      return {
        currentMinuteTokens: minuteData ? JSON.parse(minuteData).totalTokens || 0 : 0,
        lastHourTokens: hourData ? JSON.parse(hourData).totalTokens || 0 : 0,
        last24HoursTokens: dayData ? JSON.parse(dayData).totalTokens || 0 : 0,
        requestCount: minuteData ? JSON.parse(minuteData).requestCount || 0 : 0,
      };
    } catch (error) {
      log(l => l.error('Error getting token stats', { provider: normalizedProvider, modelName: normalizedModel, error }));
      return {
        currentMinuteTokens: 0,
        lastHourTokens: 0,
        last24HoursTokens: 0,
        requestCount: 0,
      };
    }
  }

  /**
   * Check if a request would exceed quotas
   */
  async checkQuota(provider: string, modelName: string, requestedTokens: number): Promise<QuotaCheckResult> {
    const { provider: normalizedProvider, modelName: normalizedModel } = this.normalizeModelKey(provider, modelName);
    
    try {
      const [quota, currentStats] = await Promise.all([
        this.getQuota(normalizedProvider, normalizedModel),
        this.getTokenStats(normalizedProvider, normalizedModel),
      ]);

      // If no quota is configured, allow the request
      if (!quota) {
        return { allowed: true, currentUsage: currentStats };
      }

      // Check per-message limit
      if (quota.maxTokensPerMessage && requestedTokens > quota.maxTokensPerMessage) {
        return {
          allowed: false,
          reason: `Request tokens (${requestedTokens}) exceed per-message limit (${quota.maxTokensPerMessage})`,
          currentUsage: currentStats,
          quota,
        };
      }

      // Check per-minute limit
      if (quota.maxTokensPerMinute && currentStats.currentMinuteTokens + requestedTokens > quota.maxTokensPerMinute) {
        return {
          allowed: false,
          reason: `Request would exceed per-minute limit (${quota.maxTokensPerMinute})`,
          currentUsage: currentStats,
          quota,
        };
      }

      // Check daily limit
      if (quota.maxTokensPerDay && currentStats.last24HoursTokens + requestedTokens > quota.maxTokensPerDay) {
        return {
          allowed: false,
          reason: `Request would exceed daily limit (${quota.maxTokensPerDay})`,
          currentUsage: currentStats,
          quota,
        };
      }

      return { allowed: true, currentUsage: currentStats, quota };
    } catch (error) {
      log(l => l.error('Error checking quota', { provider: normalizedProvider, modelName: normalizedModel, error }));
      // On error, allow the request to avoid blocking legitimate usage
      return { allowed: true };
    }
  }

  /**
   * Record token usage after a successful request
   */
  async recordTokenUsage(provider: string, modelName: string, usage: TokenUsageData): Promise<void> {
    const { provider: normalizedProvider, modelName: normalizedModel } = this.normalizeModelKey(provider, modelName);
    
    try {
      await Promise.all([
        this.updateRedisStats(normalizedProvider, normalizedModel, usage),
        this.updateDatabaseStats(normalizedProvider, normalizedModel, usage),
      ]);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error recording token usage',
        extra: { provider: normalizedProvider, modelName: normalizedModel, usage },
        source: 'TokenStatsService.recordTokenUsage',
      });
    }
  }

  /**
   * Update Redis statistics with sliding windows
   */
  private async updateRedisStats(provider: string, modelName: string, usage: TokenUsageData): Promise<void> {
    try {
      const redis = await getRedisClient();
      const now = new Date();
      
      // Update each time window
      const windows = [
        { type: 'minute', duration: 60, start: new Date(Math.floor(now.getTime() / 60000) * 60000) },
        { type: 'hour', duration: 3600, start: new Date(Math.floor(now.getTime() / 3600000) * 3600000) },
        { type: 'day', duration: 86400, start: new Date(Math.floor(now.getTime() / 86400000) * 86400000) },
      ];

      for (const window of windows) {
        const key = this.getRedisStatsKey(provider, modelName, window.type);
        
        // Use Redis transaction to atomically update stats
        const multi = redis.multi();
        
        // Get current data
        const currentData = await redis.get(key);
        const current = currentData ? JSON.parse(currentData) : {
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
      throw new Error(`Failed to update Redis stats: ${error}`);
    }
  }

  /**
   * Update PostgreSQL statistics for persistence
   */
  private async updateDatabaseStats(provider: string, modelName: string, usage: TokenUsageData): Promise<void> {
    try {
      await drizDbWithInit(async (db) => {
        const now = new Date();
        
        const model = await db.query.models.findFirst({
          where: and(
            eq(models.providerId, provider),
            eq(models.modelName, modelName),
            eq(models.isActive, true),
          ),
        });
        if (!model) {
          throw new Error(`Model not found: ${provider}:${modelName}`);
        } 

        // Update each time window in the database
        const windows = [
          { type: 'minute', start: new Date(Math.floor(now.getTime() / 60000) * 60000) },
          { type: 'hour', start: new Date(Math.floor(now.getTime() / 3600000) * 3600000) },
          { type: 'day', start: new Date(Math.floor(now.getTime() / 86400000) * 86400000) },
        ];

        for (const window of windows) {
          const windowEnd = new Date(window.start.getTime());
          if (window.type === 'minute') windowEnd.setMinutes(windowEnd.getMinutes() + 1);
          else if (window.type === 'hour') windowEnd.setHours(windowEnd.getHours() + 1);
          else windowEnd.setDate(windowEnd.getDate() + 1);

          // Use upsert to update or insert stats
          await db
            .insert(tokenConsumptionStats)
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
                tokenConsumptionStats.modelId,
                tokenConsumptionStats.windowStart,
                tokenConsumptionStats.windowType,
              ],
              set: {
                promptTokens: sql`${tokenConsumptionStats.promptTokens} + ${usage.promptTokens}`,
                completionTokens: sql`${tokenConsumptionStats.completionTokens} + ${usage.completionTokens}`,
                totalTokens: sql`${tokenConsumptionStats.totalTokens} + ${usage.totalTokens}`,
                requestCount: sql`${tokenConsumptionStats.requestCount} + 1`,
                lastUpdated: new Date().toISOString(),
              },
            });
        }
      });
    } catch (error) {
      throw new Error(`Failed to update database stats: ${error}`);
    }
  }

  /**
   * Get comprehensive token usage report for a model
   */
  async getUsageReport(provider: string, modelName: string): Promise<{
    quota: ModelQuota | null;
    currentStats: TokenStats;
    quotaCheckResult: QuotaCheckResult;
  }> {
    const { provider: normalizedProvider, modelName: normalizedModel } = this.normalizeModelKey(provider, modelName);
    
    const [quota, currentStats] = await Promise.all([
      this.getQuota(normalizedProvider, normalizedModel),
      this.getTokenStats(normalizedProvider, normalizedModel),
    ]);

    const quotaCheckResult = await this.checkQuota(normalizedProvider, normalizedModel, 0);

    return { quota, currentStats, quotaCheckResult };
  }
}

// Export singleton instance
export const tokenStatsService = TokenStatsService.getInstance();