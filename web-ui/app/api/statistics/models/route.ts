import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';

const { providers, models, modelQuotas, tokenConsumptionStats } = schema;

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async () => {
  try {
    const db = await drizDbWithInit();
    
    // Get all models with their provider info and quotas
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

    // Get current time windows for stats
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build the result with model availability and stats
    const modelStats = await Promise.all(
      modelsWithInfo.map(async (model) => {
        const modelKey = `${model.providerName}:${model.modelName}`;
        const available = isModelAvailable(modelKey);

        // Get token stats for different time windows
        const [minuteStats, hourStats, dayStats] = await Promise.all([
          db
            .select({
              promptTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
              completionTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
              totalTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
              requestCount: sql<number>`COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
            .from(tokenConsumptionStats)
            .where(
              and(
                eq(tokenConsumptionStats.modelId, model.id),
                eq(tokenConsumptionStats.windowType, 'minute'),
                gte(tokenConsumptionStats.windowStart, minuteStart.toISOString())
              )
            ),
          db
            .select({
              promptTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
              completionTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
              totalTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
              requestCount: sql<number>`COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
            .from(tokenConsumptionStats)
            .where(
              and(
                eq(tokenConsumptionStats.modelId, model.id),
                eq(tokenConsumptionStats.windowType, 'hour'),
                gte(tokenConsumptionStats.windowStart, hourStart.toISOString())
              )
            ),
          db
            .select({
              promptTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.promptTokens}), 0)`,
              completionTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.completionTokens}), 0)`,
              totalTokens: sql<number>`COALESCE(SUM(${tokenConsumptionStats.totalTokens}), 0)`,
              requestCount: sql<number>`COALESCE(SUM(${tokenConsumptionStats.requestCount}), 0)`,
            })
            .from(tokenConsumptionStats)
            .where(
              and(
                eq(tokenConsumptionStats.modelId, model.id),
                eq(tokenConsumptionStats.windowType, 'day'),
                gte(tokenConsumptionStats.windowStart, dayStart.toISOString())
              )
            ),
        ]);

        return {
          ...model,
          modelKey,
          available,
          stats: {
            minute: minuteStats[0] || { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 },
            hour: hourStats[0] || { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 },
            day: dayStats[0] || { promptTokens: 0, completionTokens: 0, totalTokens: 0, requestCount: 0 },
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: modelStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching model statistics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});