export class WeakReferenceStorage {
    #refs = new Map();
    get(key) {
        const ref = this.#refs.get(key);
        const value = ref?.deref();
        if (value === undefined) {
            this.#refs.delete(key);
        }
        return value;
    }
    set(key, value) {
        if (typeof value !== 'object' || value === null) {
            throw new TypeError('Weak reference singletons require a non-null object value.');
        }
        this.#refs.set(key, new WeakRef(value));
    }
    has(key) {
        const ref = this.#refs.get(key);
        const value = ref?.deref();
        if (value === undefined) {
            this.#refs.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        this.#refs.delete(key);
    }
    clear() {
        this.#refs.clear();
    }
}
