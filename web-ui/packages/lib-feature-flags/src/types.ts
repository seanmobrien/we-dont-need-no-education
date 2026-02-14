import type { AiProvider, ModelType } from '@/components/ai/chat-panel/types';
import type { StorageStrategyConfig } from '@/lib/ai/tools/todo/storage/types';
import type { PickField } from '@compliance-theater/typescript';
import type {
  BooleanFeatureFlagType,
  KnownFeatureType,
  NumberFeatureFlagType,
  StringFeatureFlagType,
} from './known-feature';
import type { Flagsmith } from 'flagsmith-nodejs';

export type MinimalNodeFlagsmith = Pick<
  Flagsmith,
  'getIdentityFlags' | 'close'
>;

export type GetFeatureFlagOptions = {
  flagsmith?: () => MinimalNodeFlagsmith;
  userId?: string | 'server';
};

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
  };
  retry: {
    exp: number;
    cap: number;
  };
  staleTime: number;
};
type FlagsmithFeatureObjectValue<T> = {
  readonly enabled: boolean;
  readonly value?: Readonly<T>;
};

/**
 * Timeout configuration for the enhanced fetch implementation.
 *
 * @property {number} [lookup] - DNS lookup timeout.
 * @property {number} [connect] - Connection timeout.
 * @property {number} [secureConnect] - SSL handshake timeout.
 * @property {number} [socket] - Socket timeout; resets when data is transferred.
 * @property {number} [send] - Send timeout: from connect until all data is written to the stream.
 * @property {number} [response] - Response timeout: from send until headers are received.
 * @property {number} [request] - Request timeout: from request initiation to response end (global timeout).
 */
type EnhancedFetchConfigTimeout = {
  lookup?: number;
  connect?: number;
  secureConnect?: number;
  socket?: number;
  send?: number;
  response?: number;
  request?: number;
};

export type EnhancedFetchConfig = {
  timeout: EnhancedFetchConfigTimeout;
};

export type FeatureFlagObjectValue =
  | FlagsmithFeatureObjectValue<string | number | boolean>
  | FlagsmithFeatureObjectValue<StreamConfig>
  | FlagsmithFeatureObjectValue<HealthCheckConfig>
  | FlagsmithFeatureObjectValue<StorageStrategyConfig>
  | FlagsmithFeatureObjectValue<ModelProviderFactoryConfig>
  | FlagsmithFeatureObjectValue<ModelConfig>
  | FlagsmithFeatureObjectValue<EnhancedFetchConfig>;

export type FeatureFlagStatus =
  | boolean
  | number
  | string
  | FeatureFlagObjectValue;

export type AllFeatureFlagStatus = Record<KnownFeatureType, FeatureFlagStatus>;

type FeatureFlagTypeObjectValueMap = {
  models_fetch_stream_buffer: StreamConfig;
  models_fetch_enhanced: EnhancedFetchConfig;
  models_defaults: ModelConfig;
  todo_storage_in_memory_config: StorageStrategyConfig;
  todo_storage_redis_config: StorageStrategyConfig;
  models_config_azure: ModelProviderFactoryConfig;
  models_config_openai: ModelProviderFactoryConfig;
  models_config_google: ModelProviderFactoryConfig;
  health_checks: HealthCheckConfig;
};

export type KnownFeatureValueTypeMap = {
  [K in BooleanFeatureFlagType]: boolean;
} & {
  [K in NumberFeatureFlagType]: number;
} & {
  [K in StringFeatureFlagType]: string;
} & FeatureFlagTypeObjectValueMap;

export type KnownFeatureValueType<TFeature extends KnownFeatureType> = 
  PickField<KnownFeatureValueTypeMap, TFeature>;

export type AllFeatureFlagType = KnownFeatureValueTypeMap;
export type FeatureFlagValueType<K extends KnownFeatureType> =
  K extends keyof AllFeatureFlagType ? PickField<AllFeatureFlagType, K> : never;
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

export type AutoRefreshFeatureFlagBase = {
  get lastError(): Error | null;
  get expiresAt(): number;
  get ttlRemaining(): number;
  get isStale(): boolean;
  get isEnabled(): boolean;
  get userId(): string;
  get isDisposed(): boolean;
  get isInitialized(): boolean;

  addOnChangedListener(listener: () => void): void;
  removeOnChangedListener(listener: () => void): void;
  addOnDisposedListener(listener: () => void): void;
  removeOnDisposedListener(listener: () => void): void;
  [Symbol.dispose]: () => void;
};

export type AutoRefreshFeatureFlag<T extends KnownFeatureType> = AutoRefreshFeatureFlagBase & {
  get value(): KnownFeatureValueType<T>;
  forceRefresh(): Promise<KnownFeatureValueType<T>>;
};

export type AutoRefreshFeatureFlagOptions<T extends KnownFeatureType> = {
  key: T;
  userId?: string | 'server';
  initialValue?: KnownFeatureValueType<T>;
  ttl?: number;
  load?: boolean;
  flagsmith?: () => MinimalNodeFlagsmith;
};

export type WellKnownFlagOptions = {
  salt?: string;
  userId?: string | 'server';
  flagsmith?: () => MinimalNodeFlagsmith;
  load?: boolean;
  ttl?: number;
};

export type WellKnownFlagBrand =
  `@no-education/features-flags/auto-refresh/${KnownFeatureType}::${string}`;
