import { SingletonProvider } from './provider';
export { SingletonProvider } from './provider';
export const globalSingleton = (symbol, factory, config = {}) => SingletonProvider.Instance.getOrCreate(symbol, factory, config);
export const globalRequiredSingleton = (symbol, factory, config = {}) => {
    const ret = globalSingleton(symbol, factory, config);
    if (typeof ret === 'undefined' || ret == null) {
        throw new TypeError(`Unable to create required global ${symbol.toString()}`);
    }
    return ret;
};
export const globalSingletonAsync = (symbol, factory, config = {}) => SingletonProvider.Instance.getOrCreateAsync(symbol, factory, config);
export const globalRequiredSingletonAsync = async (symbol, factory, config = {}) => {
    const ret = await globalSingletonAsync(symbol, factory, config);
    if (typeof ret === 'undefined' || ret == null) {
        throw new TypeError(`Unable to create required global ${symbol.toString()}`);
    }
    return ret;
};
