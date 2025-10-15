'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  FeatureFlagsApi,
  AllFeatureFlagsDefault,
  FeatureFlagStatus,
  KnownFeatureType,
} from '@/lib/site-util/feature-flags';
import { getAllFeatureFlags } from '@/lib/site-util/feature-flags/client';
import FeatureFlagsContext from '@/lib/site-util/feature-flags/context';
import { LoggedError } from '@/lib/react-util';
import { useFlagsmithLoading } from 'flagsmith/react';
import { useSession } from '@/components/auth/session-provider';
import { Session } from '@auth/core/types';

const defaultFlags = AllFeatureFlagsDefault as unknown as Record<
  KnownFeatureType,
  FeatureFlagStatus
>;

export const FlagProvider = ({ children }: { children: React.ReactNode }) => {
  const [flags, setFlags] = useState<
    Record<KnownFeatureType, FeatureFlagStatus>
  >(AllFeatureFlagsDefault);
  const { userHash, status } = useSession<Session>();
  const { isLoading, error, isFetching } = useFlagsmithLoading() ?? {
    isLoading: false,
    error: null,
  };
  console.log('status=', status, 'userHash=', userHash);
  const sessionLoaded = status !== 'loading';
  useEffect(() => {
    let isSubscribed = true;

    const loadFlags = async () => {
      try {
        const allFlags = await getAllFeatureFlags(userHash);
        if (isSubscribed) {
          setFlags(allFlags);
        }
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          source: 'Flagsmith',
          log: true,
        });
      }
    };

    if (sessionLoaded && !isLoading) {
      loadFlags();
    }

    return () => {
      isSubscribed = false;
    };
  }, [isLoading, sessionLoaded, userHash]);

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
      get error() {
        return error ?? undefined;
      },
      isLoaded: isLoading,
      isFetching: true,
    }),
    [flags, error, isLoading],
  );
  (api as unknown as { isFetching: boolean }).isFetching = isFetching === true;
  return (
    <FeatureFlagsContext.Provider value={api}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};
