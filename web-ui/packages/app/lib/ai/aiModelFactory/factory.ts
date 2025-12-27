import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '@/lib/site-util/env';
import type {
  EmbeddingModelV2,
  LanguageModelV2,
  ProviderV2,
} from '@ai-sdk/provider';
import {
  type AiModelType,
  isAiLanguageModelType,
  type AiProviderType,
} from '@/lib/ai/core';
import {
  AiModelTypeValue_Embedding,
  AiModelTypeValue_GoogleEmbedding,
} from '@/lib/ai/core/unions';
import { log } from '@compliance-theater/logger';

import { customProvider, createProviderRegistry, wrapLanguageModel } from 'ai';
import { cacheWithRedis } from '../middleware/cacheWithRedis';
import { setNormalizedDefaultsMiddleware } from '../middleware/set-normalized-defaults';
import { tokenStatsLoggingOnlyMiddleware } from '../middleware/tokenStatsTracking';
import { MiddlewareStateManager } from '../middleware/state-management';

import {
  globalRequiredSingleton,
  isNotNull,
  SingletonProvider,
} from '@compliance-theater/typescript';
import { isAutoRefreshFeatureFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import type {
  AutoRefreshFeatureFlag,
  KnownFeatureType,
  ModelProviderFactoryConfig,
  ModelServerConfig,
} from '@/lib/site-util/feature-flags/types';
import { isPromise } from 'util/types';
import {
  type ModelFromDeploymentId,
  SupportedProviders,
  normalizeModelKeyForProvider,
  getModelFlag,
  caseProviderMatch,
} from './util';
import { getAvailability } from './model-availability-manager';
import { LoggedError } from '@/lib/react-util';

/**
 * Setup middleware for language models with caching and retry logic
 */
const setupMiddleware = async (
  provider: string,
  model: LanguageModelV2
): Promise<LanguageModelV2> => {
  return wrapLanguageModel({
    model: wrapLanguageModel({
      model: wrapLanguageModel({
        model,
        middleware: cacheWithRedis,
      }),
      middleware: setNormalizedDefaultsMiddleware,
    }),
    middleware: [
      tokenStatsLoggingOnlyMiddleware({ provider }),
      /*
      retryRateLimitMiddlewareFactory({
        model,
      }),
      */
    ],
  });
};

const getGuardedProvider = async <
  P extends AiProviderType,
  R extends ReturnType<typeof customProvider>
>(
  provider: P,
  cb: (config: ModelProviderFactoryConfig) => Promise<R>
): Promise<R | undefined> => {
  const flag = await getModelFlag(provider);
  if (!flag?.isEnabled) {
    return undefined;
  }
  if (!flag.isInitialized) {
    log((l) =>
      l.warn(
        `AiModelFactory: Loading provider configuration settings for new ${provider}.`
      )
    );
    // Wait until we get real data
    await flag.forceRefresh();
  }
  const cleanup = () => {
    log((l) =>
      l.verbose(
        `AiModelFactory: Configuration settings for provider ${provider} have been updated - obsolete provider removed from registry.`
      )
    );
    flag.removeOnChangedListener(cleanup);
  };
  flag.addOnChangedListener(cleanup);
  try {
    const ret = await cb(flag.value as ModelProviderFactoryConfig);
    if (isNotNull(ret)) {
      log((l) =>
        l.verbose(`AiModelFactory: Provider ${provider} has been initialized.`)
      );
      return ret;
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'AiModelFactory',
    });
  }

  log((l) =>
    l.warn(
      `AiModelFactory: Unexpected null provider returned from factory for provider ${provider}; models will not be available.`
    )
  );
  return undefined;
};

type OptionsFactoryProps = Omit<ModelServerConfig, 'model'> & {
  apiKey?: string;
};

/**
 * Factory function used to create all of our custom providers.  Supports model aliases
 * and flagsmith-based configuration management.
 * @param param0 Provider factory options.
 * @param param0.provider The provider that this factory will create.
 * @param param0.providerFactory The factory function to create the provider.
 * @param param0.optionsFactory The factory function to create the provider options.
 * @param param0.baselineFactory The factory function to create the provider baseline.
 * @param param0.apiKey The API key to use for the provider.
 * @returns An initialized model provider ready to be used by the registry, or undefined
 * if the provider is not enabled.
 */
const customProviderFactory = async <
  P extends AiProviderType,
  TOptions extends object,
  TProvider extends ProviderV2 & {
    chat: (model: string) => LanguageModelV2;
    completions?: (model: string) => LanguageModelV2;
  }
