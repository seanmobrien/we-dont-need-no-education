import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import type { RateLimitedRequest, ModelClassification } from '@/lib/ai/middleware/key-rate-limiter/types';

export const dynamic = 'force-dynamic';

const REDIS_PREFIX = 'rate-limit';

export const GET = wrapRouteRequest(async () => {
  try {
    const redis = await getRedisClient();
    const modelClassifications: ModelClassification[] = ['hifi', 'lofi', 'completions', 'embedding'];

    const queueInfo = await Promise.all(
      modelClassifications.map(async (classification) => {
        const gen1Size = await rateLimitQueueManager.getQueueSize(1, classification);
        const gen2Size = await rateLimitQueueManager.getQueueSize(2, classification);

        // Get sample requests from each queue for details
        const gen1Requests = gen1Size > 0 ? await getSampleRequests(redis, 1, classification, 5) : [];
        const gen2Requests = gen2Size > 0 ? await getSampleRequests(redis, 2, classification, 5) : [];

        return {
          classification,
          queues: {
            generation1: {
              size: gen1Size,
              requests: gen1Requests,
            },
            generation2: {
              size: gen2Size,
              requests: gen2Requests,
            },
          },
          totalPending: gen1Size + gen2Size,
        };
      })
    );

    // Calculate totals
    const totalPending = queueInfo.reduce((sum, info) => sum + info.totalPending, 0);
    const totalGen1 = queueInfo.reduce((sum, info) => sum + info.queues.generation1.size, 0);
    const totalGen2 = queueInfo.reduce((sum, info) => sum + info.queues.generation2.size, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPending,
          totalGen1,
          totalGen2,
        },
        queues: queueInfo,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching queue statistics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});

async function getSampleRequests(
  redis: Awaited<ReturnType<typeof getRedisClient>>,
  generation: 1 | 2,
  classification: string,
  limit: number
): Promise<Array<RateLimitedRequest & { queueTime: number; tokenEstimate?: number }>> {
  const queueKey = `${REDIS_PREFIX}:queue:gen${generation}:${classification}`;
  
  try {
    const requests = await redis.lRange(queueKey, 0, limit - 1);
    const now = new Date();
    
    return requests.map(req => {
      try {
        const parsed = JSON.parse(req) as RateLimitedRequest;
        const submittedAt = new Date(parsed.metadata.submittedAt);
        const queueTime = now.getTime() - submittedAt.getTime();
        
        // Estimate token count based on message content
        let tokenEstimate: number | undefined;
        try {
          if (parsed.request.messages && Array.isArray(parsed.request.messages)) {
            const messageContent = parsed.request.messages
              .map((msg: { content?: string }) => msg.content || '')
              .join(' ');
            // Rough estimate: ~4 characters per token
            tokenEstimate = Math.ceil(messageContent.length / 4);
          }
        } catch {
          // Ignore token estimation errors
        }

        return {
          ...parsed,
          queueTime,
          tokenEstimate,
        };
      } catch {
        // Return a fallback object if parsing fails
        return {
          id: 'unknown',
          modelClassification: classification,
          request: { params: {}, messages: [] },
          metadata: {
            submittedAt: new Date().toISOString(),
            generation: generation,
          },
          queueTime: 0,
        };
      }
    });
  } catch (error) {
    console.error(`Error getting sample requests for ${classification} gen${generation}:`, error);
    return [];
  }
}