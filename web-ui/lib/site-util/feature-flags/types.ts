import type { AiProvider, ModelType } from '@/components/ai/chat-panel/types';
import type { StorageStrategyConfig } from '@/lib/ai/tools/todo/storage/types';
import type { PickField } from '@/lib/typescript/_types';
import type {
  BooleanFeatureFlagType,
  KnownFeatureType,
  NumberFeatureFlagType,
  ObjectFeatureFlagType,
  StringFeatureFlagType,
} from './known-feature';

export type { KnownFeatureType } from './known-feature';

export type ModelConfig = {
  provider: AiProvider;
  chat_model: ModelType;
  tool_model: ModelType;
};

export type ModelProviderConfig = {
  base?: string;
  deployBased?: boolean;
  version?: string;
};
export type ModelServerConfig = ModelProviderConfig & {
  model: string;
};
export type ModelProviderFactoryConfig = {
  default: ModelProviderConfig;
  embedding: ModelServerConfig;
  fallback?: ModelProviderConfig;
  named?: Record<string, ModelServerConfig> & {
    hifi: ModelServerConfig;
    lofi: ModelServerConfig;
    completions: ModelServerConfig;
  };
};
export type StreamConfig = {
  max: number;
  detect: number;
};
export type HealthCheckConfig = {
  refresh: {
    healthy: number;
    warning: number;
    error: number;
  },
  retry: {
    exp: number;
    cap: number;
  }
  staleTime: number;
};
type FlagsmithFeatureObjectValue<T> = {
  readonly enabled: boolean;
  readonly value?: Readonly<T>;
};

export type FeatureFlagObjectValue =
  | FlagsmithFeatureObjectValue<string | number | boolean>
  | FlagsmithFeatureObjectValue<StreamConfig>
  | FlagsmithFeatureObjectValue<HealthCheckConfig>
  | FlagsmithFeatureObjectValue<StorageStrategyConfig>
  | FlagsmithFeatureObjectValue<ModelProviderFactoryConfig>
  | FlagsmithFeatureObjectValue<ModelConfig>;

export type FeatureFlagStatus =
  | boolean
  | number
  | string
  | FeatureFlagObjectValue;

export type AllFeatureFlagStatus = Record<KnownFeatureType, FeatureFlagStatus>;

type FeatureFlagTypeObjectValueMap = {
  models_fetch_stream_buffer: StreamConfig;
  models_defaults: ModelConfig;
  todo_storage_in_memory_config: StorageStrategyConfig;
  todo_storage_redis_config: StorageStrategyConfig;
  models_config_azure: ModelProviderFactoryConfig;
  models_config_openai: ModelProviderFactoryConfig;
  models_config_google: ModelProviderFactoryConfig;
  health_checks: HealthCheckConfig;
};

export type KnownFeatureValueType<TFeature extends KnownFeatureType> =
  TFeature extends BooleanFeatureFlagType
  ? boolean
  : TFeature extends NumberFeatureFlagType
  ? number
  : TFeature extends StringFeatureFlagType
  ? string
  : TFeature extends ObjectFeatureFlagType
  ? PickField<FeatureFlagTypeObjectValueMap, TFeature>
  : never;

export type AllFeatureFlagType = {
  [K in KnownFeatureType]: KnownFeatureValueType<K>;
};
export type FeatureFlagValueType<K extends KnownFeatureType> =
  K extends keyof AllFeatureFlagType ? Pick<AllFeatureFlagType, K>[K] : never;
/**
 * Native flag value types supported by Flagsmith.
 */
type NativeFlagValue = string | number | boolean | undefined | null;
/**
 * A Flagsmith feature. It has an enabled/disabled state, and an optional {@link FlagValue}.
 */
export type NativeFlag = {
  /**
   * Indicates whether this feature is enabled.
   */
  enabled: boolean;
  /**
   * An optional {@link FlagValue} for this feature.
   */
  value: NativeFlagValue;
  /**
   * If true, the state for this feature was determined by a default flag handler
   */
  isDefault?: boolean;
};
