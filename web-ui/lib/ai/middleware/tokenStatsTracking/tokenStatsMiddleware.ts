import { getInstance } from '../../services/model-stats/token-stats-service';
import { log } from '@/lib/logger';
import {
  QuotaCheckResult,
  QuotaEnforcementError,
  TokenStatsMiddlewareConfig,
  TokenUsageData,
} from './types';
import { countTokens } from '../../core/count-tokens';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { MiddlewareStateManager } from '../state-management';

import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
  LanguageModelV2Middleware,
} from '@ai-sdk/provider';
import { ModelMap } from '../../services/model-stats/model-map';
import { isModelResourceNotFoundError } from '../../services/chat/errors/model-resource-not-found-error';
import { SerializableLanguageModelMiddleware } from '../state-management/types';
// import { models } from '@/drizzle/schema';

type DoGenerateReturnType = ReturnType<LanguageModelV2['doGenerate']>;
type DoStreamReturnType = ReturnType<LanguageModelV2['doStream']>;
type TokenStatsTransformParamsType = LanguageModelV2CallOptions & {
  providerOptions?: LanguageModelV2CallOptions['providerOptions'] & {
    backOffice?: {
      estTokens?: number;
    };
  };
};

/**
 * Extract provider and model name from various model ID formats
 */
const extractProviderAndModel = async (
  modelId: string | LanguageModelV2,
): Promise<{ provider: string; modelName: string }> => {
  const modelMap = await ModelMap.getInstance();
  const parts = await modelMap.normalizeProviderModel(modelId);
  parts.rethrow();
  const { provider, modelName } = parts;
  return {
    provider,
    modelName,
  };
};

