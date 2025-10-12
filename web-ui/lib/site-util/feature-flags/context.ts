import { createContext, useContext } from 'react';
import {
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';

/**
 * Lightweight feature flags API and provider.
 * This module is intentionally independent of Flagsmith's React bindings
 * so it can be used in server-rendered pages and hydrated on the client.
 */
export type FeatureFlagsApi = {
  getFlag: (
    key: KnownFeatureType,
    defaultValue?: FeatureFlagStatus,
  ) => FeatureFlagStatus;
  getFlags: (
    keys: KnownFeatureType[],
    defaults?: FeatureFlagStatus[],
  ) => FeatureFlagStatus[];
  getAllFlags: () => Partial<Record<KnownFeatureType, FeatureFlagStatus>>;
  isEnabled: (key: KnownFeatureType | string) => boolean;
  getFlagState: (key: KnownFeatureType | string) => {
    value: FeatureFlagStatus | undefined;
    isLoading: boolean;
    error: null;
  };
  readonly isLoaded: boolean;
  readonly error?: Error | null;
  readonly isFetching: boolean;
  readonly isDefault?: true;
};

export const defaultFlags = AllFeatureFlagsDefault as unknown as Record<
  KnownFeatureType,
  FeatureFlagStatus
>;

export const FeatureFlagsContext = createContext<FeatureFlagsApi | undefined>(
  undefined,
);

export function useFeatureFlagsContext(): FeatureFlagsApi {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    return {
      getFlag: (key, defaultValue) => defaultFlags[key] ?? defaultValue,
      getFlags: (keys, defaults) =>
        keys.map((k, i) => defaultFlags[k] ?? defaults?.[i]),
      getAllFlags: () => ({ ...defaultFlags }),
      isEnabled: (key) =>
        Boolean(defaultFlags[key as KnownFeatureType] ?? false),
      getFlagState: (key) => ({
        value: defaultFlags[key as KnownFeatureType],
        isLoading: false,
        error: null,
      }),
      isLoaded: false,
      isFetching: true,
      isDefault: true,
    } as FeatureFlagsApi;
  }
  return ctx;
}

export default FeatureFlagsContext;
