'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  FeatureFlagsApi,
  AllFeatureFlagsDefault,
  FeatureFlagStatus,
  KnownFeatureType,
} from '/lib/site-util/feature-flags';
import FeatureFlagsContext from '/lib/site-util/feature-flags/context';

const defaultFlags = AllFeatureFlagsDefault as unknown as Record<
  KnownFeatureType,
  FeatureFlagStatus
>;

export const FlagProvider = ({ children }: { children: React.ReactNode }) => {
  // Client-only provider that hydrates from a server-injected
  // `window.__FEATURE_FLAGS__` payload when available.
  const [flags, setFlags] = useState<
    Record<KnownFeatureType, FeatureFlagStatus>
  >(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = typeof window !== 'undefined' ? (window as any) : undefined;
      if (
        win &&
        win.__FEATURE_FLAGS__ &&
        typeof win.__FEATURE_FLAGS__ === 'object'
      ) {
        return win.__FEATURE_FLAGS__ as Record<
          KnownFeatureType,
          FeatureFlagStatus
        >;
      }
    } catch {
      // ignore
    }
    return defaultFlags;
  });

  // Optional: if another script updates `window.__FEATURE_FLAGS__` after
  // hydration, pick it up. This is defensive and cheap.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = typeof window !== 'undefined' ? (window as any) : undefined;
      if (
        win &&
        win.__FEATURE_FLAGS__ &&
        typeof win.__FEATURE_FLAGS__ === 'object'
      ) {
        setFlags(
          win.__FEATURE_FLAGS__ as Record<KnownFeatureType, FeatureFlagStatus>,
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const api = useMemo<FeatureFlagsApi>(
    () => ({
      getFlag: (key, defaultValue) =>
        flags[key] ?? defaultValue ?? defaultFlags[key],
      getFlags: (keys, defaults) =>
        keys.map((k, i) => flags[k] ?? defaults?.[i] ?? defaultFlags[k]),
      getAllFlags: () => ({ ...defaultFlags, ...flags }),
      isEnabled: (key) =>
        Boolean(
          flags[key as KnownFeatureType] ??
            defaultFlags[key as KnownFeatureType] ??
            false,
        ),
      getFlagState: (key) => ({
        value:
          flags[key as KnownFeatureType] ??
          defaultFlags[key as KnownFeatureType],
        isLoading: false,
        error: null,
      }),
    }),
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={api}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
