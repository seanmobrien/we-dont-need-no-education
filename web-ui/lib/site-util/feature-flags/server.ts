import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import type { IFlagsmith } from 'flagsmith';
import { auth } from '/auth';
import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';
import { isKeyOf } from '/lib/typescript';
import { env } from '../env';
import { LoggedError } from '/lib/react-util';

const FLAGSMITH_SERVER = Symbol.for('@noeducation/flagsmith-server');

// Server-bound Flagsmith instance used for server-side flag evaluation.
export const flagsmithServer = async () => {
  const REFRESH_INTERVAL = 1000 * 60 * 5; // Refresh every 5 minutes
  const globalRegistry: typeof globalThis & {
    [FLAGSMITH_SERVER]?: IFlagsmith<string, string>;
  } = globalThis;
  if (!globalRegistry[FLAGSMITH_SERVER]) {
    const flagsmithServer = createFlagsmithInstance();
    await flagsmithServer.init({
      environmentID: env('FLAGSMITH_SDK_KEY'),
      api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
    });
    flagsmithServer.startListening(REFRESH_INTERVAL);
    globalRegistry[FLAGSMITH_SERVER] = flagsmithServer;
    return flagsmithServer;
  }
  return globalRegistry[FLAGSMITH_SERVER];
};

const identify = async ({
  userId,
}: {
  userId?: string;
}): Promise<IFlagsmith<string, string> | null> => {
  if (!userId) {
    const session = await auth();
    userId = session?.user?.id;
    if (!userId) {
      userId = 'server';
    }
  }
  try {
    const server = await flagsmithServer();
    if (server.identity === userId) {
      return server;
    }
    // TODO: Send over some traits
    await server.identify(userId);
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