>({
  provider,
  providerFactory,
  optionsFactory: optionsFactoryFromProps,
  baselineFactory: baselineFactoryFromProps,
  apiKey,
}: {
  apiKey: string;
  provider: P;
  providerFactory: (options?: TOptions) => TProvider;
  baselineFactory?: (model: string | undefined) => Partial<ModelServerConfig>;
  optionsFactory?: (config: OptionsFactoryProps) => TOptions;
}) => {
  const optionsFactory =
    optionsFactoryFromProps ??
    ((cfg: OptionsFactoryProps) => ({
      baseURL: cfg.base,
      apiKey: cfg.apiKey ?? apiKey,
    }));
  const baselineFactory = baselineFactoryFromProps ?? (() => ({}));

  const modelFactory = <T extends string | undefined>(
    config: ModelProviderFactoryConfig,
    model: T
  ): ModelFromDeploymentId<T> => {
    const merged = {
      ...(apiKey ? { apiKey } : {}),
      ...(baselineFactory(model) ?? {}),
      ...(config['default'] ?? {}),
      ...(model === undefined ? config.fallback ?? {} : {}),
      ...(model && model !== 'embedding' ? config.named?.[model] ?? {} : {}),
      ...(model === 'embedding' ? config.embedding ?? {} : {}),
    };
    const builder = providerFactory(optionsFactory(merged) as TOptions);
    if (model === undefined) {
      return builder as ProviderV2 as ModelFromDeploymentId<T>;
    }
    if (model === 'embedding') {
      return builder.textEmbeddingModel(
        merged.model!
      ) as ModelFromDeploymentId<T>;
    }
    const ret =
      model === 'completions' && builder.completions
        ? builder.completions(merged.model!)
        : builder.chat(merged.model!);
    return ret as ModelFromDeploymentId<T>;
  };
  return getGuardedProvider(provider, async (cfg) => {
    const wrappedModels = [
      'hifi',
      'lofi',
      'completions',
      'gemini-2.0-flash',
      'gemini-pro',
    ];
    const languageModelEntries = await Promise.all(
      Object.keys(cfg.named ?? {}).map(async (key) => {
        const model = modelFactory(cfg, key);
        const value = wrappedModels.includes(key)
          ? await setupMiddleware(provider, model)
          : model;
        return [key, value] as [string, LanguageModelV2];
      })
    );
    const languageModels: Record<string, LanguageModelV2> =
      Object.fromEntries(languageModelEntries);
    return customProvider({
      languageModels,
      textEmbeddingModels: {
        embedding: modelFactory(cfg, 'embedding'),
      },
      fallbackProvider: modelFactory(cfg, undefined),
    });
  });
};

/**
 * Global singleton containing the Azure custom provider used by the application
 * provider registry.  This supports model creation by alias with model aliases matching
 * the ones used by OpenAI and Google (hifi, lofi, embedding, etc).
 */
const getAzureProvider = async () => {
  return customProviderFactory({
    provider: 'azure',
    providerFactory: createAzure,
    apiKey: env('AZURE_API_KEY'),
    baselineFactory: (model: string | undefined) =>
      model === 'embedding'
        ? {
            model,
            // base: env('AZURE_OPENAI_ENDPOINT_EMBEDDING'),
            apiKey: env('AZURE_OPENAI_KEY_EMBEDDING'),
          }
        : {
            model,
            apiKey: env('AZURE_API_KEY'),
            // base: env('AZURE_OPENAI_ENDPOINT'),
          },
    optionsFactory: (merged: OptionsFactoryProps) => ({
      baseURL: merged.base,
      apiKey: merged.apiKey,
      ...(merged.deployBased
        ? {
            ...(merged.version ? { apiVersion: merged.version } : {}),
            useDeploymentBasedUrls: true,
          }
        : {
            useDeploymentBasedUrls: false,
          }),
    }),
  });
};

/**
 * Global singleton containing the Google custom provider used by the application
 * provider registry.  This supports model creation by alias with model aliases matching
 * the ones used by Azure and OpenAI (hifi, lofi, embedding, etc).
 */
const getGoogleProvider = async () => {
  return customProviderFactory({
    provider: 'google',
    providerFactory: createGoogleGenerativeAI,
    apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY')!,
  });
};

/**
 * Global singleton containing the OpenAI custom provider used by the application
 * provider registry.  This supports model creation by alias with model aliases matching
 * the ones used by Azure and Google (hifi, lofi, embedding, etc).
 */
const getOpenAIProvider = async () => {
  return customProviderFactory({
    provider: 'openai',
    providerFactory: createOpenAI,
    apiKey: env('OPENAI_API_KEY')!,
  });
};

/**
 * Global singleton containg the primary Provider Registry used by the application.  Current
 * configuration is with Azure as default, Google and OpenAI as fallbacks.  This registry is
 * used by the {@link aiModelFactory} to create models by alias with Azure as primary, falling
 * back to Google and OpenAI.
 */
