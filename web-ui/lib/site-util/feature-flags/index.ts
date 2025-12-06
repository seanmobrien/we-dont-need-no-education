import { useFeatureFlagsContext } from './context';

import { KnownFeatureKeyMap } from './known-feature';
import { AllFeatureFlagsDefault } from './known-feature-defaults';
import type { KnownFeatureType, KnownFeatureValueType } from './types';
export { KnownFeatureKeyMap as KnownFeature, AllFeatureFlagsDefault };
export type { KnownFeatureType, KnownFeatureValueType };
export { type FeatureFlagsApi } from './context';

export const useFeatureFlag = (
  flagKey: KnownFeatureType,
  defaultValue: boolean | string | number = false,
) => {
  const ctx = useFeatureFlagsContext();
  const flag = ctx.getFlag(flagKey, defaultValue);
  return flag;
};

export const useFeatureFlags = () => {
  const ctx = useFeatureFlagsContext();
  const isEnabled = (key: string) => ctx.isEnabled(key);
  return {
    getFlag: <T extends KnownFeatureType>(
      key: T,
      defaultValue: KnownFeatureValueType<T>,
    ) => {
      return ctx.getFlag(key, defaultValue);
    },
    getFlags: (
      keys: KnownFeatureType[],
      defaults?: KnownFeatureValueType<KnownFeatureType>[],
    ) => ctx.getFlags(keys, defaults),
    getAllFlags: () => ctx.getAllFlags(),
    isEnabled,
    getFlagState: (key: KnownFeatureType) => ctx.getFlagState(key),
  };
};

export const useFlag = (
  key: KnownFeatureType,
  defaultValue: boolean | string | number = false,
) => {
  const { getFlag } = useFeatureFlags();
  return getFlag(key, defaultValue);
};

export const useFlagState = <TKey extends KnownFeatureType>(key: TKey) => {
  const ctx = useFeatureFlagsContext();
  return ctx.getFlagState<TKey>(key);
};
