import { createContext, useContext } from 'react';
import type { KnownFeatureType, KnownFeatureValueType } from './types';
import { AllFeatureFlagsDefault } from './known-feature-defaults';

export type FeatureFlagsApi = {
  getFlag: (
    key: KnownFeatureType,
    defaultValue?: KnownFeatureValueType<typeof key>,
  ) => KnownFeatureValueType<typeof key>;
  getFlags: (
    keys: KnownFeatureType[],
    defaults?: KnownFeatureValueType<KnownFeatureType>[],
  ) => KnownFeatureValueType<KnownFeatureType>[];
  getAllFlags: () => Partial<
    Record<KnownFeatureType, KnownFeatureValueType<KnownFeatureType>>
  >;
  isEnabled: (key: KnownFeatureType | string) => boolean | null;
  getFlagState: <TKey extends KnownFeatureType>(key: TKey) => {
    value: KnownFeatureValueType<TKey> | undefined;
    enabled: boolean | null;
    isLoading: boolean;
    isDefault: boolean;
    error: Error | null;
  };
  readonly isLoaded: boolean;
  readonly error?: Error | null;
  readonly isFetching: boolean;
  readonly isDefault?: boolean;
};

export const defaultFlags = AllFeatureFlagsDefault;

export const FeatureFlagsContext = createContext<FeatureFlagsApi | undefined>(
  undefined,
);

export function useFeatureFlagsContext(): FeatureFlagsApi {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    const isEnabled = (key: KnownFeatureType | string) =>
      defaultFlags[key as KnownFeatureType]
        ? Boolean(defaultFlags[key as KnownFeatureType])
        : null;
    return {
      getFlag: (key, defaultValue) => defaultFlags[key] ?? defaultValue,
      getFlags: (keys, defaults) =>
        keys.map((k, i) => defaultFlags[k] ?? defaults?.[i]),
      getAllFlags: () => ({ ...defaultFlags }),
      isEnabled,
      getFlagState: <TKey extends KnownFeatureType>(key: TKey) => ({
        value: defaultFlags[key],
        enabled: isEnabled(key),
        isLoading: false,
        isDefault: true,
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