export const getProviderRegistry = async () => {
  const GLOBAL_PROVIDER_REGISTRY = Symbol.for(
    '@noeducation/aiModelFactory:providerRegistry'
  );
  return globalRequiredSingleton(GLOBAL_PROVIDER_REGISTRY, async () => {
    const eventHandlers = new Map<
      AiProviderType,
      [AutoRefreshFeatureFlag<KnownFeatureType>, () => void]
    >();
    // Setup handlers for provider config events so we properly refresh the registry
    await Promise.all(
      SupportedProviders.map(async (provider) => {
        const flag = await getModelFlag(provider);
        const setupChangeEvent = (f: unknown) => {
          const cleanup = () => {
            log((l) =>
              l.info(`Provider ${provider} changed, refreshing global registry`)
            );
            // First, unsubscribe from all flag events - this will prevent memory leaks
            // and ensure we don't continue to emit events to this provider when the new
            // one is available.
            Promise.allSettled(
              Array.from(eventHandlers.values()).map(
                async ([relatedFlag, relatedHandler]) => {
                  relatedFlag.removeOnChangedListener(relatedHandler);
                  relatedFlag.removeOnDisposedListener(relatedHandler);
                  eventHandlers.delete(provider);
                  // As long as we have the flag do a quick pull on it's value - this will
                  // ensure all config settings have been updated when the registry is
                  // re-created (we hope...otherwise we're converting this whole thing to async)
                  if (!Object.is(f, flag) && relatedFlag.isStale) {
                    // I know it looks wierd just pulling the value, but this will trigger
                    // a reload if it's needed and ensure the flag is up to date when we
                    // pull the value again in a few seconds.
                    return relatedFlag
                      .forceRefresh()
                      .then(() => !relatedFlag.isStale);
                  }
                  return Promise.resolve(!relatedFlag.isStale);
                }
              )
            )
              .then((promises) => {
                return promises.reduce((acc, v) => {
                  if (v.status === 'rejected') {
                    log((l) =>
                      l.warn(`Failed to refresh provider: ${v.reason}`)
                    );
                  }
                  return acc && v.status === 'fulfilled';
                }, true);
              })
              .catch((err) => {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                  source: 'GetProviderRegistry::Provider OnRefresh',
                  log: true,
                  throw: true,
                });
                return Promise.resolve(false);
              })
              .finally(() => {
                // Deleting the singleton instance will force a re-creation of the registry
                // the next time it is requested.
                SingletonProvider.Instance.delete(GLOBAL_PROVIDER_REGISTRY);
              });
          };
          if (isAutoRefreshFeatureFlag(f)) {
            // Add the event handler and flag to a map so we can remove all of them
            // when refreshing the registry.
            eventHandlers.set(provider, [f, cleanup]);
            // And subscribe to changed and disposed events so we can clean up
            // the registry when the flag is disposed or changed.
            f.addOnDisposedListener(cleanup);
            f.addOnChangedListener(cleanup);
          } else {
            log((l) => l.warn(`Cleanup called on non-provider ${String(f)}`));
          }
        };
        // Note we really should never be getting a promise here, but somehow we do
        // on occasion.  At some point we'll need to track down that bug, bug for now
        // a little defensive programming will get us running and give us flexibility
        // to handle interface changes in the future.
        if (isPromise(flag)) {
          await flag.then(setupChangeEvent);
        } else {
          setupChangeEvent(flag);
        }
      })
    );
    const providers: Record<string, ProviderV2> = {};
    const azure = await getAzureProvider();
    if (azure) {
      providers.azure = azure;
    }
    const google = await getGoogleProvider();
    if (google) {
      providers.google = google;
    }
    const openai = await getOpenAIProvider();
    if (openai) {
      providers.openai = openai;
    }
    const providerRegistry = createProviderRegistry(providers, {
      languageModelMiddleware:
        MiddlewareStateManager.Instance.getMiddlewareInstance(),
    });
    log((l) => l.info(`=== A new provider registry has been created ===`));
    return providerRegistry;
  });
};

/**
 * Overloads for the AI model provider factory function.
 *
 * @remarks
 * This interface defines the various call signatures for obtaining different types of AI model providers.
 *
 * @overload
 * Returns the default Azure provider when called with no arguments.
 *
 * @overload
 * Returns an embedding model when called with a deployment ID of `'embedding'` or `'google-embedding'` and optional embedding options.
 * @param deploymentId - The deployment identifier for the embedding model.
 * @param options - Optional configuration for the embedding model.
 * @returns An instance of `EmbeddingModelV2<string>`.
 *
 * @overload
 * Returns a language model when called with any other deployment ID and optional chat options.
 * @param deploymentId - The deployment identifier for the language model, excluding embedding types.
 * @param options - Optional configuration for the language model.
 * @returns An instance of `LanguageModel`.
 */
