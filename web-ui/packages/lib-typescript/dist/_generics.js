import { isPromise } from "./_guards";
export const forOneOrMany = (forOne, input) => {
    if (Array.isArray(input)) {
        return input.map(forOne);
    }
    return forOne(input);
};
export const serviceInstanceOverloadsFactory = (serviceFactory) => (callback) => {
    if (typeof callback === 'function') {
        return callback(serviceFactory());
    }
    return serviceFactory();
};
export const unwrapPromise = async (value) => {
    let res = value;
    while (res && isPromise(res)) {
        res = await res;
    }
    return res;
};
