import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { getRedisClient } from '@compliance-theater/redis';
import { LoggedError } from '@compliance-theater/logger';
export const dynamic = 'force-dynamic';
const REDIS_PREFIX = 'rate-limit';
export const GET = wrapRouteRequest(async () => {
    const redis = await getRedisClient();
    const modelClassifications = [
        'hifi',
        'lofi',
        'completions',
        'embedding',
    ];
    const queueInfo = await Promise.all(modelClassifications.map(async (classification) => {
        const gen1Stats = await getQueueGenerationStats(redis, 1, classification);
        const gen2Stats = await getQueueGenerationStats(redis, 2, classification);
        return {
            classification,
            queues: {
                generation1: gen1Stats,
                generation2: gen2Stats,
            },
            totalPending: gen1Stats.size + gen2Stats.size,
        };
    }));
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
});
async function getSampleRequests(redis, generation, classification, limit) {
    const queueKey = `${REDIS_PREFIX}:queue:gen${generation}:${classification}`;
    try {
        const requests = await redis.lRange(queueKey, 0, limit - 1);
        const now = new Date();
        return requests.map((req) => {
            try {
                const parsed = JSON.parse(req);
                const submittedAt = new Date(parsed.metadata.submittedAt);
                const queueTime = now.getTime() - submittedAt.getTime();
                let tokenEstimate;
                try {
                    if (parsed.request.messages &&
                        Array.isArray(parsed.request.messages)) {
                        const messageContent = parsed.request.messages
                            .map((msg) => msg.content || '')
                            .join(' ');
                        tokenEstimate = Math.ceil(messageContent.length / 4);
                    }
                }
                catch {
                }
                return {
                    ...parsed,
                    queueTime,
                    tokenEstimate,
                };
            }
            catch {
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
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api/ai/chat/stats/queues/route::getSampleRequests',
        });
        return [];
    }
}
async function getQueueGenerationStats(redis, generation, classification) {
    const size = await rateLimitQueueManager.getQueueSize(generation, classification);
    const requests = size > 0
        ? await getSampleRequests(redis, generation, classification, 5)
        : [];
    if (requests.length === 0) {
        return {
            size,
            requests: [],
            averageSize: 0,
        };
    }
    const submittedDates = requests
        .map((r) => new Date(r.metadata.submittedAt))
        .filter((d) => !isNaN(d.getTime()));
    const oldestRequest = submittedDates.length > 0
        ? new Date(Math.min(...submittedDates.map((d) => d.getTime())))
        : undefined;
    const newestRequest = submittedDates.length > 0
        ? new Date(Math.max(...submittedDates.map((d) => d.getTime())))
        : undefined;
    const requestSizes = requests.map((r) => {
        const messages = r.request.messages;
        if (Array.isArray(messages)) {
            const content = messages.map((m) => m.content || '').join(' ') || '';
            return content.length;
        }
        return 0;
    });
    const averageSize = requestSizes.length > 0
        ? requestSizes.reduce((a, b) => a + b, 0) / requestSizes.length
        : 0;
    const largestRequestIndex = requestSizes.length > 0
        ? requestSizes.indexOf(Math.max(...requestSizes))
        : -1;
    const largestRequest = largestRequestIndex >= 0 ? requests[largestRequestIndex] : undefined;
    return {
        size,
        requests,
        oldestRequest,
        newestRequest,
        averageSize,
        largestRequest,
    };
}
//# sourceMappingURL=route.js.map