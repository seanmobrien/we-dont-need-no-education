import { AiProvider, ModelType } from '@/components/ai/chat-panel/types';
import type { StorageStrategyConfig } from '@/lib/ai/tools/todo/storage';

const BooleanFeatureFlagValues = [
  'mem0_mcp_tools_enabled',
  'models_fetch_enhanced',
  'models_azure',
  'models_openai',
  'models_google',
  'mcp_cache_tools',
  'mcp_cache_client',
  'mcp_protocol_http_stream',
] as const;
const NumberFeatureFlagValues = [
  'models_fetch_cache_ttl',
  'models_fetch_concurrency',
  'models_fetch_stream_max_chunks',
  'models_fetch_stream_max_total_bytes',
  'health_database_cache_ttl',
  'health_memory_cache_ttl',
  'health_memory_cache_error_ttl',
  'health_memory_cache_warning_ttl',
  'health_startup_failure_threshold',
  'mcp_max_duration',
] as const;
const StringFeatureFlagValues = [
  'mcp_trace_level',
  'models_fetch_trace_level',
  'todo_storage_strategy',
] as const;
const ObjectFeatureFlagValues = [
  'models_fetch_stream_buffer',
  'models_defaults',
  'todo_storage_in_memory_config',
  'todo_storage_redis_config',
] as const;

type NumberFeatureFlagType = (typeof NumberFeatureFlagValues)[number];
type BooleanFeatureFlagType = (typeof BooleanFeatureFlagValues)[number];
type StringFeatureFlagType = (typeof StringFeatureFlagValues)[number];
type ObjectFeatureFlagType = (typeof ObjectFeatureFlagValues)[number];

export const KnownFeatureValues = [
  ...BooleanFeatureFlagValues,
  ...NumberFeatureFlagValues,
  ...StringFeatureFlagValues,
  ...ObjectFeatureFlagValues,
] as const;

export type KnownFeatureType = (typeof KnownFeatureValues)[number];

export const isKnownFeatureType = (check: unknown): check is KnownFeatureType =>
  !!check &&
  KnownFeatureValues.some(
    (value) => String(value) === String(check).toLocaleLowerCase(),
  );
export const KnownFeature: Record<KnownFeatureType, KnownFeatureType> =
  KnownFeatureValues.reduce(
    (acc, value) => ({ ...acc, [value]: value }),
    {} as Record<KnownFeatureType, KnownFeatureType>,
  );

export type FeatureFlagStatus =
  | boolean
  | number
  | string
  | {
      enabled: boolean;
      value?: string | number | object | boolean;
    }
  | {
      enabled: boolean;
      value?: {
        max: number;
        detect: number;
      };
    };
export type AllFeatureFlagStatus = Record<KnownFeatureType, FeatureFlagStatus>;

const DEFAULT_IN_MEMORY_STORAGE_CONFIG =
  {} as const satisfies StorageStrategyConfig;

const DEFAULT_REDIS_STORAGE_CONFIG = {
  ttl: 86400,
  keyPrefix: 'todo',
  enableFallback: true,
} as const satisfies StorageStrategyConfig;

type KnownFeatureValueType<TFeature extends KnownFeatureType> =
  TFeature extends BooleanFeatureFlagType
    ? boolean
    : TFeature extends NumberFeatureFlagType
      ? number
      : TFeature extends StringFeatureFlagType
        ? string
        : TFeature extends ObjectFeatureFlagType
          ? object
          : never;
type AllFeatureFlagValueTypes = {
  [K in KnownFeatureType]: KnownFeatureValueType<K>;
};

export const AllFeatureFlagsDefault = {
  mem0_mcp_tools_enabled: true as boolean,
  models_fetch_cache_ttl: 300 as number,
  models_fetch_concurrency: 8 as number,
  models_fetch_enhanced: true as boolean,
  models_fetch_stream_buffer: {
    enabled: true as boolean,
    value: {
      max: (64 * 1024) as number,
      detect: (4 * 1024) as number,
    },
  },
  models_fetch_stream_max_total_bytes: (10 * 1024 * 1024) as number,
  models_fetch_stream_max_chunks: 1024 as number,
  models_fetch_trace_level: 'warn' as string,
  models_azure: true as boolean,
  models_openai: false as boolean,
  models_google: true as boolean,
  models_defaults: {
    enabled: true as boolean,
    value: {
      provider: 'azure' as AiProvider,
      chat_model: 'lofi' as ModelType,
      tool_model: 'lofi' as ModelType,
    },
  },
  mcp_cache_tools: false as boolean,
  mcp_cache_client: true as boolean,
  mcp_max_duration: (1000 * 60 * 15) as number,
  mcp_protocol_http_stream: false as boolean,
  mcp_trace_level: 'warn' as string,
  health_database_cache_ttl: 120 as number,
  health_memory_cache_ttl: 60 as number,
  health_memory_cache_error_ttl: 10 as number,
  health_memory_cache_warning_ttl: 30 as number,
  health_startup_failure_threshold: 10 as number,
  todo_storage_strategy: 'in-memory' as string,
  todo_storage_in_memory_config: {
    enabled: true,
    value: DEFAULT_IN_MEMORY_STORAGE_CONFIG,
  },
  todo_storage_redis_config: {
    enabled: true,
    value: DEFAULT_REDIS_STORAGE_CONFIG,
  },
} as const satisfies AllFeatureFlagValueTypes;

export type AllFeatureFlagDefaultType = typeof AllFeatureFlagsDefault;

export type FeatureFlagValueType<K extends KnownFeatureType> =
  K extends keyof AllFeatureFlagDefaultType
    ? Pick<AllFeatureFlagDefaultType, K>[K]
    : never;

/**
 * Native flag value types supported by Flagsmith.
 */
type NativeFlagValue = string | number | boolean | undefined;
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
  isDefault: boolean;
};
