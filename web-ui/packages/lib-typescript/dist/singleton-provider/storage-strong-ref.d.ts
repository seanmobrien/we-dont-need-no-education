import { SingletonStorageKey, SingletonStorageStrategy } from './types';
export declare class StrongReferenceStorage implements SingletonStorageStrategy {
    #private;
    get(key: SingletonStorageKey): unknown | undefined;
    set(key: SingletonStorageKey, value: unknown): void;
    has(key: SingletonStorageKey): boolean;
    delete(key: SingletonStorageKey): void;
    clear(): void;
}
//# sourceMappingURL=storage-strong-ref.d.ts.map