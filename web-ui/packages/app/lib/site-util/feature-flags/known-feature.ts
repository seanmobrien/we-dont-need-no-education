import { isKeyOf } from '@compliance-theater/lib-typescript';

export const BooleanFeatureFlagValues = [
  'mem0_mcp_tools_enabled',
  'models_fetch_dedup_writerequests',
  'models_azure',
  'models_openai',
  'models_google',
  'mcp_cache_tools',
  'mcp_cache_client',
  'mcp_protocol_http_stream',
] as const;
export const NumberFeatureFlagValues = [
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
export const StringFeatureFlagValues = [
  'mcp_trace_level',
  'models_fetch_trace_level',
  'todo_storage_strategy',
] as const;
export const ObjectFeatureFlagValues = [
  'models_fetch_enhanced',
  'models_fetch_stream_buffer',
  'models_defaults',
  'todo_storage_in_memory_config',
  'todo_storage_redis_config',
  'models_config_azure',
  'models_config_openai',
  'models_config_google',
  'health_checks',
] as const;

export type NumberFeatureFlagType = (typeof NumberFeatureFlagValues)[number];
export type BooleanFeatureFlagType = (typeof BooleanFeatureFlagValues)[number];
export type StringFeatureFlagType = (typeof StringFeatureFlagValues)[number];
export type ObjectFeatureFlagType = (typeof ObjectFeatureFlagValues)[number];

export const KnownFeatureValues = [
  ...BooleanFeatureFlagValues,
  ...NumberFeatureFlagValues,
  ...StringFeatureFlagValues,
  ...ObjectFeatureFlagValues,
] as const;

export type KnownFeatureType = (typeof KnownFeatureValues)[number];

export const KnownFeatureKeyMap: Readonly<
  Record<KnownFeatureType, KnownFeatureType>
> = KnownFeatureValues.reduce(
  (acc, value) => ({ ...acc, [value]: value }) as const,
  {} as Readonly<Record<KnownFeatureType, KnownFeatureType>>,
);

export const isKnownFeatureBooleanType = (
  check: unknown,
): check is BooleanFeatureFlagType => isKeyOf(check, BooleanFeatureFlagValues);

export const isKnownFeatureObjectType = (
  check: unknown,
): check is ObjectFeatureFlagType => isKeyOf(check, ObjectFeatureFlagValues);

export const isKnownFeatureType = (check: unknown): check is KnownFeatureType =>
  isKeyOf(check, KnownFeatureValues);
