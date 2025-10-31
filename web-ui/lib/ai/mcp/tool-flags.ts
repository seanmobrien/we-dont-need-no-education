import {
  type AutoRefreshFeatureFlag,
  createAutoRefreshFeatureFlag,
  createAutoRefreshFeatureFlagSync,
} from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import type {
  FeatureFlagValueType,
  KnownFeatureType,
} from '@/lib/site-util/feature-flags/known-feature';
import { SingletonProvider } from '@/lib/typescript/singleton-provider';

const CACHE_ENABLED_FLAG_KEY = Symbol.for(
  '@noeducation/mcp/flags/tool-cache-enabled-flag',
);
const MEM0_ENABLED_FLAG_KEY = Symbol.for(
  '@noeducation/mcp/flags/mem0-enabled-flag',
);
const STREAMING_TRANSPORT_FLAG_KEY = Symbol.for(
  '@noeducation/mcp/flags/streaming-transport-flag',
);

const getKnownFeatureFlagKey = (key: symbol): KnownFeatureType => {
  switch (key) {
    case CACHE_ENABLED_FLAG_KEY:
      return 'mcp_cache_tools';
    case MEM0_ENABLED_FLAG_KEY:
      return 'mem0_mcp_tools_enabled';
    case STREAMING_TRANSPORT_FLAG_KEY:
      return 'mcp_protocol_http_stream';
    default:
      throw new TypeError(`Unknown feature flag key: ${String(key)}`);
  }
};

const getGlobalFlag = async <T extends KnownFeatureType>(
  key: symbol,
  createFlag:
    | (() => Promise<AutoRefreshFeatureFlag<T>>)
    | FeatureFlagValueType<T>,
) => {
  const provider = SingletonProvider.Instance;
  const existing = provider.get<AutoRefreshFeatureFlag<T>, symbol>(key);
  if (existing) {
    return existing;
  }

  const flag =
    typeof createFlag === 'function'
      ? await createFlag()
      : await createAutoRefreshFeatureFlag({
          key: getKnownFeatureFlagKey(key),
          userId: 'server',
          initialValue: createFlag,
          load: true,
        });
  provider.set(key, flag);
  return flag;
};
const getGlobalFlagSync = <T extends KnownFeatureType>(
  key: symbol,
  createFlag: (() => AutoRefreshFeatureFlag<T>) | FeatureFlagValueType<T>,
) => {
  const provider = SingletonProvider.Instance;
  return provider.getOrCreate(CACHE_ENABLED_FLAG_KEY, () =>
    typeof createFlag === 'function'
      ? createFlag()
      : createAutoRefreshFeatureFlagSync({
          key: getKnownFeatureFlagKey(key),
          userId: 'server',
          initialValue: createFlag,
        }),
  );
};

export const getCacheEnabledFlag = async () =>
  await getGlobalFlag<'mcp_cache_tools'>(CACHE_ENABLED_FLAG_KEY, false);
export const getCacheEnabledFlagSync = () =>
  getGlobalFlagSync<'mcp_cache_tools'>(CACHE_ENABLED_FLAG_KEY, false);

export const getMem0EnabledFlag = async () =>
  await getGlobalFlag<'mem0_mcp_tools_enabled'>(MEM0_ENABLED_FLAG_KEY, false);
export const getMem0EnabledFlagSync = () =>
  getGlobalFlagSync<'mem0_mcp_tools_enabled'>(MEM0_ENABLED_FLAG_KEY, false);

export const getStreamingTransportFlag = async () =>
  await getGlobalFlag<'mcp_protocol_http_stream'>(
    STREAMING_TRANSPORT_FLAG_KEY,
    false,
  );
export const getStreamingTransportFlagSync = () =>
  getGlobalFlagSync<'mcp_protocol_http_stream'>(
    STREAMING_TRANSPORT_FLAG_KEY,
    false,
  );
