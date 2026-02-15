/**
 * Late-bound initialization for AI provider configuration.
 * This export is discovered and called by AppStartup during initialization.
 */
export const initAppStartup = async (): Promise<void> => {
  // Dynamically load the util module to avoid circular dependencies
  const { getModelFlag, AutoRefreshProviderFlagKeyMap } = await import('./util');
  const { wellKnownFlag } = await import('@/lib/site-util/feature-flags/feature-flag-with-refresh');
  const { LoggedError } = await import('@compliance-theater/logger');
  
  type KnownFeatureType = 
    | 'mcp_cache_client'
    | 'mcp_cache_tools'
    | 'mcp_protocol_http_stream'
    | 'mem0_mcp_tools_enabled'
    | 'models_config_azure'
    | 'models_config_google'
    | 'models_config_openai';

  const rawMcpFlags: Array<KnownFeatureType> = [
    'mcp_cache_client',
    'mcp_cache_tools',
    'mcp_protocol_http_stream',
    'mem0_mcp_tools_enabled',
  ];

  const refreshFlag = async <FeatureType extends KnownFeatureType>(
    key: FeatureType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flag: Promise<any | undefined>
  ) => {
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
        source: `initAppStartup::refresh ${key}`,
      });
      throw le;
    }
  };

  const providers: Array<'azure' | 'google' | 'openai'> = ['azure', 'google', 'openai'];
  const allFlags = [
    ...rawMcpFlags.map((key) =>
      refreshFlag(key, wellKnownFlag(key, { load: true }))
    ),
    ...providers.map((provider) =>
      refreshFlag(
        AutoRefreshProviderFlagKeyMap[provider] as KnownFeatureType,
        getModelFlag(provider)
      )
    ),
  ];

  await Promise.all(allFlags);
};
