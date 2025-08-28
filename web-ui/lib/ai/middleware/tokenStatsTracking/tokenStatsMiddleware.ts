import type { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { getInstance } from '../../services/model-stats/token-stats-service';
import { log } from '@/lib/logger';
import { QuotaCheckResult, QuotaEnforcementError, TokenStatsMiddlewareConfig, TokenUsageData } from './types';
import { countTokens } from '../../core/count-tokens';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { createSimpleStatefulMiddleware } from '../state-management';

type DoGenerateReturnType = ReturnType<LanguageModelV1['doGenerate']>;
type DoStreamReturnType = ReturnType<LanguageModelV1['doStream']>;
type TokenStatsTransformParamsType = LanguageModelV1CallOptions & {
  providerMetadata?: LanguageModelV1CallOptions['providerMetadata'] & {
    backOffice?: {
      estTokens?: number;
    };
  };
};

/**
 * Extract provider and model name from various model ID formats
 */
const extractProviderAndModel = (modelId: string): { provider: string; modelName: string } => {
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
};

const isQuotaEnforcementError = (error: unknown): error is QuotaEnforcementError =>
  typeof error === 'object' 
&& !!error 
&& 'message' in error
&& 'quota' in error
&& typeof error.quota === 'object';


const quotaCheck = async ({
  provider,
  modelName,
  estimatedTokens,
  enableQuotaEnforcement = true,
  enableLogging = true,
}: {
  provider: string;
  modelName: string;
  estimatedTokens: number;
  enableQuotaEnforcement: boolean;
  enableLogging: boolean;
}): Promise<QuotaCheckResult> => {
  try {
    const quotaCheck = await getInstance().checkQuota(
      provider,
      modelName,
      estimatedTokens,
    );
    if (quotaCheck.allowed) {
      if (enableLogging) {
        log((l) =>
          l.verbose('Quota check passed', {
            provider,
            modelName,
            estimatedTokens,
            currentUsage: quotaCheck.currentUsage,
          }),
        );
      }
      return quotaCheck;
    }
    if (enableLogging) {
      log((l) =>
        l.warn('Request failed quota check', {
          provider,
          modelName,
          reason: quotaCheck.reason,
          currentUsage: quotaCheck.currentUsage,
          quota: quotaCheck.quota,
        }),
      );
    }
    if (enableQuotaEnforcement) {
      const error: QuotaEnforcementError = new Error(
        `Quota exceeded: ${quotaCheck.reason}`,
      );
      // Attach quota information to error for upstream handling
      error.quota = quotaCheck;
      throw error;
    }
  } catch (error) {
    // Re-throw quota violations, only catch actual quota checking errors
    if (isQuotaEnforcementError(error)) {
      throw error;
    }
    // If quota checking fails, log but don't block (fail open)
    if (enableLogging) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'tokenStatsMiddleware.quotaCheck',
        log: enableLogging,
        data: {
          provider,
          modelName,
          estimatedTokens,
        },
      });
    } 
  }
  return { allowed: true, reason: 'Quota check failed, allowing request' };
};





