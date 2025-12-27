import type { IsNotNull } from '../_types';
import type { SingletonConfig } from './types';
export type { SingletonConfig, SingletonStorageStrategy } from './types';
export { SingletonProvider } from './provider';
export declare const globalSingleton: <T, S extends string | symbol = string>(symbol: S, factory: () => IsNotNull<T> | undefined, config?: SingletonConfig) => T | undefined;
export declare const globalRequiredSingleton: <T, S extends string | symbol = string>(symbol: S, factory: () => IsNotNull<T> | undefined, config?: SingletonConfig) => T;
export declare const globalSingletonAsync: <T, S extends string | symbol = string>(symbol: S, factory: () => Promise<IsNotNull<T> | undefined>, config?: SingletonConfig) => Promise<T | undefined>;
export declare const globalRequiredSingletonAsync: <T, S extends string | symbol = string>(symbol: S, factory: () => Promise<IsNotNull<T> | undefined>, config?: SingletonConfig) => Promise<T>;
//# sourceMappingURL=index.d.ts.map