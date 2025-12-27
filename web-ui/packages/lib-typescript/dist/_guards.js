import { AbortablePromise } from './abortable-promise';
export const isOperationCancelledError = AbortablePromise.isOperationCancelledError;
export const isAbortablePromise = AbortablePromise.isAbortablePromise;
export const isKeyOf = (key, check) => {
    if (check === undefined || check === null) {
        return false;
    }
    if (typeof key === 'string' ||
        typeof key === 'number' ||
        typeof key === 'symbol') {
        if (Array.isArray(check)) {
            return check.some((v) => v === key);
        }
        if (check && typeof check === 'object') {
            return key in check;
        }
    }
    return false;
};
export const isMemberOfUnion = (check, union) => {
    return !!union?.includes(check);
};
export const isPromise = (check) => !!check &&
    typeof check === 'object' &&
    'then' in check &&
    typeof check.then === 'function' &&
    'catch' in check &&
    typeof check.catch === 'function' &&
    'finally' in check &&
    typeof check.finally === 'function';
export const isNotNull = (value) => !!value;
export const isValidUuid = (check) => {
    const uuidRegex = /[0-9a-z]{8}-[0-9a-z]{4}-4[0-9a-z]{3}-[89ABab][0-9a-z]{3}-[0-9a-z]{12}/i;
    return typeof check === 'string' && uuidRegex.test(check);
};
