import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import type { IFlagsmith } from 'flagsmith';
import { auth } from '@/auth';
import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';
import { isKeyOf } from '@/lib/typescript';
import { env } from '../env';
import { LoggedError } from '@/lib/react-util';
import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';

const FLAGSMITH_SERVER_SINGLETON_KEY = '@noeducation/flagsmith-server';
const REFRESH_INTERVAL = 1000 * 60 * 5; // Refresh every 5 minutes

const createFlagsmithServerInstance = async (): Promise<
  IFlagsmith<string, string>
> => {
  const flagsmithServer = createFlagsmithInstance();
  await flagsmithServer.init({
    environmentID: env('FLAGSMITH_SDK_KEY'),
    api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
    enableAnalytics: true,
    enableLogs: true,
  });
  flagsmithServer.startListening(REFRESH_INTERVAL);
  return flagsmithServer;
};

// Server-bound Flagsmith instance used for server-side flag evaluation.
export const flagsmithServer = async (): Promise<
  IFlagsmith<string, string>
> => {
  const existing = SingletonProvider.Instance.get<IFlagsmith<string, string>>(
    FLAGSMITH_SERVER_SINGLETON_KEY,
  );
  if (existing) {
    return existing;
  }

  const instance = await createFlagsmithServerInstance();
  SingletonProvider.Instance.set(FLAGSMITH_SERVER_SINGLETON_KEY, instance);
  return instance;
};

const identify = async ({
  userId,
}: {
  userId?: string;
}): Promise<IFlagsmith<string, string> | null> => {
  if (!userId) {
    const session = await auth();
    userId = session?.user?.hash ?? session?.user?.id?.toString();
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
): Promise<(typeof AllFeatureFlagsDefault)[T]> => {
  try {
    const server = await identify({ userId });
    return (server?.getValue(flagKey, {
      skipAnalytics: false,
      json: true,
      ...(defaultValue === undefined || typeof defaultValue === 'object'
        ? {}
        : { fallback: defaultValue }),
    }) ??
      defaultValue ??
      AllFeatureFlagsDefault[flagKey]) as (typeof AllFeatureFlagsDefault)[T];
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return defaultValue ?? AllFeatureFlagsDefault[flagKey];
  }
};

export const getAllFeatureFlags = async (
  userId?: string,
): Promise<Record<KnownFeatureType, FeatureFlagStatus>> => {
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
            : {
                enabled: !!AllFeatureFlagsDefault[key],
                value: AllFeatureFlagsDefault[key],
              };
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
