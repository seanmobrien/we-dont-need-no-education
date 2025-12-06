'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  FeatureFlagsApi,
  AllFeatureFlagsDefault,
  KnownFeatureType,
  KnownFeatureValueType,
} from '@/lib/site-util/feature-flags';
import { getAllFeatureFlags } from '@/lib/site-util/feature-flags/client';
import FeatureFlagsContext from '@/lib/site-util/feature-flags/context';
import { useFlagsmithLoading } from 'flagsmith/react';
import { useSession } from '@/components/auth/session-provider';
import type { Session } from '@auth/core/types';
import { errorReporter } from '@/lib/error-monitoring/error-reporter';

const defaultFlags = AllFeatureFlagsDefault;

export const FlagProvider = ({ children }: { children: React.ReactNode }) => {
  const [flags, setFlags] = useState<
    Record<KnownFeatureType, KnownFeatureValueType<KnownFeatureType>>
  >(AllFeatureFlagsDefault);
  const { userHash, status } = useSession<Session>();
  const { isLoading, error, isFetching } = useFlagsmithLoading() ?? {
    isLoading: false,
    error: null,
  };
  const hasLoadedRef = useRef<number>(0);
  // This means feature flags won't work on anon pages, but I think we're OK without
  // toggling the home and privacy pages
  const sessionLoaded = status === 'authenticated';
  useEffect(() => {
    let isSubscribed = true;
    let timeoutId: NodeJS.Timeout | null = null;
    const loadFlags = async () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        hasLoadedRef.current = Date.now();
        const allFlags = await getAllFeatureFlags(userHash);
        if (isSubscribed) {
          setFlags(allFlags);
          timeoutId = setTimeout(loadFlags, 3 * 60 * 1000); // 3 minutes
        }
      } catch (error) {
        errorReporter((r) => r.reportError(error));
        if (isSubscribed && !timeoutId) {
          timeoutId = setTimeout(loadFlags, 30 * 1000); // 30 seconds
        }
      }
    };

    if (sessionLoaded) {
      if (hasLoadedRef.current) {
        if (!timeoutId) {
          // Reliable once-every-three-minutes trigger that will survive component remounts
          const timeSinceLoad = Date.now() - hasLoadedRef.current;
          if (timeSinceLoad < 3 * 60 * 1000) {
            timeoutId = setTimeout(loadFlags, 3 * 60 * 1000 - timeSinceLoad); // 3 minutes
          } else {
            loadFlags();
          }
        }
      } else {
        hasLoadedRef.current = Date.now();
        loadFlags();
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isSubscribed = false;
    };
  }, [sessionLoaded, userHash]);

  const api = useMemo<FeatureFlagsApi>(() => {
    const isEnabled = (key: KnownFeatureType | string) =>
      flags[key as KnownFeatureType]
        ? Boolean(flags[key as KnownFeatureType])
        : null;
    return {
      getFlag: (key, defaultValue) =>
        flags[key] ?? defaultValue ?? defaultFlags[key],
      getFlags: (keys, defaults) =>
        keys.map((k, i) => flags[k] ?? defaults?.[i] ?? defaultFlags[k]),
      getAllFlags: () => ({ ...defaultFlags, ...flags }),
      isEnabled,
      getFlagState: <TKey extends KnownFeatureType>(key: TKey) => ({
        value: (flags[key as KnownFeatureType] ??
          defaultFlags[key as KnownFeatureType]) as KnownFeatureValueType<TKey>,
        enabled: isEnabled(key),
        isDefault: !!flags[key as KnownFeatureType],
        isLoading,
        error,
      }),
      error,
      isLoaded: !isLoading,
    } as FeatureFlagsApi;
  }, [flags, error, isLoading]);
  (api as typeof api & { isFetching: boolean }).isFetching =
    isFetching === true;
  return (
    <FeatureFlagsContext.Provider value={api}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
