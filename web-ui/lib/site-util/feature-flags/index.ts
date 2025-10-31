import { useFeatureFlagsContext } from './context';

import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
  type AllFeatureFlagStatus,
} from './known-feature';
import type { IFlagsmithTrait } from 'flagsmith/react';
import { isKeyOf } from '@/lib/typescript';

export { KnownFeature, AllFeatureFlagsDefault };
export type { KnownFeatureType, FeatureFlagStatus, AllFeatureFlagStatus };
export { type FeatureFlagsApi, defaultFlags } from './context';

export const useFeatureFlag = (
  flagKey: KnownFeatureType,
  defaultValue: boolean | string | number = false,
) => {
  const ctx = useFeatureFlagsContext();
  const wrapDefault = (v: boolean | string | number) =>
    typeof v === 'boolean'
      ? (v as FeatureFlagStatus)
      : ({ enabled: true, value: v } as FeatureFlagStatus);

  const unwrap = (
    f: FeatureFlagStatus | undefined,
    fallback: boolean | string | number,
  ) => {
    if (
      typeof f === 'boolean' ||
      typeof f === 'string' ||
      typeof f === 'number' ||
      f === undefined
    ) {
      return f ?? fallback;
    }
  };

  const raw = ctx.getFlag(flagKey, wrapDefault(defaultValue));
  return unwrap(raw, defaultValue) as boolean | string | number;
};

export function useFeatureFlags() {
  const ctx = useFeatureFlagsContext();
  return {
    getFlag: <T extends boolean | string | number>(
      key: KnownFeatureType,
      defaultValue: T,
    ) => {
      const raw = ctx.getFlag(
        key,
        typeof defaultValue === 'boolean'
          ? (defaultValue as FeatureFlagStatus)
          : ({ enabled: true, value: defaultValue } as FeatureFlagStatus),
      );
      if (
        typeof raw === 'boolean' ||
        typeof raw === 'string' ||
        typeof raw === 'number'
      ) {
        return raw as unknown as T;
      }
      if (!raw) return defaultValue;
      return (raw.value ?? defaultValue) as unknown as T;
    },
    getFlags: (keys: KnownFeatureType[], defaults?: FeatureFlagStatus[]) =>
      ctx.getFlags(keys, defaults),
    getAllFlags: () => ctx.getAllFlags(),
    isEnabled: (key: string) => ctx.isEnabled(key),
    getFlagState: (key: string) => ctx.getFlagState(key),
  };
}

export function useFlag(
  key: KnownFeatureType,
  defaultValue: boolean | string | number = false,
) {
  const { getFlag } = useFeatureFlags();
  return getFlag(key, defaultValue);
}

// Re-export server helpers (server-side Flagsmith usage)
export { getFeatureFlag, getAllFeatureFlags, flagsmithServer } from './server';

// Re-export auto-refresh feature flag
export {
  type AutoRefreshFeatureFlag,
  createAutoRefreshFeatureFlagSync,
  createAutoRefreshFeatureFlag,
} from './feature-flag-with-refresh';

export function useAIFeatureFlags(): AllFeatureFlagStatus {
  const flags = useFeatureFlags();
  return Object.entries(flags.getAllFlags()).reduce(
    (acc, [key, value]) => {
      if (isKeyOf(key, KnownFeature)) {
        acc[key] =
          typeof value === 'boolean'
            ? value
            : {
                enabled: true,
                value,
              };
      }
      return acc;
    },
    {} as Record<KnownFeatureType, IFlagsmithTrait>,
  ) as AllFeatureFlagStatus;
}
