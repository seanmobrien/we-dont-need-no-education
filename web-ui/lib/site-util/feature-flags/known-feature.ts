export const KnownFeatureValues = [
  'models_azure',
  'models_openai',
  'models_google',
  'models_defaults',
  'mcp_cache_tools',
  'mcp_cache_client',
  'models_fetch_cache_ttl',
  'models_fetch_concurrency',
  'models_fetch_enhanced',
  'models_fetch_stream_buffer',
  'models_fetch_trace_level',
  'health_database_cache_ttl',
  'health_memory_cache_ttl',
  'health_startup_failure_threshold',
] as const;
export type KnownFeatureType = (typeof KnownFeatureValues)[number];
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
      value?: string | number | object | boolean;
      max: number;
      detect: number;
    };
export type AllFeatureFlagStatus = Record<KnownFeatureType, FeatureFlagStatus>;

export const AllFeatureFlagsDefault = {
  models_fetch_cache_ttl: 300 as number,
  models_fetch_concurrency: 8 as number,
  models_fetch_enhanced: true as boolean,
  models_fetch_stream_buffer: {
    enabled: true,
    value: {
      max: (64 * 1024) as number,
      detect: (4 * 1024) as number,
    },
  },
  models_fetch_trace_level: 'warn' as string,
  models_azure: true as boolean,
  models_openai: false as boolean,
  models_google: true as boolean,
  models_defaults: {
    enabled: true as boolean,
    value: {
      openai: 'lofi' as string,
      azure: 'lofi' as string,
      google: 'gemini-1.5-pro' as string,
    },
  },
  mcp_cache_tools: false as boolean,
  mcp_cache_client: true as boolean,
  health_database_cache_ttl: 120 as number,
  health_memory_cache_ttl: 60 as number,
  health_startup_failure_threshold: 10 as number,
} as const satisfies AllFeatureFlagStatus;

export type AllFeatureFlagDefaultType = typeof AllFeatureFlagsDefault;

export type FeatureFlagValueType<K extends KnownFeatureType> =
  K extends keyof AllFeatureFlagDefaultType
    ? Pick<AllFeatureFlagDefaultType, K>[K]
    : never;
