import type { IFlagsmithTrait } from 'flagsmith/react';
import { createFlagsmithInstance } from 'flagsmith/isomorphic';

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
export const flagsmithServer = createFlagsmithInstance();

export async function getFeatureFlag(
  flagKey: KnownFeatureType,
  userId?: string,
  defaultValue: boolean | string | number = false,
) {
  try {
    await flagsmithServer.init({
      environmentID: env('NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID'),
      api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
      identity: userId,
    });

    const flags = flagsmithServer.getAllFlags();
    return Object.entries(flags).reduce(
      (acc, [key, value]) => {
        if (isKeyOf(key, KnownFeature)) {
          acc[key] =
            typeof value === 'boolean'
              ? value
              : {
                  enabled: true,
                  value,
                };
        }
        return acc;
      },
      {} as Record<KnownFeatureType, IFlagsmithTrait>,
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'Flagsmith',
      log: true,
    });
    return defaultValue;
  }
}

export const getAllFeatureFlags = async (userId?: string) => {
  try {
    await flagsmithServer.init({
      environmentID: env('NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID'),
      api: env('NEXT_PUBLIC_FLAGSMITH_API_URL'),
      identity: userId,
    });

    const flags = flagsmithServer.getAllFlags();
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
