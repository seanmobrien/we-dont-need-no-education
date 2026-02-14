import { createHash } from 'crypto';
import { getCacheConfig, validateCacheConfig } from './config';
import { LoggedError } from '@compliance-theater/logger';
const config = getCacheConfig();
validateCacheConfig(config);
export const createCacheKey = (params, modelId) => {
    try {
        const normalizeForKey = (value) => {
            const type = typeof value;
            if (type !== 'boolean' && (value === null || value === undefined)) {
                return undefined;
            }
            switch (type) {
                case 'symbol':
                case 'function':
                    return undefined;
                case 'object':
                    if (Array.isArray(value)) {
                        if (value.length === 0) {
                            return '[]';
                        }
                        if (value.length > 100) {
                            const hash = createHash('sha256');
                            value.forEach((item, index) => {
                                hash.update(`${index}:${normalizeForKey(item) || 'null'}`);
                            });
                            return hash.digest('hex');
                        }
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
                        }
                        catch {
                            const hash = createHash('sha256');
                            value.forEach((item, index) => {
                                hash.update(`${index}:${normalizeForKey(item) || 'null'}`);
                            });
                            return hash.digest('hex');
                        }
                    }
                    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
                    if (entries.length > 50) {
                        const hash = createHash('sha256');
                        entries.forEach(([key, val]) => {
                            if (val !== undefined && val !== null) {
                                hash.update(`${key}:${normalizeForKey(val) || 'null'}`);
                            }
                        });
                        return hash.digest('hex');
                    }
                    try {
                        const normalizedObject = entries.reduce((acc, [key, val]) => {
                            if (val === undefined || val === null) {
                                return acc;
                            }
                            acc[key] = normalizeForKey(val);
                            return acc;
                        }, {});
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
                    }
                    catch {
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
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
        return '';
    }
};
export const createJailKey = (cacheKey) => `${config.jailKeyPrefix}:${cacheKey.replace(`${config.cacheKeyPrefix}:`, '')}`;
//# sourceMappingURL=cacheKeys.js.map