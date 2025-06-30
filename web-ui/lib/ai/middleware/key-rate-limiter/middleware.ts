import type { LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { getRetryErrorInfo } from '@/lib/ai/chat';
import { isModelAvailable, temporarilyDisableModel, getModelAvailabilityStatus } from '@/lib/ai/aiModelFactory';
import { rateLimitQueueManager } from './queue-manager';
import { rateLimitMetrics } from './metrics';
import type { RateLimitedRequest, ModelClassification, ModelFailoverConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

// Model classification mapping - extract from model identifier
function getModelClassification(params: any): ModelClassification {
  const modelId = params?.model || 'unknown';
  
  if (modelId.includes('hifi') || modelId.includes('gpt-4') || modelId.includes('gemini-1.5-pro')) {
    return 'hifi';
  }
  if (modelId.includes('lofi') || modelId.includes('gpt-3.5') || modelId.includes('gemini-1.5-flash')) {
    return 'lofi';
  }
  if (modelId.includes('embedding')) {
    return 'embedding';
  }
  if (modelId.includes('completions')) {
    return 'completions';
  }
  
  return 'hifi'; // default fallback
}

// Provider and model failover logic
function getFailoverConfig(currentProvider: string, modelClassification: ModelClassification): ModelFailoverConfig | null {
  const primaryProvider = currentProvider.includes('azure') ? 'azure' : 'google';
  const fallbackProvider = primaryProvider === 'azure' ? 'google' : 'azure';
  
  return {
    primaryProvider,
    fallbackProvider,
    modelClassification,
  };
}

// Check if model is available and get fallback if needed
function getAvailableModel(provider: 'azure' | 'google', classification: ModelClassification): string | null {
  const modelKey = `${provider}:${classification}`;
  return isModelAvailable(modelKey) ? modelKey : null;
}

// Disable model based on rate limit headers
function disableModelFromRateLimit(modelKey: string, retryAfter: number): void {
  const disableDurationMs = Math.max(retryAfter * 1000, 60000); // At least 1 minute
  console.warn(`Rate limit detected for ${modelKey}, disabling for ${disableDurationMs}ms`);
  temporarilyDisableModel(modelKey, disableDurationMs);
  rateLimitMetrics.recordError('rate_limit_disable', modelKey);
}

export const retryRateLimitMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = Date.now();
    const modelClassification = getModelClassification(params);
    
    console.log('Advanced rate limit middleware - doGenerate called');
    console.log(`Model classification: ${modelClassification}`);

    // Check if current model is available, attempt fallback if not
    const currentProvider = 'azure'; // Default assumption
    const currentModelKey = `${currentProvider}:${modelClassification}`;
    
    if (!isModelAvailable(currentModelKey)) {
      console.log(`Model ${currentModelKey} is disabled, attempting fallback`);
      
      const failoverConfig = getFailoverConfig(currentProvider, modelClassification);
      if (failoverConfig) {
        const fallbackModelKey = getAvailableModel(failoverConfig.fallbackProvider, modelClassification);
        if (fallbackModelKey) {
          console.log(`Using fallback model: ${fallbackModelKey}`);
          // Note: In a real implementation, we'd need to modify the params to use the fallback model
          // This would require integration with the model factory to switch providers
        } else {
          // No fallback available, enqueue for retry
          const requestId = uuidv4();
          const rateLimitedRequest: RateLimitedRequest = {
            id: requestId,
            modelClassification,
            request: { params, messages: [] }, // We don't have messages in generate
            metadata: {
              submittedAt: new Date().toISOString(),
              generation: 1,
            },
          };
          
          await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
          rateLimitMetrics.recordError('no_models_available', modelClassification);
          
          throw new Error(`No ${modelClassification} models available. Request enqueued with ID: ${requestId}`);
        }
      }
    }

    try {
      const result = await doGenerate();
      
      const duration = Date.now() - startTime;
      rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
      
      console.log('doGenerate finished successfully');
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
      
      // Check if this is a rate limit error
      const rateLimitErrorInfo = getRetryErrorInfo(error);
      if (rateLimitErrorInfo?.isRetry && rateLimitErrorInfo.retryAfter) {
        console.log(`Rate limit detected: ${rateLimitErrorInfo.retryAfter}s`);
        
        // Disable the current model
        disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);
        
        // Try fallback if available
        const failoverConfig = getFailoverConfig(currentProvider, modelClassification);
        if (failoverConfig) {
          const fallbackModelKey = getAvailableModel(failoverConfig.fallbackProvider, modelClassification);
          if (fallbackModelKey && fallbackModelKey !== currentModelKey) {
            console.log(`Attempting fallback to: ${fallbackModelKey}`);
            // Note: Would need to retry with fallback model here
            // For now, enqueue for later processing
          }
        }
        
        // Enqueue for retry processing
        const requestId = uuidv4();
        const rateLimitedRequest: RateLimitedRequest = {
          id: requestId,
          modelClassification,
          request: { params, messages: [] },
          metadata: {
            submittedAt: new Date().toISOString(),
            generation: 1,
          },
        };
        
        await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
        rateLimitMetrics.recordError('rate_limit_enqueue', modelClassification);
        
        // Modify error to include request ID
        throw new Error(`Rate limit exceeded. Request enqueued with ID: ${requestId}. Retry after: ${rateLimitErrorInfo.retryAfter}s`);
      }
      
      rateLimitMetrics.recordError('other_error', modelClassification);
      throw error;
    }
  },

  wrapStream: async ({ doStream, params }) => {
    const startTime = Date.now();
    const modelClassification = getModelClassification(params);
    
    console.log('Advanced rate limit middleware - doStream called');
    console.log(`Model classification: ${modelClassification}`);

    // Similar model availability check as in wrapGenerate
    const currentProvider = 'azure'; // Default assumption
    const currentModelKey = `${currentProvider}:${modelClassification}`;
    
    if (!isModelAvailable(currentModelKey)) {
      console.log(`Model ${currentModelKey} is disabled, attempting fallback`);
      
      const failoverConfig = getFailoverConfig(currentProvider, modelClassification);
      if (failoverConfig) {
        const fallbackModelKey = getAvailableModel(failoverConfig.fallbackProvider, modelClassification);
        if (!fallbackModelKey) {
          // No fallback available, enqueue for retry
          const requestId = uuidv4();
          const rateLimitedRequest: RateLimitedRequest = {
            id: requestId,
            modelClassification,
            request: { params, messages: [] }, // Note: messages would come from params
            metadata: {
              submittedAt: new Date().toISOString(),
              generation: 1,
            },
          };
          
          await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
          rateLimitMetrics.recordError('no_models_available', modelClassification);
          
          throw new Error(`No ${modelClassification} models available. Request enqueued with ID: ${requestId}`);
        }
      }
    }

    try {
      const { stream, ...rest } = await doStream();
      let generatedText = '';
      let hasError = false;

      const transformStream = new TransformStream<
        LanguageModelV1StreamPart,
        LanguageModelV1StreamPart
      >({
        transform(chunk, controller) {
          if (chunk.type === 'text-delta') {
            generatedText += chunk.textDelta;
          }
          
          // Check for error chunks that might indicate rate limiting
          if (chunk.type === 'error') {
            hasError = true;
            const rateLimitErrorInfo = getRetryErrorInfo(chunk.error);
            if (rateLimitErrorInfo?.isRetry && rateLimitErrorInfo.retryAfter) {
              console.log(`Stream rate limit detected: ${rateLimitErrorInfo.retryAfter}s`);
              disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);
              rateLimitMetrics.recordError('stream_rate_limit', modelClassification);
            }
          }

          controller.enqueue(chunk);
        },

        flush() {
          const duration = Date.now() - startTime;
          rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
          
          if (!hasError) {
            console.log('doStream finished successfully');
            console.log(`Generated text length: ${generatedText.length}`);
          }
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
      
      // Handle rate limit errors similar to wrapGenerate
      const rateLimitErrorInfo = getRetryErrorInfo(error);
      if (rateLimitErrorInfo?.isRetry && rateLimitErrorInfo.retryAfter) {
        console.log(`Stream setup rate limit detected: ${rateLimitErrorInfo.retryAfter}s`);
        
        disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);
        
        // Enqueue for retry processing
        const requestId = uuidv4();
        const rateLimitedRequest: RateLimitedRequest = {
          id: requestId,
          modelClassification,
          request: { params, messages: [] },
          metadata: {
            submittedAt: new Date().toISOString(),
            generation: 1,
          },
        };
        
        await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
        rateLimitMetrics.recordError('stream_rate_limit_enqueue', modelClassification);
        
        throw new Error(`Stream rate limit exceeded. Request enqueued with ID: ${requestId}. Retry after: ${rateLimitErrorInfo.retryAfter}s`);
      }
      
      rateLimitMetrics.recordError('stream_other_error', modelClassification);
      throw error;
    }
  },

  transformParams: async ({ params }) => {
    console.log('transformParams called - checking model availability');
    
    const modelClassification = getModelClassification(params);
    const currentProvider = 'azure'; // Default assumption
    const currentModelKey = `${currentProvider}:${modelClassification}`;
    
    // Log current model availability status
    const availabilityStatus = getModelAvailabilityStatus();
    console.log('Model availability status:', availabilityStatus);
    
    // If current model is not available, we could potentially modify params here
    // to use a different model, but this would require careful handling
    if (!isModelAvailable(currentModelKey)) {
      console.warn(`Requested model ${currentModelKey} is not available`);
    }

    return params;
  },
};
