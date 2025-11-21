import { Flags, Flagsmith } from 'flagsmith-nodejs';
// import { createFlagsmithInstance } from 'flagsmith/isomorphic';
// import type { IFlagsmith } from 'flagsmith';
import { auth } from '@/auth';
import {
  KnownFeature,
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
  type NativeFlag,
  isKnownFeatureType,
  FeatureFlagValueType,
} from './known-feature';
import { globalSingleton, isKeyOf } from '@/lib/typescript';
import { env } from '../env';
import { LoggedError } from '@/lib/react-util';
// import { LRUCache } from 'lru-cache';

const FLAGSMITH_SERVER_SINGLETON_KEY = '@noeducation/flagsmith-server';
// const REFRESH_INTERVAL = 1000 * 60 * 5; // Refresh every 5 minutes

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
  TValueType extends FeatureFlagValueType<TFeature>,
>(
  flag: TValueType | TFeature | NativeFlag,
  { isDefault }: { isDefault?: true } = {},
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

// Server-bound Flagsmith instance used for server-side flag evaluation.
export const flagsmithServer = (): Flagsmith | undefined =>
  globalSingleton(
    FLAGSMITH_SERVER_SINGLETON_KEY,
    () => {
      try {
        return new Flagsmith({
          environmentKey: env('FLAGSMITH_SDK_KEY'),
          apiUrl: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
          enableAnalytics: true,
          enableLocalEvaluation: false,
          requestTimeoutSeconds: 45,
          defaultFlagHandler: (flagKey) =>
            isKnownFeatureType(flagKey)
              ? asNativeFlag(flagKey, { isDefault: true })
              : { enabled: false, value: undefined, isDefault: true },
        });
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          source: 'Flagsmith::createFlagsmithServerInstance',
          log: true,
        });
        return undefined;
      }
    },
    {
      weakRef: true,
    },
  );

const identify = async ({ userId }: { userId?: string }): Promise<Flags> => {
  try {
    if (!userId) {
      const session = await auth();
      userId = session?.user?.hash ?? session?.user?.id?.toString();
      if (!userId) {
        userId = 'server';
      }
    }
    return flagsmithServer()?.getIdentityFlags(userId) ?? ({} as Flags);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith::identify',
      log: true,
    });
  }
  return {} as Flags;
};

export const getFeatureFlag = async <T extends KnownFeatureType>(
  flagKey: T,
  userId?: string,
  defaultValue?: (typeof AllFeatureFlagsDefault)[T],
): Promise<(typeof AllFeatureFlagsDefault)[T]> => {
  try {
    const flags = await identify({ userId });
    const serverValue = flags.getFeatureValue(flagKey);
    return !!serverValue
      ? (serverValue as (typeof AllFeatureFlagsDefault)[T])
      : (defaultValue ?? AllFeatureFlagsDefault[flagKey]);
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
    const flags = await identify({ userId });
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
