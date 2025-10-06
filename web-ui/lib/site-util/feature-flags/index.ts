/**
 * @module lib/site-util/feature-flags
 *
 * Client-side feature flag helpers (hooks) plus re-exports of server
 * helpers implemented in `./server` so callers can import from a
 * single module path.
 */
import { useFeatureFlagsContext } from './context';

import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
  type AllFeatureFlagStatus,
} from './known-feature';
import type { IFlagsmithTrait } from 'flagsmith/react';
import { isKeyOf } from '/lib/typescript';

export { KnownFeature, AllFeatureFlagsDefault };
export type { KnownFeatureType, FeatureFlagStatus, AllFeatureFlagStatus };
export { type FeatureFlagsApi, defaultFlags } from './context';

export function useFeatureFlag(
  flagKey: KnownFeatureType,
  defaultValue: boolean | string | number = false,
) {
  const ctx = useFeatureFlagsContext();
  const wrapDefault = (v: boolean | string | number) =>
    typeof v === 'boolean'
      ? (v as FeatureFlagStatus)
      : ({ enabled: true, value: v } as FeatureFlagStatus);

  const unwrap = (
    f: FeatureFlagStatus | undefined,
    fallback: boolean | string | number,
  ) => {
    if (typeof f === 'boolean') return f;
    if (!f) return fallback;
    return f.value ?? fallback;
  };

  const raw = ctx.getFlag(flagKey, wrapDefault(defaultValue));
  return unwrap(raw, defaultValue) as boolean | string | number;
}

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
      if (typeof raw === 'boolean') return raw as unknown as T;
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
