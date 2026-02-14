import { withTimeout } from "../nextjs-util/with-timeout";
export const generateUniqueId = () => {
    return Math.random().toString(36).slice(2, 9);
};
export const isError = (value) => {
    return (!!value &&
        typeof value === 'object' &&
        (value instanceof Error || ('message' in value && 'name' in value)));
};
export const isXmlHttpRequest = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'readyState' in value &&
        'status' in value &&
        'timeout' in value &&
        'upload' in value &&
        'response' in value &&
        'open' in value &&
        typeof value.open === 'function' &&
        'send' in value &&
        typeof value.send === 'function');
};
export const isProgressEvent = (value) => typeof value === 'object' &&
    !!value &&
    'target' in value &&
    isXmlHttpRequest(value.target) &&
    'loaded' in value &&
    typeof value.loaded === 'number' &&
    'total' in value &&
    typeof value.total === 'number' &&
    'lengthComputable' in value &&
    typeof value.lengthComputable === 'boolean';
export const isAbortError = (value) => {
    return value instanceof DOMException && value.name === 'AbortError';
};
export const isTemplateStringsArray = (value) => {
    return Array.isArray(value) && 'raw' in value;
};
export const isTruthy = (value, defaultValue = false) => {
    if (value === undefined || value === null) {
        return defaultValue;
    }
    if (typeof value === 'string') {
        const trimmedValue = value.trim().toLowerCase();
        return (trimmedValue === 'true' ||
            trimmedValue === '1' ||
            trimmedValue === 'yes' ||
            trimmedValue === 'y');
    }
    else if (Array.isArray(value)) {
        return value.length > 0;
    }
    else if (typeof value === 'object' && Object.keys(value).length === 0) {
        return false;
    }
    return Boolean(value);
};
export const isRecord = (check) => {
    return check !== null && typeof check === 'object';
};
export const TypeBrandSymbol = Symbol('TypeBrandSymbol');
export const isTypeBranded = (check, brand) => typeof check === 'object' &&
    check !== null &&
    TypeBrandSymbol in check &&
    check[TypeBrandSymbol] === brand;
export const getResolvedPromises = async (promises, timeoutMs = 60 * 1000) => {
    const racedPromises = promises.map((promise) => withTimeout(promise, timeoutMs));
    const results = await Promise.allSettled(racedPromises);
    return results.reduce((acc, result, index) => {
        if (result.status === 'fulfilled') {
            if (result.value.timedOut) {
                acc.pending.push(promises[index]);
            }
            else {
                acc.fulfilled.push(result.value.value);
            }
        }
        else {
            acc.rejected.push(result.reason);
        }
        return acc;
    }, { fulfilled: [], rejected: [], pending: [] });
};
//# sourceMappingURL=utility-methods.js.map