import type {
  KnownFeature,
  AllFeatureFlagsDefault,
  KnownFeatureType,
  FeatureFlagStatus,
  AllFeatureFlagStatus,
} from './known-feature';

import type { FeatureFlagsApi, defaultFlags } from './context';

declare module '@/lib/site-util/feature-flags' {
  /**
   * @module lib/site-util/feature-flags
   *
   * Client-side feature flag helpers (hooks) plus re-exports of server
   * helpers implemented in `./server` so callers can import from a
   * single module path.
   */

  export type {
    KnownFeature,
    AllFeatureFlagsDefault,
    KnownFeatureType,
    FeatureFlagStatus,
    AllFeatureFlagStatus,
  };

  export type { FeatureFlagsApi, defaultFlags };

  /**
   * React hook to get a single feature flag value
   *
   * @param flagKey - The feature flag key to retrieve
   * @param defaultValue - Default value if flag is not found (default: false)
   * @returns The feature flag value (boolean, string, or number)
   *
   * @example
   * ```typescript
   * const isEnabled = useFeatureFlag('my-feature', false);
   * if (isEnabled) {
   *   // Feature is enabled
   * }
   * ```
   */
  export function useFeatureFlag(
    flagKey: KnownFeatureType,
    defaultValue?: boolean | string | number,
  ): boolean | string | number;

  /**
   * React hook to access the feature flags API
   *
   * Provides methods to get flags, check enablement, and access flag state.
   *
   * @returns Feature flags API object
   *
   * @example
   * ```typescript
   * const flags = useFeatureFlags();
   * const myFeature = flags.getFlag('my-feature', false);
   * const isEnabled = flags.isEnabled('my-feature');
   * ```
   */
  export function useFeatureFlags(): {
    getFlag: <T extends boolean | string | number>(
      key: KnownFeatureType,
      defaultValue: T,
    ) => T;
    getFlags: (
      keys: KnownFeatureType[],
      defaults?: FeatureFlagStatus[],
    ) => FeatureFlagStatus[];
    getAllFlags: () => Record<string, boolean | string | number>;
    isEnabled: (key: string) => boolean;
    getFlagState: (key: string) => FeatureFlagStatus | undefined;
  };

  /**
   * Simplified hook to get a single flag value (alias for useFeatureFlag)
   *
   * @param key - The feature flag key
   * @param defaultValue - Default value if flag is not found (default: false)
   * @returns The feature flag value
   */
  export function useFlag(
    key: KnownFeatureType,
    defaultValue?: boolean | string | number,
  ): boolean | string | number;

  /**
   * React hook to get all AI-related feature flags
   *
   * Returns all feature flags formatted for AI feature configuration.
   *
   * @returns All feature flags as AllFeatureFlagStatus
   */
  export function useAIFeatureFlags(): AllFeatureFlagStatus;
}
