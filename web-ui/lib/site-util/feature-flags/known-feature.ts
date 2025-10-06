export const KnownFeatureValues = [
  'models_azure',
  'models_openai',
  'models_google',
  'models_defaults',
  'mcp_cache_tools',
  'mcp_cache_client',
] as const;
export type KnownFeatureType = (typeof KnownFeatureValues)[number];
export const KnownFeature: Record<KnownFeatureType, KnownFeatureType> =
  KnownFeatureValues.reduce(
    (acc, value) => ({ ...acc, [value]: value }),
    {} as Record<KnownFeatureType, KnownFeatureType>,
  );

export type FeatureFlagStatus =
  | boolean
  | {
      enabled: boolean;
      value?: string | number | object | boolean;
    };
export type AllFeatureFlagStatus = Record<KnownFeatureType, FeatureFlagStatus>;

export const AllFeatureFlagsDefault: AllFeatureFlagStatus = {
  models_azure: true,
  models_openai: false,
  models_google: true,
  models_defaults: {
    enabled: true,
    value: {
      openai: 'lofi',
      azure: 'lofi',
      google: 'gemini-1.5-pro',
    },
  },
  mcp_cache_tools: false,
  mcp_cache_client: true,
} as const;
