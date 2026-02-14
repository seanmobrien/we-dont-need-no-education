import { Flags, Flagsmith, FlagsmithConfig } from 'flagsmith-nodejs';
import { auth } from '@/auth';
import type {
  NativeFlag,
  KnownFeatureValueType,
  FeatureFlagValueType,
  MinimalNodeFlagsmith,
  GetFeatureFlagOptions,
} from './types';

import { type KnownFeatureType, isKnownFeatureType } from './known-feature';
import {
  AllFeatureFlagsDefault,
  FLAGSMITH_SERVER_SINGLETON_KEY,
} from './known-feature-defaults';

import { globalSingleton } from '@compliance-theater/typescript';
import { env } from '@compliance-theater/env';
import { LoggedError, log } from '@compliance-theater/logger';
import { extractFlagValue } from './util';

import { fetch as serverFetch } from '@compliance-theater/nextjs/server/fetch';
import { FlagsmithRedisCache } from './flagsmith-cache';

/**
 * Type guard to check if a value is a NativeFlag.
 * @param check The value to check.
 * @returns True if the value is a NativeFlag, false otherwise.
 */
const isNativeFlag = (check: unknown): check is NativeFlag =>
  !!check &&
  typeof check === 'object' &&
  'enabled' in check &&
  typeof check.enabled === 'boolean' &&
  'value' in check;

const asNativeFlag = <
  TFeature extends KnownFeatureType,
  TValueType extends KnownFeatureValueType<TFeature>
>(
  flag: TValueType | TFeature | NativeFlag,
  { isDefault }: { isDefault?: true } = {}
): NativeFlag => {
  if (isNativeFlag(flag)) {
    return flag;
  }
  const sourceValue = isKnownFeatureType(flag)
    ? (AllFeatureFlagsDefault[flag] as TValueType)
    : flag;
  if (typeof sourceValue === 'boolean') {
    return {
      enabled: sourceValue,
      value: undefined,
      isDefault: isDefault === true,
    };
  } else if (typeof sourceValue === 'object') {
    return {
      enabled: !!sourceValue,
      value: sourceValue ? JSON.stringify(sourceValue) : undefined,
      isDefault: isDefault === true,
    };
  }
  return {
    enabled: !!sourceValue,
    value: sourceValue,
    isDefault: isDefault === true,
  };
};

export const defaultFlagHandler = (flagKey: string) => {
  if (isKnownFeatureType(flagKey)) {
    const native = asNativeFlag(flagKey, { isDefault: true });
    return {
      enabled: native.enabled,
      value: native.value ?? undefined,
      isDefault: true,
    };
  }
  return { enabled: false, value: undefined, isDefault: true };
};

export const flagsmithServerFactory = (
  options?: Partial<FlagsmithConfig>
): Flagsmith => {
  const normalOptions = options ?? {};
  const definesFetch = 'fetch' in normalOptions;
  const definesDefaultFlagHandler = 'defaultFlagHandler' in normalOptions;
  const {
    defaultFlagHandler: thisFlagDefaultHander,
    fetch: thisFetch,
    ...restOptions
  } = normalOptions;
  const theDefaultFlagHandler = definesDefaultFlagHandler
    ? thisFlagDefaultHander
    : defaultFlagHandler;
  const config: FlagsmithConfig = {
    environmentKey: env('FLAGSMITH_SDK_KEY'),
    apiUrl: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
    enableAnalytics: true,
    enableLocalEvaluation: false,
    requestTimeoutSeconds: 60,
    retries: 2,
    defaultFlagHandler: theDefaultFlagHandler,
    fetch: definesFetch ? thisFetch : serverFetch,
    cache: new FlagsmithRedisCache({
      lru: { max: 20, ttl: 20 * 60 },
      redis: { ttl: 60 * 60, keyPrefix: 'flagsmith_edge_cache:' },
      defaultFlagHandler: theDefaultFlagHandler,
    }),
    ...restOptions,
  };
  return new Flagsmith(config);
};

// Server-bound Flagsmith instance used for server-side flag evaluation.
export const flagsmithServer = (): Flagsmith | undefined =>
  globalSingleton(
    FLAGSMITH_SERVER_SINGLETON_KEY,
    () => {
      try {
        return flagsmithServerFactory({});
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          source: 'Flagsmith::createFlagsmithServerInstance',
          log: true,
        });
        return undefined;
      }
    },
    {
      weakRef: false,
    }
  );

const identify = async ({
  userId,
  flagsmith: flagsmithFactory,
}: {
  userId?: string;
  flagsmith?: () => MinimalNodeFlagsmith;
}): Promise<Flags> => {
  try {
    if (!userId) {
      const session = await auth();
      userId = session?.user?.hash ?? session?.user?.id?.toString();
      if (!userId) {
        userId = 'server';
      }
    }
    const flagsmith = (flagsmithFactory ?? flagsmithServer)();
    if (flagsmith) {
      return await flagsmith.getIdentityFlags(userId);
    }
    log((l) =>
      l.warn('[Flagsmith::identify] Flagsmith server instance not available.')
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith::identify',
      log: true,
    });
  }
  return {} as Flags;
};

const normalizeFeatureFlagOptions = (
  options: string | GetFeatureFlagOptions | undefined
): GetFeatureFlagOptions => {
  if (typeof options === 'string' || options === undefined) {
    return { userId: options };
  }
  return options;
};

export const getFeatureFlag = async <T extends KnownFeatureType>(
  flagKey: T,
  options?: string | GetFeatureFlagOptions
): Promise<FeatureFlagValueType<typeof flagKey> | null> => {
  const { userId, flagsmith } = normalizeFeatureFlagOptions(options);
  try {
    const flags = await identify({ userId, flagsmith });
    const flag = flags.getFlag(flagKey);
    return extractFlagValue(flagKey, flag);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return null;
  }
};

export const getAllFeatureFlags = async (
  options?: string | GetFeatureFlagOptions
): Promise<
  Record<KnownFeatureType, FeatureFlagValueType<KnownFeatureType>>
> => {
  try {
    const { userId, flagsmith } = normalizeFeatureFlagOptions(options);
    const flags = await identify({ userId, flagsmith });
    return flags.allFlags().reduce((acc, flag) => {
      const key = flag.featureName;
      if (isKnownFeatureType(key)) {
        const value = extractFlagValue(key, flag);
        if (value !== null) {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as Record<KnownFeatureType, FeatureFlagValueType<KnownFeatureType>>);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return AllFeatureFlagsDefault;
  }
};
