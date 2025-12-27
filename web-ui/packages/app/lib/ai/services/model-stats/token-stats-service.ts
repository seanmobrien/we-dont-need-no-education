import { getRedisClient } from '@/lib/redis-client';
import { drizDbWithInit, schema, sql } from '@/lib/drizzle-db';
import { log } from '@repo/lib-logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import {
  ModelQuota,
  QuotaCheckResult,
  TokenStats,
  TokenStatsServiceType,
  TokenUsageData,
} from '../../middleware/tokenStatsTracking/types';
import { ModelMap } from './model-map';
import { SingletonProvider } from '@repo/lib-typescript';

const REGISTRY_KEY = '@noeducation/model-stats:TokenStatsService';

class TokenStatsService implements TokenStatsServiceType {
  private static get instance(): TokenStatsService | undefined {
    return SingletonProvider.Instance.get<TokenStatsService>(REGISTRY_KEY);
  }
  private static set instance(value: TokenStatsService | undefined) {
    if (value === undefined) {
      SingletonProvider.Instance.delete(REGISTRY_KEY);
    } else {
      SingletonProvider.Instance.set<TokenStatsService>(REGISTRY_KEY, value);
    }
  }

  private readonly QUOTA_CACHE_TTL = 5 * 60 * 1000;

  private constructor() {}

  static reset(): void {
    this.instance = undefined;
  }

  static get Instance(): TokenStatsService {
    if (!TokenStatsService.instance) {
      TokenStatsService.instance = new TokenStatsService();
    }
    return TokenStatsService.instance;
  }

  private getRedisStatsKey(
    provider: string,
    modelName: string,
    windowType: string,
  ): string {
    return `token_stats:${provider}:${modelName}:${windowType}`;
  }

  async getQuota(
    provider: string,
    modelName: string,
  ): Promise<ModelQuota | null> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      modelId: normalizedModelId,
      rethrow,
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );
    try {
      rethrow();
      let quotaFromMap = await ModelMap.getInstance().then((x) =>
        x.getQuotaByModelId(normalizedModelId!),
      );
      if (!quotaFromMap) {
        quotaFromMap = await ModelMap.Instance.addQuotaToModel({
          modelId: normalizedModelId!,
          maxTokensPerMessage: undefined,
          maxTokensPerMinute: undefined,
          maxTokensPerDay: undefined,
        });
      }
      return {
        ...quotaFromMap,
        provider: normalizedProvider!,
        modelName: normalizedModel,
      };
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

  async getTokenStats(
    provider: string,
    modelName: string,
  ): Promise<TokenStats> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );
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

  async checkQuota(
    provider: string,
    modelName: string,
    requestedTokens: number,
  ): Promise<QuotaCheckResult> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );

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

  async safeRecordTokenUsage(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );

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

  private async updateRedisStats(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    const {
      providerId: normalizedProvider,
      modelName: normalizedModel,
      rethrow,
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );
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
      // Use a Lua EVAL script to atomically read-modify-write and set TTL
      const lua = `
        local raw = redis.call('GET', KEYS[1])
        local obj = nil
        if raw then
          local ok, parsed = pcall(cjson.decode, raw)
          if ok and parsed then
            obj = parsed
          else
            obj = {promptTokens=0, completionTokens=0, totalTokens=0, requestCount=0, windowStart=ARGV[5]}
          end
        else
          obj = {promptTokens=0, completionTokens=0, totalTokens=0, requestCount=0, windowStart=ARGV[5]}
        end

        obj['promptTokens'] = (obj['promptTokens'] or 0) + tonumber(ARGV[1])
        obj['completionTokens'] = (obj['completionTokens'] or 0) + tonumber(ARGV[2])
        obj['totalTokens'] = (obj['totalTokens'] or 0) + tonumber(ARGV[3])
        obj['requestCount'] = (obj['requestCount'] or 0) + tonumber(ARGV[4])
        obj['windowStart'] = ARGV[5]
        obj['lastUpdated'] = ARGV[7]

        redis.call('SETEX', KEYS[1], tonumber(ARGV[6]), cjson.encode(obj))
        return cjson.encode(obj)
      `;

      for (const window of windows) {
        const key = this.getRedisStatsKey(
          normalizedProvider,
          normalizedModel,
          window.type,
        );

        // Execute Lua script to atomically update the JSON blob and set TTL.
        // ARGV: promptDelta, completionDelta, totalDelta, requestDelta, windowStart, ttl, nowIso
        await redis.eval(lua, {
          keys: [key],
          arguments: [
            String(usage.promptTokens),
            String(usage.completionTokens),
            String(usage.totalTokens),
            '1',
            window.start.toISOString(),
            String(window.duration + 300),
            now.toISOString(),
          ],
        });
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

  private async updateDatabaseStats(
    provider: string,
    modelName: string,
    usage: TokenUsageData,
  ): Promise<void> {
    try {
      const model = await ModelMap.Instance.getModelByProviderAndName(
        provider,
        modelName,
      );
      if (!model) {
        throw new Error(`Model not found: ${provider}:${modelName}`);
      }
      await drizDbWithInit(async (db) => {
        const now = new Date();
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

          const conflictTarget = [
            schema.tokenConsumptionStats.modelId,
            schema.tokenConsumptionStats.windowStart,
            schema.tokenConsumptionStats.windowType,
          ];

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
              target: conflictTarget,
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
    } = await ModelMap.getInstance().then((x) =>
      x.normalizeProviderModel(provider, modelName),
    );
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

export const getInstance = (): TokenStatsServiceType =>
  TokenStatsService.Instance;

export const reset = (): void => TokenStatsService.reset();
