import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { rateLimitMetrics } from '@/lib/ai/middleware/key-rate-limiter/metrics';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { generateText, wrapLanguageModel } from 'ai';
import type { LanguageModelV1, CoreMessage } from 'ai';
import type { RateLimitedRequest, ProcessedResponse, ModelClassification } from '@/lib/ai/middleware/key-rate-limiter/types';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { createAgentHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { createChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';

export const dynamic = 'force-dynamic';

const MAX_PROCESSING_TIME_MS = 4 * 60 * 1000; // 4 minutes
const REQUEST_TIMEOUT_MS = 240 * 1000; // 240 seconds per request

export const GET = wrapRouteRequest(async () => {
  const startTime = Date.now();
  let processedCount = 0;
  
  try {
    log(l => l.verbose('Rate retry processing started'));
    rateLimitMetrics.recordMessageProcessed('system', 1);
    const chatHistoryContext = createAgentHistoryContext({
      operation: "ratelimit.retry",
      iteration: 1,
      originatingUserId: "-1"      
    });

    const modelClassifications: ModelClassification[] = ['hifi', 'lofi', 'completions', 'embedding'];
    
    // Process gen-1 messages first
    for (const classification of modelClassifications) {
      const processingTimeElapsed = Date.now() - startTime;
      if (processingTimeElapsed >= MAX_PROCESSING_TIME_MS) {
        log(l => l.warn('Max processing time reached, stopping'));
        break;
      }
      
      // Check if we have available models for this classification
      const azureModelKey = `azure:${classification}`;
      const googleModelKey = `google:${classification}`;
      
      const azureAvailable = isModelAvailable(azureModelKey);
      const googleAvailable = isModelAvailable(googleModelKey);
      
      if (!azureAvailable && !googleAvailable) {
        log(l => l.warn(`No available models for ${classification}, skipping`));
        continue;
      }
      
      // Get queue size for metrics
      const queueSize = await rateLimitQueueManager.getQueueSize(1, classification);
      rateLimitMetrics.updateQueueSize(queueSize, classification, 1);
      
      if (queueSize === 0) {
        log(l => l.verbose(`No gen-1 requests for ${classification}`));
        continue;
      }
      
      // Process requests from gen-1 queue
      const requests = await rateLimitQueueManager.dequeueRequests(1, classification, 10);
      log(l => l.verbose(`Processing ${requests.length} gen-1 requests for ${classification}`));
      
      for (const request of requests) {
        const requestStartTime = Date.now();
        
        try {
          // Choose available model (Azure first, then Google)
          const modelKey = azureAvailable ? azureModelKey : googleModelKey;
          log(l => l.verbose(`Processing request ${request.id} with model ${modelKey}`));                              
          // Create model instance (ensure we don't use embedding models for text generation)
          const modelInstance =
            classification === 'embedding'
              ? aiModelFactory(classification)
              : classification === 'hifi' || classification === 'lofi'
                ? aiModelFactory(classification)
                : aiModelFactory('lofi');
          const model = wrapLanguageModel({
            middleware: createChatHistoryMiddleware(chatHistoryContext),
            model: modelInstance as LanguageModelV1,
          });
          
          // Process the request (simplified - in real implementation would handle streaming)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
          });
          
          const generatePromise = generateText({
            model,
            messages: (request.request.messages as CoreMessage[]) || [],
            // maxTokens: 1000, // reasonable limit
          });
          chatHistoryContext.iteration++;


          const result = await Promise.race([generatePromise, timeoutPromise]);
          
          // Store successful response
          const response: ProcessedResponse = {
            id: request.id,
            response: result,
            processedAt: new Date().toISOString(),
          };
          
          await rateLimitQueueManager.storeResponse(response);
          
          const duration = Date.now() - requestStartTime;
          rateLimitMetrics.recordProcessingDuration(duration, classification);
          rateLimitMetrics.recordMessageProcessed(classification, 1);
          
          processedCount++;
          log(l => l.verbose(`Successfully processed request ${request.id}`));

        } catch (error) {
          log(l => l.error(`Error processing request ${request.id}:`, error));

          // Check if it's another rate limit
          if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('RateRetry'))) {
            // Move to gen-2 queue
            const gen2Request: RateLimitedRequest = {
              ...request,
              metadata: {
                ...request.metadata,
                generation: 2,
              },
            };
            await rateLimitQueueManager.enqueueRequest(gen2Request);
            rateLimitMetrics.recordError('moved_to_gen2', classification);
          } else {
            // Store error response
            const errorResponse: ProcessedResponse = {
              id: request.id,
              error: {
                type: error instanceof Error && error.message.includes('timeout') ? 'server_error' : 'server_error',
                message: error instanceof Error ? error.message : 'Unknown error',
              },
              processedAt: new Date().toISOString(),
            };
            
            await rateLimitQueueManager.storeResponse(errorResponse);
            rateLimitMetrics.recordError('processing_error', classification);
          }
        }
        
        // Check time limit
        const totalElapsed = Date.now() - startTime;
        if (totalElapsed >= MAX_PROCESSING_TIME_MS) {
          log(l => l.error(new Error('Max processing time reached during gen-1 processing')));
          break;
        }
      }
    }
    
    // Process gen-2 messages (only one per model classification)
    const totalElapsed = Date.now() - startTime;
    if (totalElapsed < MAX_PROCESSING_TIME_MS) {
      for (const classification of modelClassifications) {
        const processingTimeElapsed = Date.now() - startTime;
        if (processingTimeElapsed >= MAX_PROCESSING_TIME_MS) {
          break;
        }
        
        // Only process gen-2 if no gen-1 was processed for this classification
        const gen2QueueSize = await rateLimitQueueManager.getQueueSize(2, classification);
        rateLimitMetrics.updateQueueSize(gen2QueueSize, classification, 2);
        
        if (gen2QueueSize === 0) {
          continue;
        }
        
        // Check model availability
        const azureModelKey = `azure:${classification}`;
        const googleModelKey = `google:${classification}`;
        
        const azureAvailable = isModelAvailable(azureModelKey);
        const googleAvailable = isModelAvailable(googleModelKey);
        
        if (!azureAvailable && !googleAvailable) {
          continue;
        }
        
        // Process only one gen-2 request
        const requests = await rateLimitQueueManager.dequeueRequests(2, classification, 1);
        if (requests.length === 0) {
          continue;
        }
        
        const request = requests[0];
        log(l => l.verbose(`Processing gen-2 request ${request.id} for ${classification}`));

        try {
          // If we've made it all the way to gen-2 it's time to bust out the bgcontext model.
          const modelInstance = aiModelFactory('google:gemini-2.0-flash');
          const model = wrapLanguageModel({
            model: modelInstance as LanguageModelV1,
            middleware: createChatHistoryMiddleware(chatHistoryContext),
          });           
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT_MS);
          });
          
          const generatePromise = generateText({
            model,
            messages: (request.request.messages as CoreMessage[]) || [],
            maxTokens: 1000,
          });
          
          const result = await Promise.race([generatePromise, timeoutPromise]);
          
          const response: ProcessedResponse = {
            id: request.id,
            response: result,
            processedAt: new Date().toISOString(),
          };
          
          await rateLimitQueueManager.storeResponse(response);
          rateLimitMetrics.recordMessageProcessed(classification, 2);
          processedCount++;
          
        } catch (error) {
          log(l => l.error(`Gen-2 request ${request.id} failed:`, error));

          // Gen-2 failures are critical - mark as will not retry
          const errorResponse: ProcessedResponse = {
            id: request.id,
            error: {
              type: 'will_not_retry',
              message: `Gen-2 processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
            processedAt: new Date().toISOString(),
          };
          
          await rateLimitQueueManager.storeResponse(errorResponse);
          rateLimitMetrics.recordError('gen2_critical_failure', classification);
        }
      }
    }
    
    const totalDuration = Date.now() - startTime;
    log(l => l.verbose(`Rate retry processing completed. Processed: ${processedCount}, Duration: ${totalDuration}ms`));

    return NextResponse.json({
      success: true,
      processed: processedCount,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
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
