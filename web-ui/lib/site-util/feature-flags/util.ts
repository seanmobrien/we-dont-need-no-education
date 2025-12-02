import { LoggedError } from '@/lib/react-util';
import {
  isKnownFeatureBooleanType,
  isKnownFeatureObjectType,
} from './known-feature';
import type {
  FeatureFlagValueType,
  KnownFeatureType,
  NativeFlag,
} from './types';

export const extractFlagValue = <T extends KnownFeatureType>(
  flagKey: T,
  flag: NativeFlag | null,
): FeatureFlagValueType<typeof flagKey> | null => {
  // For boolean flags, we return true if the flag is non-null
  // and enabled and the value is not explicitly false; all other
  // cases we return false.
  if (isKnownFeatureBooleanType(flagKey)) {
    return (flag &&
      flag.enabled &&
      flag.value !== false) as FeatureFlagValueType<typeof flagKey>;
  }
  // For other flag types, if the flag is null/not enabled we return null
  if (!flag || !flag.enabled) {
    return null;
  }
  // If it's an object flag, we parse the JSON value
  if (isKnownFeatureObjectType(flagKey)) {
    try {
      const parsedValue = JSON.parse(
        flag.value as string,
      ) as FeatureFlagValueType<typeof flagKey>;
      return parsedValue;
    } catch (e) {
      LoggedError.isTurtlesAllTheWayDownBaby(e, {
        source: `Flagsmith::getFeatureFlag::parseObject::${flagKey}`,
        log: true,
      });
      return null;
    }
  }
  // Otherwise, we're non-null, enabled, and a primitive type -
  // we can just return the value as-is.
  return flag.value as FeatureFlagValueType<typeof flagKey>;
};
