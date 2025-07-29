import type { LanguageModelV1Middleware } from 'ai';
import { tokenStatsService, TokenUsageData } from './tokenStatsService';
import { log } from '@/lib/logger';

/**
 * Middleware configuration for token statistics tracking
 */
export interface TokenStatsMiddlewareConfig {
  enableLogging?: boolean;
  enableQuotaEnforcement?: boolean;
  // Provider and model can be overridden, otherwise extracted from model ID
  provider?: string;
  modelName?: string;
}

/**
 * Extract provider and model name from various model ID formats
 */
function extractProviderAndModel(modelId: string): { provider: string; modelName: string } {
  // Handle explicit provider:model format (e.g., "azure:hifi", "google:gemini-pro")
  if (modelId.includes(':')) {
    const [provider, ...modelParts] = modelId.split(':');
    return { provider, modelName: modelParts.join(':') };
  }

  // Handle common model names and map to likely providers
  const modelMappings: Record<string, { provider: string; modelName: string }> = {
    'hifi': { provider: 'azure', modelName: 'hifi' },
    'lofi': { provider: 'azure', modelName: 'lofi' },
    'completions': { provider: 'azure', modelName: 'completions' },
    'embedding': { provider: 'azure', modelName: 'embedding' },
    'gemini-pro': { provider: 'google', modelName: 'gemini-pro' },
    'gemini-flash': { provider: 'google', modelName: 'gemini-flash' },
    'gemini-2.0-pro': { provider: 'google', modelName: 'gemini-2.0-pro' },
    'gemini-2.0-flash': { provider: 'google', modelName: 'gemini-2.0-flash' },
    'gemini-2.5-pro': { provider: 'google', modelName: 'gemini-2.5-pro' },
    'gemini-2.5-flash': { provider: 'google', modelName: 'gemini-2.5-flash' },
    'google-embedding': { provider: 'google', modelName: 'embedding' },
  };

  const mapped = modelMappings[modelId];
  if (mapped) {
    return mapped;
  }

  // Default to treating the modelId as both provider and model name for unknown formats
  return { provider: 'unknown', modelName: modelId };
}

/**
 * Estimate token count for quota checking before making the request
 * This is a rough estimate and may not be perfectly accurate
 */
function estimateRequestTokens(prompt: unknown): number {
  if (!prompt) return 0;
  
  try {
    // Simple estimation: convert to string and divide by average characters per token (~4)
    const promptStr = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    return Math.ceil(promptStr.length / 4);
  } catch {
    // If we can't estimate, assume a reasonable default
    return 100;
  }
}

/**
 * Create token statistics tracking middleware
 * 
 * This middleware:
 * 1. Checks quotas before making requests (if enforcement is enabled)
 * 2. Records actual token usage after successful requests
 * 3. Logs quota violations and usage statistics
 */
export function tokenStatsMiddleware(config: TokenStatsMiddlewareConfig = {}): LanguageModelV1Middleware {
  const {
    enableLogging = true,
    enableQuotaEnforcement = false,
    provider: configProvider,
    modelName: configModelName,
  } = config;

  return {
    wrapGenerate: async ({ doGenerate }) => {
      // Extract provider and model info from the model instance
      // Note: We'll need to pass this info through config since it's not available in params
      const { provider, modelName } = configProvider && configModelName 
        ? { provider: configProvider, modelName: configModelName }
        : { provider: 'unknown', modelName: 'unknown' };

      if (enableLogging) {
        log(l => l.debug('Token stats middleware processing request', {
          provider,
          modelName,
        }));
      }

      // Pre-request quota checking
      if (enableQuotaEnforcement) {
        try {
          // For quota checking, we need to estimate tokens since we don't have access to params here
          // This is a limitation of the current middleware interface
          const estimatedTokens = 100; // Conservative estimate
          const quotaCheck = await tokenStatsService.checkQuota(provider, modelName, estimatedTokens);
          
          if (!quotaCheck.allowed) {
            const error = new Error(`Quota exceeded: ${quotaCheck.reason}`);
            
            if (enableLogging) {
              log(l => l.warn('Request blocked by quota enforcement', {
                provider,
                modelName,
                reason: quotaCheck.reason,
                currentUsage: quotaCheck.currentUsage,
                quota: quotaCheck.quota,
              }));
            }
            
            // Attach quota information to error for upstream handling
            (error as any).quotaInfo = quotaCheck;
            throw error;
          }
          
          if (enableLogging && quotaCheck.quota) {
            log(l => l.debug('Quota check passed', {
              provider,
              modelName,
              estimatedTokens,
              currentUsage: quotaCheck.currentUsage,
            }));
          }
        } catch (error) {
          // Re-throw quota violations, only catch actual quota checking errors
          if (error instanceof Error && error.message.startsWith('Quota exceeded:')) {
            throw error;
          }
          
          // If quota checking fails, log but don't block (fail open)
          if (enableLogging) {
            log(l => l.error('Quota check failed, allowing request', {
              provider,
              modelName,
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        }
      }

      // Execute the request
      try {
        const result = await doGenerate();

        // Post-request usage recording
        if (result.usage) {
          const tokenUsage: TokenUsageData = {
            promptTokens: result.usage.promptTokens || 0,
            completionTokens: result.usage.completionTokens || 0,
            totalTokens: (result.usage.promptTokens || 0) + (result.usage.completionTokens || 0),
          };

          // Record usage asynchronously to avoid blocking the response
          tokenStatsService.recordTokenUsage(provider, modelName, tokenUsage).catch(error => {
            if (enableLogging) {
              log(l => l.error('Failed to record token usage', {
                provider,
                modelName,
                tokenUsage,
                error: error instanceof Error ? error.message : String(error),
              }));
            }
          });

          if (enableLogging) {
            log(l => l.debug('Token usage recorded', {
              provider,
              modelName,
              tokenUsage,
            }));
          }
        }

        return result;
      } catch (error) {
        // Log failed requests but still throw the error
        if (enableLogging) {
          log(l => l.error('Request failed in token stats middleware', {
            provider,
            modelName,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
        throw error;
      }
    },
  };
}

/**
 * Create token statistics middleware with quota enforcement enabled
 */
export function tokenStatsWithQuotaMiddleware(config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {}) {
  return tokenStatsMiddleware({ ...config, enableQuotaEnforcement: true });
}

/**
 * Create token statistics middleware with only logging (no quota enforcement)
 */
export function tokenStatsLoggingOnlyMiddleware(config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {}) {
  return tokenStatsMiddleware({ ...config, enableQuotaEnforcement: false });
}