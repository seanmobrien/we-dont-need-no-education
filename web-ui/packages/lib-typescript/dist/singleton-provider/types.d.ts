export type SingletonConfig = {
    weakRef?: boolean;
};
export type SingletonStorageKey = symbol;
export interface SingletonStorageStrategy {
    get(key: SingletonStorageKey): unknown | undefined;
    set(key: SingletonStorageKey, value: unknown): void;
    has(key: SingletonStorageKey): boolean;
    delete(key: SingletonStorageKey): void;
    clear(): void;
}
export type GlobalWithMyGlobal<T, S extends symbol> = typeof globalThis & {
    [K in S]?: T;
};
//# sourceMappingURL=types.d.ts.map