import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import type { IFlagsmith } from 'flagsmith';
import { isKnownFeatureType } from './known-feature';
import { AllFeatureFlagsDefault } from './known-feature-defaults';

import { env } from '../env';
import { LoggedError } from '@/lib/react-util';
import {
  FeatureFlagValueType,
  KnownFeatureType,
} from './types';
import { extractFlagValue } from './util';

// Client-bound Flagsmith instance used for client-side flag evaluation.
export const flagsmithClient = async () => {
  const REFRESH_INTERVAL = 1000 * 60 * 5; // Refresh every 5 minutes
  const flagsmithClient = createFlagsmithInstance();
  await flagsmithClient.init({
    environmentID: env('NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID'),
    api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
    enableAnalytics: true,
    cacheOptions: {
      ttl: REFRESH_INTERVAL,
      loadStale: false,
      skipAPI: false,
    },
  });
  flagsmithClient.startListening(REFRESH_INTERVAL);
  return flagsmithClient;
};

const identify = async ({
  userId,
}: {
  userId: string | undefined;
}): Promise<IFlagsmith<string, string> | null> => {
  const normalUserId = userId ?? 'anonymous';

  try {
    const server = await flagsmithClient();
    if (server.identity === normalUserId) {
      return server;
    }
    await server.identify(normalUserId);
    return server;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith::identify',
      log: true,
    });
  }
  return null;
};

export const getFeatureFlag = async <T extends KnownFeatureType>(
  flagKey: T,
  userId?: string,
  defaultValue?: FeatureFlagValueType<typeof flagKey>,
): Promise<FeatureFlagValueType<typeof flagKey> | null> => {
  try {
    const server = await identify({ userId });
    if (!server)
      return (
        defaultValue ??
        (AllFeatureFlagsDefault[flagKey] as FeatureFlagValueType<
          typeof flagKey
        >)
      );
    if (!server.initialised) {
      await server.getFlags();
    }
    const flag = server?.getAllFlags()[flagKey];
    return (
      extractFlagValue(flagKey, flag) ??
      defaultValue ??
      (AllFeatureFlagsDefault[flagKey] as FeatureFlagValueType<typeof flagKey>)
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return (
      defaultValue ??
      (AllFeatureFlagsDefault[flagKey] as FeatureFlagValueType<typeof flagKey>)
    );
  }
};

export const getAllFeatureFlags = async (userId?: string) => {
  try {
    const server = await identify({ userId });
    if (!server) {
      return AllFeatureFlagsDefault;
    }
    const flags = server.getAllFlags();
    return Object.entries(flags).reduce(
      (acc, [key, value]) => {
        if (isKnownFeatureType(key)) {
          const flagValue = extractFlagValue(key, value);
          if (flagValue !== null) {
            acc[key] = flagValue;
          }
        }
        return acc;
      },
      {} as Record<KnownFeatureType, FeatureFlagValueType<KnownFeatureType>>,
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return AllFeatureFlagsDefault;
  }
};
