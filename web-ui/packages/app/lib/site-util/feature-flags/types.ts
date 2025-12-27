import type { AiProvider, ModelType } from '@/components/ai/chat-panel/types';
import type { StorageStrategyConfig } from '@/lib/ai/tools/todo/storage/types';
import type { PickField } from '@compliance-theater/lib-typescript/_types';
import type {
  BooleanFeatureFlagType,
  KnownFeatureType,
  NumberFeatureFlagType,
  ObjectFeatureFlagType,
  StringFeatureFlagType,
} from './known-feature';
import type { Flagsmith } from 'flagsmith-nodejs';

export type MinimalNodeFlagsmith = Pick<Flagsmith, 'getIdentityFlags' | 'close'>;

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

export type EnhancedFetchConfig = {
  timeout: {
    /**
     * DNS lookup timeout
     */
    lookup: number | undefined;
    /**
     * Connection timeout
     */
    connect: number | undefined;
    /**
     * SSL handshake timeout
     */
    secureConnect: number | undefined;
    /**
     * Socket timeout - resets when data is transferred
     */
    socket: number | undefined;
    /**
     * Send timeout: Connect -> when all data is written to the stream
     */
    send: number | undefined;
    /**
     * Response timeout: Send -> headers received
     */
    response: number | undefined;
    /**
     * Request timeout: From request initiation to response end; global timeout
     */
    request: number | undefined;
  };
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

export type AutoRefreshFeatureFlag<T extends KnownFeatureType> = {
  get value(): KnownFeatureValueType<T>;
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
  forceRefresh(): Promise<KnownFeatureValueType<T>>;
  [Symbol.dispose]: () => void;
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
