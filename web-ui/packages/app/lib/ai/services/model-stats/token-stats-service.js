import { getRedisClient } from '@compliance-theater/redis';
import { drizDbWithInit, schema, sql } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { ModelMap } from './model-map';
import { SingletonProvider } from '@compliance-theater/typescript';
const REGISTRY_KEY = '@noeducation/model-stats:TokenStatsService';
class TokenStatsService {
    static get instance() {
        return SingletonProvider.Instance.get(REGISTRY_KEY);
    }
    static set instance(value) {
        if (value === undefined) {
            SingletonProvider.Instance.delete(REGISTRY_KEY);
        }
        else {
            SingletonProvider.Instance.set(REGISTRY_KEY, value);
        }
    }
    QUOTA_CACHE_TTL = 5 * 60 * 1000;
    constructor() { }
    static reset() {
        this.instance = undefined;
    }
    static get Instance() {
        if (!TokenStatsService.instance) {
            TokenStatsService.instance = new TokenStatsService();
        }
        return TokenStatsService.instance;
    }
    getRedisStatsKey(provider, modelName, windowType) {
        return `token_stats:${provider}:${modelName}:${windowType}`;
    }
    async getQuota(provider, modelName) {
        const { providerId: normalizedProvider, modelName: normalizedModel, modelId: normalizedModelId, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            let quotaFromMap = await ModelMap.getInstance().then((x) => x.getQuotaByModelId(normalizedModelId));
            if (!quotaFromMap) {
                quotaFromMap = await ModelMap.Instance.addQuotaToModel({
                    modelId: normalizedModelId,
                    maxTokensPerMessage: undefined,
                    maxTokensPerMinute: undefined,
                    maxTokensPerDay: undefined,
                });
            }
            return {
                ...quotaFromMap,
                provider: normalizedProvider,
                modelName: normalizedModel,
            };
        }
        catch (error) {
            log((l) => l.error('Error getting quota', {
                provider: provider,
                modelName: normalizedModel,
                error,
            }));
            return null;
        }
    }
    async getTokenStats(provider, modelName) {
        const { providerId: normalizedProvider, modelName: normalizedModel, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            const redis = await getRedisClient();
            const currentMinuteKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'minute');
            const lastHourKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'hour');
            const last24HoursKey = this.getRedisStatsKey(normalizedProvider, normalizedModel, 'day');
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
        }
        catch (error) {
            log((l) => l.error('Error getting token stats', {
                provider: normalizedProvider,
                modelName: normalizedModel,
                error,
            }));
            return {
                currentMinuteTokens: 0,
                lastHourTokens: 0,
                last24HoursTokens: 0,
                requestCount: 0,
            };
        }
    }
    async checkQuota(provider, modelName, requestedTokens) {
        const { providerId: normalizedProvider, modelName: normalizedModel, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            const [quota, currentStats] = await Promise.all([
                this.getQuota(normalizedProvider, normalizedModel),
                this.getTokenStats(normalizedProvider, normalizedModel),
            ]);
            if (!quota) {
                return { allowed: true, currentUsage: currentStats };
            }
            if (quota.maxTokensPerMessage &&
                requestedTokens > quota.maxTokensPerMessage) {
                return {
                    allowed: false,
                    reason: `Request tokens (${requestedTokens}) exceed per-message limit (${quota.maxTokensPerMessage})`,
                    currentUsage: currentStats,
                    quota,
                };
            }
            if (quota.maxTokensPerMinute &&
                currentStats.currentMinuteTokens + requestedTokens >
                    quota.maxTokensPerMinute) {
                return {
                    allowed: false,
                    reason: `Request would exceed per-minute limit (${quota.maxTokensPerMinute})`,
                    currentUsage: currentStats,
                    quota,
                };
            }
            if (quota.maxTokensPerDay &&
                currentStats.last24HoursTokens + requestedTokens > quota.maxTokensPerDay) {
                return {
                    allowed: false,
                    reason: `Request would exceed daily limit (${quota.maxTokensPerDay})`,
                    currentUsage: currentStats,
                    quota,
                };
            }
            return { allowed: true, currentUsage: currentStats, quota };
        }
        catch (error) {
            log((l) => l.error('Error checking quota', {
                provider: normalizedProvider,
                modelName: normalizedModel,
                error,
            }));
            return { allowed: true };
        }
    }
    async safeRecordTokenUsage(provider, modelName, usage) {
        const { providerId: normalizedProvider, modelName: normalizedModel, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            await Promise.all([
                this.updateRedisStats(normalizedProvider, normalizedModel, usage),
                this.updateDatabaseStats(normalizedProvider, normalizedModel, usage),
            ]);
        }
        catch (error) {
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
    async updateRedisStats(provider, modelName, usage) {
        const { providerId: normalizedProvider, modelName: normalizedModel, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            const redis = await getRedisClient();
            const now = new Date();
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
                const key = this.getRedisStatsKey(normalizedProvider, normalizedModel, window.type);
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
        }
        catch (error) {
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
    async updateDatabaseStats(provider, modelName, usage) {
        try {
            const model = await ModelMap.Instance.getModelByProviderAndName(provider, modelName);
            if (!model) {
                throw new Error(`Model not found: ${provider}:${modelName}`);
            }
            await drizDbWithInit(async (db) => {
                const now = new Date();
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
                    else
                        windowEnd.setDate(windowEnd.getDate() + 1);
                    const conflictTarget = [
                        schema.tokenConsumptionStats.modelId,
                        schema.tokenConsumptionStats.windowStart,
                        schema.tokenConsumptionStats.windowType,
                    ];
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
                            promptTokens: sql `${schema.tokenConsumptionStats.promptTokens} + ${usage.promptTokens}`,
                            completionTokens: sql `${schema.tokenConsumptionStats.completionTokens} + ${usage.completionTokens}`,
                            totalTokens: sql `${schema.tokenConsumptionStats.totalTokens} + ${usage.totalTokens}`,
                            requestCount: sql `${schema.tokenConsumptionStats.requestCount} + 1`,
                            lastUpdated: new Date().toISOString(),
                        },
                    });
                }
            });
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to update database stats.',
                data: { provider, modelName, usage },
                source: 'TokenStatsService.updateDatabaseStats',
            });
        }
    }
    async getUsageReport(provider, modelName) {
        const { providerId: normalizedProvider, modelName: normalizedModel, rethrow, } = await ModelMap.getInstance().then((x) => x.normalizeProviderModel(provider, modelName));
        try {
            rethrow();
            const [quota, currentStats] = await Promise.all([
                this.getQuota(normalizedProvider, normalizedModel),
                this.getTokenStats(normalizedProvider, normalizedModel),
            ]);
            const quotaCheckResult = await this.checkQuota(normalizedProvider, normalizedModel, 0);
            return { quota, currentStats, quotaCheckResult };
        }
        catch (error) {
            throw error;
        }
    }
}
export const getInstance = () => TokenStatsService.Instance;
export const reset = () => TokenStatsService.reset();
//# sourceMappingURL=token-stats-service.js.map