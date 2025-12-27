import { IsNotNull } from '../_types';
import { SingletonConfig } from './types';
export declare class SingletonProvider {
    #private;
    static get Instance(): SingletonProvider;
    private constructor();
    get<T = unknown, S extends string | symbol = string>(symbol: S): T | undefined;
    getOrCreate<T, S extends string | symbol = string>(symbol: S, factory: () => IsNotNull<T> | undefined, config?: SingletonConfig): T | undefined;
    getRequired<T, S extends string | symbol = string>(symbol: S, factory: () => IsNotNull<T> | undefined, config?: SingletonConfig): T;
    getOrCreateAsync<T, S extends string | symbol = string>(symbol: S, factory: () => Promise<IsNotNull<T> | undefined>, config?: SingletonConfig): Promise<T | undefined>;
    getRequiredAsync<T, S extends string | symbol = string>(symbol: S, factory: () => Promise<IsNotNull<T> | undefined>, config?: SingletonConfig): Promise<T>;
    has<S extends string | symbol = string>(symbol: S): boolean;
    set<T, S extends string | symbol = string>(symbol: S, value: IsNotNull<T>, config?: SingletonConfig): void;
    clear(): void;
    delete<S extends string | symbol = string>(symbol: S): void;
}
//# sourceMappingURL=provider.d.ts.map