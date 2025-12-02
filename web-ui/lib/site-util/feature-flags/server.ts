import { Flags, Flagsmith } from 'flagsmith-nodejs';
import { auth } from '@/auth';
import type {
  KnownFeatureType,
  NativeFlag,
  KnownFeatureValueType,
  FeatureFlagValueType,

} from './types';

import { isKnownFeatureType } from './known-feature';
import { AllFeatureFlagsDefault } from './known-feature-defaults';

import { globalSingleton } from '@/lib/typescript';
import { env } from '../env';
import { LoggedError } from '@/lib/react-util';
import { extractFlagValue } from './util';

import { fetch } from '@/lib/nextjs-util/server/fetch';

const FLAGSMITH_SERVER_SINGLETON_KEY = '@noeducation/flagsmith-server';

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
  TValueType extends KnownFeatureValueType<TFeature>,
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
          requestTimeoutSeconds: 15,
          defaultFlagHandler: (flagKey) => {
            if (isKnownFeatureType(flagKey)) {
              const native = asNativeFlag(flagKey, { isDefault: true });
              return {
                enabled: native.enabled,
                value: native.value ?? undefined,
                isDefault: true,
              };
            }
            return { enabled: false, value: undefined, isDefault: true };
          },
          fetch,
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
      weakRef: false,
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
): Promise<FeatureFlagValueType<typeof flagKey> | null> => {
  try {
    const flags = await identify({ userId });
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
  userId?: string,
): Promise<
  Record<KnownFeatureType, FeatureFlagValueType<KnownFeatureType>>
> => {
  try {
    const flags = await identify({ userId });
    return flags.allFlags().reduce(
      (acc, flag) => {
        const key = flag.featureName;
        if (isKnownFeatureType(key)) {
          const value = extractFlagValue(key, flag);
          if (value !== null) {
            acc[key] = value;
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
