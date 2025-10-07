import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import type { IFlagsmith } from 'flagsmith';
import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';
import { isKeyOf } from '/lib/typescript';
import { env } from '../env';
import { LoggedError } from '/lib/react-util';

// Server-bound Flagsmith instance used for server-side flag evaluation.
export const flagsmithClient = async () => {
  const REFRESH_INTERVAL = 1000 * 60 * 5; // Refresh every 5 minutes
  const flagsmithClient = createFlagsmithInstance();
  await flagsmithClient.init({
    environmentID: env('NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID'),
    api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
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
  defaultValue?: (typeof AllFeatureFlagsDefault)[T],
) => {
  try {
    const server = await identify({ userId });
    return (
      server?.getValue(flagKey, {
        skipAnalytics: false,
        json: true,
        ...(defaultValue === undefined || typeof defaultValue === 'object'
          ? {}
          : { fallback: defaultValue }),
      }) ??
      defaultValue ??
      AllFeatureFlagsDefault[flagKey]
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return defaultValue;
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
        if (isKeyOf(key, KnownFeature)) {
          acc[key] = value
            ? typeof value === 'boolean'
              ? value
              : {
                  enabled: true,
                  value,
                }
            : AllFeatureFlagsDefault[key];
        }
        return acc;
      },
      {} as Record<KnownFeatureType, FeatureFlagStatus>,
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return AllFeatureFlagsDefault;
  }
};
