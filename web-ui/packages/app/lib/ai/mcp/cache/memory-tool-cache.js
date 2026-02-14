import { LRUCache } from 'lru-cache';
export class MemoryToolCache {
    cache;
    defaultTtl;
    constructor(maxSize, defaultTtl) {
        this.defaultTtl = defaultTtl;
        this.cache = new LRUCache({
            max: maxSize,
            ttl: defaultTtl * 1000,
            updateAgeOnGet: true,
            updateAgeOnHas: false,
        });
    }
    get(key) {
        return this.cache.get(key) ?? null;
    }
    set(key, entry, ttl) {
        const effectiveTtl = (ttl || this.defaultTtl) * 1000;
        this.cache.set(key, entry, { ttl: effectiveTtl });
    }
    invalidateKey(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
//# sourceMappingURL=memory-tool-cache.js.map