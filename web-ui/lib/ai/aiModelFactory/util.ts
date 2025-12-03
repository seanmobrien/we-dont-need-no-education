import type {
  EmbeddingModelV2,
  LanguageModelV2,
  ProviderV2,
} from '@ai-sdk/provider';
import { isAiProviderType, type AiModelType, type AiProviderType } from '@/lib/ai/core';
import { wellKnownFlag, type AutoRefreshFeatureFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import { KnownFeatureType } from '@/lib/site-util/feature-flags';
import { LoggedError } from '@/lib/react-util/errors/logged-error/logged-error-class';
import { log } from '@/lib/logger';


export const AutoRefreshProviderFlagKeyMap = {
  azure: 'models_config_azure',
  google: 'models_config_google',
  openai: 'models_config_openai',
} as const;

export type AutoRefreshFlagKey<P extends AiProviderType> =
  (typeof AutoRefreshProviderFlagKeyMap)[P];

export const asAutoRefreshFlagKey = <P extends AiProviderType>(
  provider: P,
): AutoRefreshFlagKey<P> => AutoRefreshProviderFlagKeyMap[provider];

export const getModelFlag = <P extends AiProviderType>(
  provider: P,
): Promise<AutoRefreshFeatureFlag<AutoRefreshFlagKey<P>>> => {
  if (isAiProviderType(provider)) {
    const flagType = asAutoRefreshFlagKey(provider);
    return wellKnownFlag(flagType);
  }
  throw new TypeError(`Invalid provider for model flag: ${provider}`);
};

/**
 * Resolve a model type from a deployment identifier string.
 * If `T` is the string literal `'embedding'` the resulting type is
 * `EmbeddingModelV2<string>`, otherwise it resolves to `LanguageModelV2`.
 *
 * Useful for typing factory functions that return different model kinds
 * based on a runtime string identifier.
 */
export type ModelFromDeploymentId<T extends string | undefined> =
  T extends undefined
  ? ProviderV2 & {
    chat: (model: string) => LanguageModelV2;
  }
  : T extends 'embedding'
  ? EmbeddingModelV2<string>
  : LanguageModelV2;

/**
 * Overloaded function signature for normalizing model keys based on the provider and model type.
 *
 * @param provider - The AI service provider, either `'azure'` or `'google'`.
 * @param modelType - The type of AI model to normalize the key for.
 * @returns A normalized model key string prefixed with the provider name (e.g., `azure:modelName` or `google:modelName`).
 */
interface NormalizeModelKeyForProviderOverloads {
  (provider: 'azure', modelType: AiModelType): `azure:${string}`;
  (provider: 'google', modelType: AiModelType): `google:${string}`;
  (provider: 'openai', modelType: AiModelType): `openai:${string}`;
}

/**
 * Normalizes the model key for a given provider by ensuring it is prefixed with the provider name.
 *
 * If the `modelType` already starts with the provider prefix (e.g., "provider:model"), it is returned as-is.
 * If `modelType` contains a colon, the substring after the colon is used and prefixed with the provider.
 * Otherwise, the entire `modelType` is prefixed with the provider.
 *
 * @param provider - The name of the AI model provider.
 * @param modelType - The model type string, which may or may not be prefixed with a provider.
 * @returns The normalized model key in the format "provider:model".
 */
export const normalizeModelKeyForProvider: NormalizeModelKeyForProviderOverloads = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any,
  modelType: AiModelType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (modelType.startsWith(provider + ':')) {
    return modelType;
  }
  const idx = modelType.indexOf(':');
  if (idx > -1) {
    return `${provider}:${modelType.substring(idx + 1)}`;
  }
  return `${provider}:${modelType}`;
};

/**
 * Checks if the model type starts with the given prefix.  This is used to short-circuit
 * model case statements by matching on the provider prefix only.
 * @param prefix The prefix to check
 * @param modelType The model type to check against the prefix
 * @returns The model type if it starts with the prefix, otherwise 'not-a-match' - which, obviosly, won't match :)
 */
export const caseProviderMatch = (
  prefix: string,
  modelType: AiModelType,
): AiModelType => {
  if (modelType.startsWith(prefix)) {
    return modelType as AiModelType;
  }
  return 'not-a-match' as AiModelType;
};

/**
 * Array of providers that are supported by the AI model factory.
 * Currently, this list includes:
 * - 'azure'
 * - 'google'
 * - 'openai'
 */
export const SupportedProviders: Array<AiProviderType> = [
  'azure',
  'google',
  'openai',
] as const;

/**
 * Initializes the provider configuration for use by the AI model 
 * factory.  This function is called by {@link @/lib/site-util/app-start.ts} 
 * when it is performing application initialization.  It provides an
 * opportunity to load real configuration settings before creating any of the
 * global model-related singleton factories. 
 */
export const initializeProviderConfig = async (): Promise<void> => {
  const rawMcpFlags: Array<KnownFeatureType> = [
    'mcp_cache_client',
    'mcp_cache_tools',
    'mcp_protocol_http_stream',
    'mem0_mcp_tools_enabled'
  ];

  const refreshFlag = async <FeatureType extends KnownFeatureType>(key: FeatureType | AiProviderType, flag: Promise<AutoRefreshFeatureFlag<FeatureType> | undefined>) => {
    try {
      const f = await flag;
      if (!f || f.isInitialized) {
        return f;
      }
      await f.forceRefresh();
      return f;
    } catch (e) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(e, {
        log: true,
        source: `initializeAiModelConfig:[${key}]`
      });
      log((l) => l.warn(`=== ${le.source}: Failed to load critical feature flag: model resolution may be impacted ===\n\tDetails: ${le.message}`));
      return flag;
    }
  };

  const flags = await Promise.all([
    // Each supported provider has it's own feature flag
    // that controls it's availability, model selection,
    // and provider configuration.
    ...SupportedProviders.map(p => refreshFlag(p, getModelFlag(p))),
    // In addition to the model configuration flags, there
    // are a handful of MCP-related flags that need to be 
    // resolved and available for optimal functionality.
    ...rawMcpFlags.map(f => refreshFlag(f, wellKnownFlag(f))),
  ]);
  log(l => l.verbose(`---=== AI Model Subsystem successfully initialized; ${flags.length} settings were loaded.`));
}; 
