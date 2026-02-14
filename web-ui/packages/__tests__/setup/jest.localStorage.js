"use strict";
class InMemoryStorage {
    store = {};
    get length() {
        return Object.keys(this.store).length;
    }
    clear() {
        this.store = {};
    }
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key)
            ? this.store[key]
            : null;
    }
    key(index) {
        const keys = Object.keys(this.store);
        return index >= 0 && index < keys.length ? keys[index] : null;
    }
    removeItem(key) {
        delete this.store[key];
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
}
const createLocalStorageMock = () => new InMemoryStorage();
beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
        value: createLocalStorageMock(),
        configurable: true,
        writable: true,
    });
});
//# sourceMappingURL=jest.localStorage.js.map