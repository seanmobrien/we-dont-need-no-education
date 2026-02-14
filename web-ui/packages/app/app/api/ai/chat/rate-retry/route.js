import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { rateLimitMetrics } from '@/lib/ai/middleware/key-rate-limiter/metrics';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { convertToModelMessages, generateText } from 'ai';
import { log, LoggedError } from '@compliance-theater/logger';
import { createAgentHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { wrapChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import { isRateRetryError } from '@/lib/react-util/errors/rate-retry-error';
export const dynamic = 'force-dynamic';
const MAX_PROCESSING_TIME_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 720 * 1000;
export const GET = wrapRouteRequest(async () => {
    const startTime = Date.now();
    let processedCount = 0;
    try {
        log((l) => l.verbose('Rate retry processing started'));
        rateLimitMetrics.recordMessageProcessed('system', 1);
        const chatHistoryContext = createAgentHistoryContext({
            operation: 'ratelimit.retry',
            iteration: 1,
            originatingUserId: '-1',
        });
        const modelClassifications = [
            'hifi',
            'lofi',
            'completions',
            'embedding',
        ];
        for (const classification of modelClassifications) {
            const processingTimeElapsed = Date.now() - startTime;
            if (processingTimeElapsed >= MAX_PROCESSING_TIME_MS) {
                log((l) => l.warn('Max processing time reached, stopping'));
                break;
            }
            const azureModelKey = `azure:${classification}`;
            const googleModelKey = `google:${classification}`;
            const azureAvailable = isModelAvailable(azureModelKey);
            const googleAvailable = isModelAvailable(googleModelKey);
            if (!azureAvailable && !googleAvailable) {
                log((l) => l.warn(`No available models for ${classification}, skipping`));
                continue;
            }
            const queueSize = await rateLimitQueueManager.getQueueSize(1, classification);
            rateLimitMetrics.updateQueueSize(queueSize, classification, 1);
            if (queueSize === 0) {
                log((l) => l.verbose(`No gen-1 requests for ${classification}`));
                continue;
            }
            const requests = await rateLimitQueueManager.dequeueRequests(1, classification, 10);
            log((l) => l.verbose(`Processing ${requests.length} gen-1 requests for ${classification}`));
            for (const request of requests) {
                const requestStartTime = Date.now();
                try {
                    const modelKey = azureAvailable ? azureModelKey : googleModelKey;
                    log((l) => l.verbose(`Processing request ${request.id} with model ${modelKey}`));
                    const modelInstance = (classification === 'embedding'
                        ? await aiModelFactory(classification)
                        : classification === 'hifi' || classification === 'lofi'
                            ? await aiModelFactory(classification)
                            : await aiModelFactory('lofi'));
                    const model = wrapChatHistoryMiddleware({
                        chatHistoryContext,
                        model: modelInstance,
                    });
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
                    });
                    const generatePromise = generateText({
                        model,
                        messages: convertToModelMessages((request.request.messages ?? [])),
                    });
                    chatHistoryContext.iteration++;
                    const result = await Promise.race([generatePromise, timeoutPromise]);
                    const response = {
                        id: request.id,
                        response: result,
                        processedAt: new Date().toISOString(),
                    };
                    await rateLimitQueueManager.storeResponse(response);
                    const duration = Date.now() - requestStartTime;
                    rateLimitMetrics.recordProcessingDuration(duration, classification);
                    rateLimitMetrics.recordMessageProcessed(classification, 1);
                    processedCount++;
                    log((l) => l.verbose(`Successfully processed request ${request.id}`));
                }
                catch (error) {
                    log((l) => l.error(`Error processing request ${request.id}:`, error));
                    if (isRateRetryError(error)) {
                        const gen2Request = {
                            ...request,
                            metadata: {
                                ...request.metadata,
                                generation: 2,
                            },
                        };
                        await rateLimitQueueManager.enqueueRequest(gen2Request);
                        rateLimitMetrics.recordError('moved_to_gen2', classification);
                    }
                    else {
                        const errorResponseFactory = {
                            id: request.id,
                            error: {
                                type: error instanceof Error && error.message.includes('timeout')
                                    ? 'server_error'
                                    : 'server_error',
                                message: error instanceof Error ? error.message : 'Unknown error',
                            },
                            processedAt: new Date().toISOString(),
                        };
                        await rateLimitQueueManager.storeResponse(errorResponseFactory);
                        rateLimitMetrics.recordError('processing_error', classification);
                    }
                }
                const totalElapsed = Date.now() - startTime;
                if (totalElapsed >= MAX_PROCESSING_TIME_MS) {
                    log((l) => l.error(new Error('Max processing time reached during gen-1 processing')));
                    break;
                }
            }
        }
        const totalElapsed = Date.now() - startTime;
        if (totalElapsed < MAX_PROCESSING_TIME_MS) {
            for (const classification of modelClassifications) {
                const processingTimeElapsed = Date.now() - startTime;
                if (processingTimeElapsed >= MAX_PROCESSING_TIME_MS) {
                    break;
                }
                const gen2QueueSize = await rateLimitQueueManager.getQueueSize(2, classification);
                rateLimitMetrics.updateQueueSize(gen2QueueSize, classification, 2);
                if (gen2QueueSize === 0) {
                    continue;
                }
                const azureModelKey = `azure:${classification}`;
                const googleModelKey = `google:${classification}`;
                const azureAvailable = isModelAvailable(azureModelKey);
                const googleAvailable = isModelAvailable(googleModelKey);
                if (!azureAvailable && !googleAvailable) {
                    continue;
                }
                const requests = await rateLimitQueueManager.dequeueRequests(2, classification, 1);
                if (requests.length === 0) {
                    continue;
                }
                const request = requests[0];
                log((l) => l.verbose(`Processing gen-2 request ${request.id} for ${classification}`));
                try {
                    const modelInstance = await aiModelFactory('google:gemini-2.0-flash');
                    const model = wrapChatHistoryMiddleware({
                        model: modelInstance,
                        chatHistoryContext,
                    });
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
                    });
                    const generatePromise = generateText({
                        model,
                        messages: convertToModelMessages(request.request.messages) ||
                            [],
                    });
                    const result = await Promise.race([generatePromise, timeoutPromise]);
                    const response = {
                        id: request.id,
                        response: result,
                        processedAt: new Date().toISOString(),
                    };
                    await rateLimitQueueManager.storeResponse(response);
                    rateLimitMetrics.recordMessageProcessed(classification, 2);
                    processedCount++;
                }
                catch (error) {
                    log((l) => l.error(`Gen-2 request ${request.id} failed:`, error));
                    const errorResponseFactory = {
                        id: request.id,
                        error: {
                            type: 'will_not_retry',
                            message: `Gen-2 processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                        processedAt: new Date().toISOString(),
                    };
                    await rateLimitQueueManager.storeResponse(errorResponseFactory);
                    rateLimitMetrics.recordError('gen2_critical_failure', classification);
                }
            }
        }
        const totalDuration = Date.now() - startTime;
        log((l) => l.verbose(`Rate retry processing completed. Processed: ${processedCount}, Duration: ${totalDuration}ms`));
        return NextResponse.json({
            success: true,
            processed: processedCount,
            duration: totalDuration,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'Rate Retry API',
            message: 'Error processing rate retry requests',
            extra: { processedCount, duration: Date.now() - startTime },
        });
        rateLimitMetrics.recordError('processing_system_error', 'system');
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processed: processedCount,
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map