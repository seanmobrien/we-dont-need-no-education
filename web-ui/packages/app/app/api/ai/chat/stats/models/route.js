import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { eq, and, gte, sql } from 'drizzle-orm';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { getInstance as getTokenStatsService } from '@/lib/ai/services/model-stats/token-stats-service';
const { providers, models, modelQuotas, tokenConsumptionStats } = schema;
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (request) => {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'database';
    if (source === 'redis') {
        const baseModels = (await drizDbWithInit((db) => db
            .select({
            id: models.id,
            modelName: models.modelName,
            displayName: models.displayName,
            description: models.description,
            isActive: models.isActive,
            providerId: models.providerId,
            providerName: providers.name,
            providerDisplayName: providers.displayName,
        })
            .from(models)
            .innerJoin(providers, eq(models.providerId, providers.id))
            .execute())) ?? [];
        const tokenStatsService = getTokenStatsService();
        const enriched = await Promise.all(baseModels.map(async (m) => {
            const modelKey = `${m.providerName}:${m.modelName}`;
            const available = isModelAvailable(modelKey);
            const usage = await tokenStatsService
                .getUsageReport(m.providerName, m.modelName)
                .catch(() => ({
                quota: null,
                currentStats: {
                    currentMinuteTokens: 0,
                    lastHourTokens: 0,
                    last24HoursTokens: 0,
                    requestCount: 0,
                },
                quotaCheckResult: { allowed: true },
            }));
            const quota = usage.quota;
            const current = usage.currentStats;
            const makeStats = (total) => ({
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: total,
                requestCount: current.requestCount,
            });
            return {
                ...m,
                modelKey,
                available,
                maxTokensPerMessage: quota?.maxTokensPerMessage ?? null,
                maxTokensPerMinute: quota?.maxTokensPerMinute ?? null,
                maxTokensPerDay: quota?.maxTokensPerDay ?? null,
                stats: {
                    minute: makeStats(current.currentMinuteTokens),
                    hour: makeStats(current.lastHourTokens),
                    day: makeStats(current.last24HoursTokens),
                },
                quotaCheck: usage.quotaCheckResult,
                source: 'redis',
            };
        }));
        return NextResponse.json({
            success: true,
            data: enriched,
            timestamp: new Date().toISOString(),
            source: 'redis',
        });
    }
    const db = await drizDbWithInit();
    const modelsWithInfo = await db
        .select({
        id: models.id,
        modelName: models.modelName,
        displayName: models.displayName,
        description: models.description,
        isActive: models.isActive,
        providerId: models.providerId,
        providerName: providers.name,
        providerDisplayName: providers.displayName,
        maxTokensPerMessage: modelQuotas.maxTokensPerMessage,
        maxTokensPerMinute: modelQuotas.maxTokensPerMinute,
        maxTokensPerDay: modelQuotas.maxTokensPerDay,
    })
        .from(models)
        .innerJoin(providers, eq(models.providerId, providers.id))
        .leftJoin(modelQuotas, and(eq(modelQuotas.modelId, models.id), eq(modelQuotas.isActive, true)));
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const modelStats = await Promise.all(modelsWithInfo.map(async (model) => {
        const modelKey = `${model.providerName}:${model.modelName}`;
        const available = isModelAvailable(modelKey);
        const [minuteStats, hourStats, dayStats] = await Promise.all([
            db
                .select({
                promptTokens: sql `COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
                completionTokens: sql `COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
                totalTokens: sql `COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
                requestCount: sql `COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
                .from(tokenConsumptionStats)
                .where(and(eq(tokenConsumptionStats.modelId, model.id), eq(tokenConsumptionStats.windowType, 'minute'), gte(tokenConsumptionStats.windowStart, minuteStart.toISOString()))),
            db
                .select({
                promptTokens: sql `COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
                completionTokens: sql `COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
                totalTokens: sql `COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
                requestCount: sql `COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
                .from(tokenConsumptionStats)
                .where(and(eq(tokenConsumptionStats.modelId, model.id), eq(tokenConsumptionStats.windowType, 'hour'), gte(tokenConsumptionStats.windowStart, hourStart.toISOString()))),
            db
                .select({
                promptTokens: sql `COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
                completionTokens: sql `COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
                totalTokens: sql `COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
                requestCount: sql `COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
                .from(tokenConsumptionStats)
                .where(and(eq(tokenConsumptionStats.modelId, model.id), eq(tokenConsumptionStats.windowType, 'day'), gte(tokenConsumptionStats.windowStart, dayStart.toISOString()))),
        ]);
        return {
            ...model,
            modelKey,
            available,
            stats: {
                minute: minuteStats[0] || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requestCount: 0,
                },
                hour: hourStats[0] || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requestCount: 0,
                },
                day: dayStats[0] || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requestCount: 0,
                },
            },
        };
    }));
    return NextResponse.json({
        success: true,
        data: modelStats,
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=route.js.map