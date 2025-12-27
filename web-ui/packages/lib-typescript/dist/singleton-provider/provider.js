import { StrongReferenceStorage } from './storage-strong-ref';
import { WeakReferenceStorage } from './storage-weak-refs';
export class SingletonProvider {
    #strongStorage = new StrongReferenceStorage();
    #weakStorage = new WeakReferenceStorage();
    #storageByKey = new Map();
    #pendingFactories = new Map();
    static get Instance() {
        const globalSymbol = Symbol.for('@noeducation/lib/typescript/SingletonProvider');
        const globalWithProvider = globalThis;
        if (!globalWithProvider[globalSymbol]) {
            globalWithProvider[globalSymbol] = new SingletonProvider();
        }
        return globalWithProvider[globalSymbol];
    }
    constructor() {
    }
    #toStorageKey(symbol) {
        return typeof symbol === 'symbol' ? symbol : Symbol.for(symbol);
    }
    #selectStorage(config) {
        return config?.weakRef ? this.#weakStorage : this.#strongStorage;
    }
    #ensureWeakValue(value) {
        if (typeof value !== 'object' || value === null) {
            throw new TypeError('Weak reference singletons require a non-null object value.');
        }
    }
    #lookupExisting(key) {
        const preferred = this.#storageByKey.get(key);
        if (preferred) {
            const result = preferred.get(key);
            if (result !== undefined) {
                return result;
            }
            this.#storageByKey.delete(key);
        }
        const strong = this.#strongStorage.get(key);
        if (strong !== undefined) {
            this.#storageByKey.set(key, this.#strongStorage);
            return strong;
        }
        const weak = this.#weakStorage.get(key);
        if (weak !== undefined) {
            this.#storageByKey.set(key, this.#weakStorage);
            return weak;
        }
        return undefined;
    }
    #store(key, storage, value) {
        if (storage === this.#weakStorage) {
            this.#ensureWeakValue(value);
            this.#strongStorage.delete(key);
        }
        else {
            this.#weakStorage.delete(key);
        }
        storage.set(key, value);
        this.#storageByKey.set(key, storage);
    }
    get(symbol) {
        const key = this.#toStorageKey(symbol);
        return this.#lookupExisting(key);
    }
    getOrCreate(symbol, factory, config = {}) {
        const key = this.#toStorageKey(symbol);
        const existing = this.#lookupExisting(key);
        if (existing !== undefined) {
            return existing;
        }
        const value = factory();
        if (value === undefined) {
            return value;
        }
        if (value === null) {
            throw new TypeError('Factory for global singleton cannot return null or undefined.');
        }
        const storage = this.#selectStorage(config);
        this.#store(key, storage, value);
        return value;
    }
    getRequired(symbol, factory, config = {}) {
        const ret = this.getOrCreate(symbol, factory, config);
        if (typeof ret === 'undefined' || ret === null) {
            throw new TypeError(`Unexpected error creating required singleton ${String(symbol)}`);
        }
        return ret;
    }
    async getOrCreateAsync(symbol, factory, config = {}) {
        const key = this.#toStorageKey(symbol);
        const existing = this.#lookupExisting(key);
        if (existing !== undefined) {
            return existing;
        }
        const pendingFactory = this.#pendingFactories.get(key);
        if (pendingFactory) {
            return pendingFactory;
        }
        const factoryPromise = (async () => {
            try {
                const value = await factory();
                if (!value) {
                    return undefined;
                }
                const storage = this.#selectStorage(config);
                this.#store(key, storage, value);
                return value;
            }
            finally {
                this.#pendingFactories.delete(key);
            }
        })();
        this.#pendingFactories.set(key, factoryPromise);
        return await factoryPromise;
    }
    async getRequiredAsync(symbol, factory, config = {}) {
        const ret = await this.getOrCreateAsync(symbol, factory, config);
        if (typeof ret === 'undefined' || ret === null) {
            throw new TypeError(`Unexpected error creating required singleton ${String(symbol)}`);
        }
        return ret;
    }
    has(symbol) {
        const key = this.#toStorageKey(symbol);
        const preferred = this.#storageByKey.get(key);
        if (preferred?.has(key)) {
            return true;
        }
        this.#storageByKey.delete(key);
        if (this.#strongStorage.has(key)) {
            this.#storageByKey.set(key, this.#strongStorage);
            return true;
        }
        if (this.#weakStorage.has(key)) {
            this.#storageByKey.set(key, this.#weakStorage);
            return true;
        }
        return false;
    }
    set(symbol, value, config = {}) {
        if (value === null || value === undefined) {
            throw new TypeError('Cannot set singleton value to null or undefined.');
        }
        const key = this.#toStorageKey(symbol);
        const storage = this.#selectStorage(config);
        this.#store(key, storage, value);
    }
    clear() {
        this.#strongStorage.clear();
        this.#weakStorage.clear();
        this.#storageByKey.clear();
    }
    delete(symbol) {
        const key = this.#toStorageKey(symbol);
        this.#strongStorage.delete(key);
        this.#weakStorage.delete(key);
        this.#storageByKey.delete(key);
    }
}