interface GetAiModelProviderOverloads {
  (): Promise<ReturnType<typeof getAzureProvider>>;
  (deploymentId: 'embedding' | 'google-embedding'): Promise<
    EmbeddingModelV2<string>
  >;
  (
    deploymentId: Exclude<AiModelType, 'embedding' | 'google-embedding'>
  ): Promise<LanguageModelV2>;
  (deploymentId: AiModelType): Promise<
    LanguageModelV2 | EmbeddingModelV2<string>
  >;
}

/**
 * Main factory function that provides backward compatibility with existing usage
 * while using the new provider registry internally with availability control.  See
 * {@link GetAiModelProviderOverloads} for the different overloads available.
 */
export const aiModelFactory: GetAiModelProviderOverloads = async (
  modelType?: AiModelType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  if (typeof modelType === 'undefined') {
    return getAzureProvider();
  }

  const azureModelKey = normalizeModelKeyForProvider('azure', modelType);
  const googleModelKey = normalizeModelKeyForProvider('google', modelType);
  const openaiModelKey = normalizeModelKeyForProvider('openai', modelType);

  if (isAiLanguageModelType(modelType)) {
    switch (modelType) {
      case 'completions':
      case 'lofi':
      case 'hifi':
      case caseProviderMatch('azure:', modelType): {
        // Matches any string starting with 'azure:'
        // Check availability and try Azure first if available, fallback to Google
        if (getAvailability().isModelAvailable(azureModelKey)) {
          try {
            return (await getProviderRegistry()).languageModel(azureModelKey);
          } catch (error) {
            // If Azure fails, temporarily disable it and try Google
            getAvailability().temporarilyDisableModel(azureModelKey, 60000); // 1 minute
            log((l) =>
              l.warn(
                `Azure model ${modelType} failed, temporarily disabled:`,
                error
              )
            );
          }
        }
        if (getAvailability().isModelAvailable(googleModelKey)) {
          return (await getProviderRegistry()).languageModel(googleModelKey);
        }
        throw new Error(`No available providers for model type: ${modelType}`);
      }

      case 'gemini-pro':
      case 'gemini-flash':
      case caseProviderMatch('google:', modelType): {
        // Matches any string starting with 'google:'
        // Google-specific models
        if (!getAvailability().isModelAvailable(googleModelKey)) {
          throw new Error(`Google model ${modelType} is currently disabled`);
        }
        return (await getProviderRegistry()).languageModel(googleModelKey);
      }

      case caseProviderMatch('openai:', modelType): {
        // Matches any string starting with 'openai:'
        // OpenAI-specific models
        if (!getAvailability().isModelAvailable(openaiModelKey)) {
          throw new Error(`OpenAI model ${modelType} is currently disabled`);
        }
        return (await getProviderRegistry()).languageModel(openaiModelKey);
      }

      default:
        if (getAvailability().isModelAvailable(modelType)) {
          const chat = (await getProviderRegistry()).languageModel(modelType);
          if (chat == null) {
            throw new Error('Invalid AiModelType provided: ' + modelType);
          }
          return chat;
        }
    }
  }
  switch (modelType) {
    case 'embedding':
    case caseProviderMatch('azure:', modelType): // Matches any string starting with 'azure
      const embed = (await getProviderRegistry()).textEmbeddingModel(
        azureModelKey
      );
      if (embed != null) {
        return embed;
      }
      break;
    case 'google-embedding':
    case caseProviderMatch('google:', modelType): // Matches any string starting with 'google:'
      const googleEmbed = (await getProviderRegistry()).textEmbeddingModel(
        googleModelKey
      );
      if (googleEmbed != null) {
        return googleEmbed;
      }
      break; // Continue to handle embedding models below
    case caseProviderMatch('openai:', modelType): // Matches any string starting with 'openai:'
      const openaiEmbed = (await getProviderRegistry()).textEmbeddingModel(
        openaiModelKey
      );
      if (openaiEmbed != null) {
        return openaiEmbed;
      }
      break;
    default:
      break;
  }
  // If we make it all the way here we were given a bad model string
  throw new TypeError(
    `Invalid AiModelType provided (${modelType}).  Expected one of the aliased names: $'hifi', 'lofi', \
      'completions']} or a provider-prefixed model name like 'azure:chatgtp-4o-minni', 'google:gemini-flash-2.0', or 'openai:gpt-4'.`,
    {
      cause: modelType,
    }
  );
};

/**
 * Convenience function to create Azure embedding model
 */
export const createEmbeddingModel = async (): Promise<
  EmbeddingModelV2<string>
> => aiModelFactory(AiModelTypeValue_Embedding);

/**
 * Convenience function to create Google embedding model
 */
export const createGoogleEmbeddingModel = async (): Promise<
  EmbeddingModelV2<string>
> => aiModelFactory(AiModelTypeValue_GoogleEmbedding);