const wrapGenerate = async ({
  doGenerate,
  model,
  config: {
    provider: configProvider,
    modelName: configModelName,
    enableLogging = true,
    enableQuotaEnforcement = false,
  },
  params: {
    providerMetadata: { backOffice: { estTokens: estimatedTokens = 0 } = {} } = {},
  },
}: {
  doGenerate: () => DoGenerateReturnType;
  model: LanguageModelV1;
  config: TokenStatsMiddlewareConfig;
  params: TokenStatsTransformParamsType;
}): Promise<DoGenerateReturnType> => {
  try {
    // Extract provider and model info from the model instance
    // Note: We'll need to pass this info through config since it's not available in params
    const { provider, modelName } =
      configProvider && configModelName
        ? { provider: configProvider, modelName: configModelName }
        : model.provider && model.modelId
          ? { provider: model.provider, modelName: model.modelId }
          : extractProviderAndModel(model.modelId);

    if (enableLogging) {
      log((l) =>
        l.verbose('Token stats middleware processing request', {
          provider,
          modelName,
        }),
      );
    }
    await quotaCheck({
      provider,
      modelName,
      estimatedTokens,
      enableQuotaEnforcement,
      enableLogging,
    });
    // Execute the request
    try {
      const result = await doGenerate();
      // Post-request usage recording
      if (result.usage) {
        const tokenUsage: TokenUsageData = {
          promptTokens: result.usage.promptTokens || 0,
          completionTokens: result.usage.completionTokens || 0,
          totalTokens:
            (result.usage.promptTokens || 0) +
            (result.usage.completionTokens || 0),
        };

        // Record usage asynchronously to avoid blocking the response
        getInstance().safeRecordTokenUsage(
          provider,
          modelName,
          tokenUsage,
        ).catch((error: unknown) => {
          if (enableLogging) {
            log((l) =>
              l.error('Failed to record token usage', {
                provider,
                modelName,
                tokenUsage,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        });

        if (enableLogging) {
          log((l) =>
            l.debug('Token usage recorded', {
              provider,
              modelName,
              tokenUsage,
            }),
          );
        }
      }
      return result;
    } catch (error) {
      if (isQuotaEnforcementError(error)) {
        // If this is a quota enforcement error, re-throw it
        throw error;
      }
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'tokenStatsMiddleware.wrapGenerate',
        log: enableLogging,
        data: {
          provider,
          modelName,
          estimatedTokens,
        },
      });
    }
  } catch (error) {
    if (isQuotaEnforcementError(error)) {
      // If this is a quota enforcement error, re-throw it
      throw error;
    } else {
      // Otherwise it's a critical error; log/rethrow
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'tokenStatsMiddleware.wrapGenerate',
        log: enableLogging,
        data: {
          provider: configProvider || model.provider,
          modelName: configModelName || model.modelId,
          estimatedTokens,
        },
      });
    }
  }
  
};

const wrapStream = async ({
  doStream,
  model,
  config: {
    provider: configProvider,
    modelName: configModelName,
    enableLogging = true,
    enableQuotaEnforcement = false,
  },
  params: {
    providerMetadata: { backOffice: { estTokens: estimatedTokens = 0 } = {} } = {},
  },
}: {
  doStream: () => DoStreamReturnType;
  model: LanguageModelV1;
  config: TokenStatsMiddlewareConfig;
  params: TokenStatsTransformParamsType;
}): Promise<DoStreamReturnType> => {
  // Extract provider and model info from the model instance
  const { provider, modelName } =
    configProvider && configModelName
      ? { provider: configProvider, modelName: configModelName }
      : model.provider && model.modelId
        ? { provider: model.provider, modelName: model.modelId }
        : extractProviderAndModel(model.modelId);

  if (enableLogging) {
    log((l) =>
      l.verbose('Token stats middleware processing stream request', {
        provider,
        modelName,
      }),
    );
  }

  // Pre-stream quota check
  await quotaCheck({
    provider,
    modelName,
    estimatedTokens,
    enableQuotaEnforcement,
    enableLogging,
  });

  try {
    const result = await doStream();
    
    // Track token usage during streaming
    let promptTokens = 0;
    let completionTokens = 0;
    let generatedText = '';
    let hasFinished = false;

    // Create a transform stream to wrap the original stream
    const transformStream = new TransformStream<LanguageModelV1StreamPart, LanguageModelV1StreamPart>({
      transform(chunk, controller) {
        try {
          // Track text generation for token counting
          if (chunk.type === 'text-delta') {
            generatedText += chunk.textDelta;
          }

          // Extract usage information from finish chunks
          if (chunk.type === 'finish') {
            hasFinished = true;
            if (chunk.usage) {
              promptTokens = chunk.usage.promptTokens || 0;
              completionTokens = chunk.usage.completionTokens || 0;
            }
          }

          // Pass through the chunk
          controller.enqueue(chunk);
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.streamTransform',
            log: enableLogging,
            data: {
              provider,
              modelName,
              chunkType: chunk.type,
            },
          });
        }
       
      },
      
      flush() {
        try {
          // Record token usage after stream completion
          if (hasFinished || generatedText.length > 0) {
            // If we don't have exact usage from the stream, estimate completion tokens
            if (completionTokens === 0 && generatedText.length > 0) {
              completionTokens = Math.ceil(generatedText.length / 4); // Rough estimation
            }

            // If we don't have prompt tokens, use the estimated value
            if (promptTokens === 0) {
              promptTokens = estimatedTokens;
            }

            const tokenUsage: TokenUsageData = {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            };

            // Record usage asynchronously to avoid blocking the stream
            if (tokenUsage.totalTokens > 0) {
              getInstance().safeRecordTokenUsage(
                provider,
                modelName,
                tokenUsage,
              ).catch((error: unknown) => {
                if (enableLogging) {
                  log((l) =>
                    l.error('Failed to record token usage for stream', {
                      provider,
                      modelName,
                      tokenUsage,
                      error:
                        error instanceof Error ? error.message : String(error),
                    }),
                  );
                }
              });

              if (enableLogging) {
                log((l) =>
                  l.debug('Stream token usage recorded', {
                    provider,
                    modelName,
                    tokenUsage,
                    generatedTextLength: generatedText.length,
                  }),
                );
              }
            }
          }
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tokenStatsMiddleware.streamTransformFlush',
            log: enableLogging,
            data: {
              provider,
              modelName,
            },
          });
        }        
      }
    });

    // Return the result with the transformed stream
    return {
      ...result,
      stream: result.stream.pipeThrough(transformStream),
    };
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'tokenStatsMiddleware.wrapStream',
      log: enableLogging,
      data: {
        provider,
        modelName,
        estimatedTokens,
      },
    });
  }
};

