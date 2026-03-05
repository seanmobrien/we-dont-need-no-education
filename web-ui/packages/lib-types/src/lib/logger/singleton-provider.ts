import { IsNotNull } from "src/types/is-not-null";

export type ISingletonProvider = {
    get<T = unknown, S extends string | symbol = string>(symbol: S): T | undefined;
    getOrCreate<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => IsNotNull<T> | undefined,
        config?: unknown
    ): T | undefined;
    getRequired<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => IsNotNull<T> | undefined,
        config?: unknown
    ): T;
    getOrCreateAsync<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => Promise<IsNotNull<T> | undefined>,
        config?: unknown
    ): Promise<T | undefined>;
    getRequiredAsync<T, S extends string | symbol = string>(
        symbol: S,
        factory: () => Promise<IsNotNull<T> | undefined>,
        config?: unknown
    ): Promise<T>;
    has<S extends string | symbol = string>(symbol: S): boolean;
    set<T, S extends string | symbol = string>(
        symbol: S,
        value: IsNotNull<T>,
        config?: unknown
    ): void;
    clear(): void;
    delete<S extends string | symbol = string>(symbol: S): void;
};