const isQuotaEnforcementError = (
  error: unknown,
): error is QuotaEnforcementError =>
  typeof error === 'object' &&
  !!error &&
  'message' in error &&
  'quota' in error &&
  typeof error.quota === 'object';

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
    providerOptions: {
      backOffice: { estTokens: estimatedTokens = 0 } = {},
    } = {},
  },
}: {
  doGenerate: () => DoGenerateReturnType;
  model: string | LanguageModelV2;
  config: TokenStatsMiddlewareConfig;
  params: TokenStatsTransformParamsType;
}): Promise<DoGenerateReturnType> => {
  try {
    let provider: string = '';
    let modelName: string = '';
    try {
      // Extract provider and model info from the model instance
      // Note: We'll need to pass this info through config since it's not available in params
      const { provider: providerFromProps, modelName: modelNameFromProps } =
        await (typeof model === 'string'
          ? extractProviderAndModel(model)
          : configProvider && configModelName
            ? { provider: configProvider, modelName: configModelName }
            : model.provider && model.modelId
              ? { provider: model.provider, modelName: model.modelId }
              : extractProviderAndModel(model.modelId));
      provider = providerFromProps;
      modelName = modelNameFromProps;
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
    } catch (error) {
      // If quota enforcement is not enabled then we still want to run
      // the request if the model is not found
      if (isModelResourceNotFoundError(error)) {
        if (enableLogging) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            data: {
              severity: 'warning',
              message: 'Unknown model',
              model,
            },
          });
        }
        if (enableQuotaEnforcement) {
          throw error;
        }
      } else {
        throw error;
      }
    }
    // Execute the request
    try {
      const result = await doGenerate();
      // Post-request usage recording
      if (result.usage) {
        const tokenUsage: TokenUsageData = {
          promptTokens: result?.usage?.inputTokens || 0,
          completionTokens: result?.usage?.outputTokens || 0,
          totalTokens: result?.usage?.totalTokens || 0,
        };
        // If the provider and modelName are available, record the token usage
        if (provider && modelName) {
          getInstance()
            .safeRecordTokenUsage(provider, modelName, tokenUsage)
            .catch((error: unknown) => {
              if (enableLogging) {
                log((l) =>
                  l.error('Failed to record token usage', {
                    provider,
                    modelName,
                    tokenUsage,
                    error:
                      error instanceof Error ? error.message : String(error),
                  }),
                );
              }
            });
        }
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
          provider:
            configProvider || typeof model === 'string' ? '' : model.provider,
          modelName:
            configModelName || typeof model === 'string'
              ? model
              : model.modelId,
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
    providerOptions: {
      backOffice: { estTokens: estimatedTokens = 0 } = {},
    } = {},
  },
}: {
  doStream: () => DoStreamReturnType;
  model: string | LanguageModelV2;
  config: TokenStatsMiddlewareConfig;
  params: TokenStatsTransformParamsType;
}): Promise<DoStreamReturnType> => {
  let provider: string = '';
  let modelName: string = '';

  try {
    // Extract provider and model info from the model instance
    const { provider: providerFromProps, modelName: modelNameFromProps } =
      await (typeof model === 'string'
        ? extractProviderAndModel(model)
        : configProvider && configModelName
          ? { provider: configProvider, modelName: configModelName }
          : model.provider && model.modelId
            ? { provider: model.provider, modelName: model.modelId }
            : extractProviderAndModel(model));

    provider = providerFromProps;
    modelName = modelNameFromProps;

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
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'tokenStatsMiddleware.wrapStream',
      log: enableLogging,
      data: {
        provider,
        modelName,
        estimatedTokens,
      },
    });
    if (isQuotaEnforcementError(error) || isModelResourceNotFoundError(error)) {
      // If this is a quota enforcement error or a model lookup error and quota enforcement is enabled, re-throw it
      if (enableQuotaEnforcement) {
        throw enableLogging ? le : error;
      }
    } else {
      throw enableLogging ? le : error;
    }
  }

  try {
    const result = await doStream();

    // Track token usage during streaming
    let promptTokens = 0;
    let completionTokens = 0;
    let generatedText = '';
    let hasFinished = false;

    // Create a transform stream to wrap the original stream
    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        try {
          // Track text generation for token counting
          if (chunk.type === 'text-delta') {
            generatedText += chunk.delta;
          }

          // Extract usage information from finish chunks
          if (chunk.type === 'finish') {
            hasFinished = true;
            if (chunk.usage) {
              promptTokens = chunk.usage.inputTokens || 0;
              completionTokens = chunk.usage.outputTokens || 0;
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
        // If I don't have a provider and model id then there's nothing for me to do...
        if (!provider || !modelName) {
          return;
        }
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
              getInstance()
                .safeRecordTokenUsage(provider, modelName, tokenUsage)
                .catch((error: unknown) => {
                  if (enableLogging) {
                    log((l) =>
                      l.error('Failed to record token usage for stream', {
                        provider,
                        modelName,
                        tokenUsage,
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
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
      },
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
  params: { prompt, providerOptions: providerMetadata = {}, ...params },
  config: { enableLogging = true },
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
    providerOptions: providerMetadata,
  };
};

/**
 * Create token statistics tracking middleware
 *
 * This middleware:
 * 1. Checks quotas before making requests (if enforcement is enabled)
 * 2. Records actual token usage after successful requests
 * 3. Logs quota violations and usage statistics
 * 4. Participates in state management protocol
 */
const createOriginalTokenStatsMiddleware = (
  config: TokenStatsMiddlewareConfig = {},
): LanguageModelV2Middleware => {
  const setupModelProviderOverrides = () => ({
    overrideProvider: config.provider
      ? ({}: { model: LanguageModelV2 }) => config.provider!
      : undefined,
    overrideModelId: config.modelName
      ? ({}: { model: LanguageModelV2 }) => config.modelName!
      : undefined,
  });
  let { overrideProvider, overrideModelId } = setupModelProviderOverrides();
  const thisInstance = {
    wrapGenerate: async (props) =>
      wrapGenerate({
        ...props,
        config,
      }),
    wrapStream: async (props) =>
      wrapStream({
        ...props,
        config,
      }),
    transformParams: async (props) =>
      transformParams({
        ...props,
        config,
      }),
    getMiddlewareId: () => 'token-stats-tracking',
    serializeState: () => Promise.resolve({ config: JSON.stringify(config) }),
    deserializeState: ({ state }) => {
      const { config: configFromState } = state;
      if (!configFromState) {
        return Promise.reject(
          new TypeError('Missing required property "config".'),
        );
      }
      config = JSON.parse(
        configFromState.toString(),
      ) as TokenStatsMiddlewareConfig;
      ({ overrideProvider, overrideModelId } = setupModelProviderOverrides());
      thisInstance.overrideProvider = overrideProvider;
      thisInstance.overrideModelId = overrideModelId;
      return Promise.resolve();
    },
    overrideProvider,
    overrideModelId,
  } as SerializableLanguageModelMiddleware;
  return thisInstance;
};

/**
 * Create token statistics tracking middleware with State Management Support
 *
 * This middleware supports the state management protocol and can participate
 * in state collection and restoration operations.
 */
export const tokenStatsMiddleware = (
  config: TokenStatsMiddlewareConfig = {},
): LanguageModelV2Middleware =>
  MiddlewareStateManager.Instance.statefulMiddlewareWrapper({
    middlewareId: 'token-stats-tracking',
    middleware: createOriginalTokenStatsMiddleware(config),
  });

/**
 * Create token statistics middleware with quota enforcement enabled
 */
export const tokenStatsWithQuotaMiddleware = (
  config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {},
) =>
  tokenStatsMiddleware({
    enableLogging: true,
    ...config,
    enableQuotaEnforcement: true,
  });

/**
 * Create token statistics middleware with only logging (no quota enforcement)
 */
export const tokenStatsLoggingOnlyMiddleware = (
  config: Omit<TokenStatsMiddlewareConfig, 'enableQuotaEnforcement'> = {},
) =>
  tokenStatsMiddleware({
    ...config,
    enableLogging: true,
    enableQuotaEnforcement: false,
  });
