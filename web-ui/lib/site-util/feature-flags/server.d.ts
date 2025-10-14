import type { IFlagsmith } from 'flagsmith';
import {
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';

declare module '@/lib/site-util/feature-flags/server' {
  export const flagsmithServer: () => Promise<IFlagsmith<string, string>>;

  export const getFeatureFlag: <T extends KnownFeatureType>(
    flagKey: T,
    userId?: string,
    defaultValue?: (typeof AllFeatureFlagsDefault)[T],
  ) => Promise<(typeof AllFeatureFlagsDefault)[T]>;

  export const getAllFeatureFlags: (
    userId?: string,
  ) => Promise<Record<KnownFeatureType, FeatureFlagStatus>>;
}
