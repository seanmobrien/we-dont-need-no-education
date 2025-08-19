import { createHash } from 'crypto';
import { getCacheConfig, validateCacheConfig } from './config';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

// Enterprise configuration and metrics
const config = getCacheConfig();
validateCacheConfig(config);

/**
 * Creates a unique cache key from parameters and model information
 */
export const createCacheKey = (
  params: Record<string, unknown>,
  modelId?: string,
): string => {
  try {
    const normalizeForKey = (value: unknown): string | undefined => {
      const type = typeof value;
      if (type !== 'boolean' && (value === null || value === undefined)) {
        return undefined;
      }
      switch (type) {
        case 'symbol':
        case 'function':
          return undefined;
        case 'object':
          // Handle objects and arrays by hashing large structures to avoid stringify issues
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return '[]';
            }
            // For large arrays, hash immediately to avoid stringify issues
            if (value.length > 100) {
              const hash = createHash('sha256');
              value.forEach((item, index) => {
                hash.update(`${index}:${normalizeForKey(item) || 'null'}`);
              });
              return hash.digest('hex');
            }
            // For smaller arrays, try JSON stringify with fallback to hashing
            try {
              const normalizedArray = value.map(normalizeForKey).sort();
              const arrayJson = JSON.stringify(normalizedArray);
              if (arrayJson.length > 1000) {
                const hash = createHash('sha256');
                normalizedArray.forEach((item, index) => {
                  hash.update(`${index}:${item || 'null'}`);
                });
                return hash.digest('hex');
              }
              return arrayJson;
            } catch {
              // Fallback to hashing if stringify fails
              const hash = createHash('sha256');
              value.forEach((item, index) => {
                hash.update(`${index}:${normalizeForKey(item) || 'null'}`);
              });
              return hash.digest('hex');
            }
          }

          // For objects, check size and hash large ones
          const entries = Object.entries(value as object).sort(([a], [b]) =>
            a.localeCompare(b),
          );

          // For large objects, hash immediately to avoid stringify issues
          if (entries.length > 50) {
            const hash = createHash('sha256');
            entries.forEach(([key, val]) => {
              if (val !== undefined && val !== null) {
                hash.update(`${key}:${normalizeForKey(val) || 'null'}`);
              }
            });
            return hash.digest('hex');
          }

          // For smaller objects, try JSON stringify with fallback to hashing
          try {
            const normalizedObject = entries.reduce(
              (acc, [key, val]) => {
                if (val === undefined || val === null) {
                  return acc;
                }
                acc[key] = normalizeForKey(val);
                return acc;
              },
              {} as Record<string, unknown>,
            );
            const objectJson = JSON.stringify(normalizedObject);
            if (objectJson.length > 1000) {
              const hash = createHash('sha256');
              entries.forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                  hash.update(`${key}:${normalizeForKey(val) || 'null'}`);
                }
              });
              return hash.digest('hex');
            }
            return objectJson;
          } catch {
            // Fallback to hashing if stringify fails
            const hash = createHash('sha256');
            entries.forEach(([key, val]) => {
              if (val !== undefined && val !== null) {
                hash.update(`${key}:${normalizeForKey(val) || 'null'}`);
              }
            });
            return hash.digest('hex');
          }
        default:
          const stringValue = String(value);
          // Hash very large string values to prevent issues
          if (stringValue.length > 10000) {
            return createHash('sha256').update(stringValue).digest('hex');
          }
          return stringValue;
      }
    };
    const keyData = {
      modelId: modelId || 'unknown',
      params: {
        ...params,
      },
    };
    const keyString = normalizeForKey(keyData)?.replaceAll(/\s|\\/g, '');
    if (keyString === undefined) {
      throw new Error('Cannot create cache key from undefined value');
    }
    const hash = createHash('sha256').update(keyString).digest('hex');
    return `${config.cacheKeyPrefix}:${hash}`;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
    return '';
  }
};

/**
 * Cache jail key for tracking problematic responses
 */
export const createJailKey = (cacheKey: string): string =>
  `${config.jailKeyPrefix}:${cacheKey.replace(`${config.cacheKeyPrefix}:`, '')}`;