export const transformParams = async ({
  params: { prompt, providerMetadata = {}, ...params },
  config: { enableLogging = true }
}: {
  config: TokenStatsMiddlewareConfig;
  params: TokenStatsTransformParamsType;
}): Promise<TokenStatsTransformParamsType> => {  
  try {
    const tokens = countTokens({ prompt, enableLogging });    
    providerMetadata.backOffice = {
      ...(providerMetadata.backOffice ?? {}),
      estTokens: tokens,
    };
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, { 
      source: 'tokenStatsMiddleware.transformParams',
      log: enableLogging,
    });    
  }
  return {
    ...params,
    prompt,
    providerMetadata,
  };
};
  
/**
 * Create token statistics tracking middleware (Original Implementation)
 * 
 * This middleware:
 * 1. Checks quotas before making requests (if enforcement is enabled)
 * 2. Records actual token usage after successful requests
 * 3. Logs quota violations and usage statistics
 */
const createOriginalTokenStatsMiddleware = (config: TokenStatsMiddlewareConfig = {}): LanguageModelV1Middleware => {
  return {
    wrapGenerate: async (props) => wrapGenerate({
      ...props,
      config
    }),
    wrapStream: async (props) => wrapStream({
      ...props,
      config
    }), 
    transformParams: async (props) => transformParams({
      ...props,
      config,
    })
  };
};

/**
 * Create token statistics tracking middleware with State Management Support
 * 
 * This middleware supports the state management protocol and can participate
 * in state collection and restoration operations.
 */
export const tokenStatsMiddleware = (config: TokenStatsMiddlewareConfig = {}): LanguageModelV1Middleware => {
  const originalMiddleware = createOriginalTokenStatsMiddleware(config);
  return createSimpleStatefulMiddleware(
    'token-stats-tracking',
    originalMiddleware
  );
};

/**
 * Create token statistics middleware with quota enforcement enabled
 */
export const tokenStatsWithQuotaMiddleware = (config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {}) => {
  return tokenStatsMiddleware({ ...config, enableQuotaEnforcement: true });
};

/**
 * Create token statistics middleware with only logging (no quota enforcement)
 */
export const tokenStatsLoggingOnlyMiddleware = (config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {}) => {
  return tokenStatsMiddleware({ ...config, enableLogging: true, enableQuotaEnforcement: false });
};