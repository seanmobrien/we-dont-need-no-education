export class InMemoryCache {
    ttlMs;
    getTtlMs;
    value;
    expiresAt = null;
    constructor(config = {}) {
        this.ttlMs = config.ttlMs ?? 60 * 1000;
        this.getTtlMs = config.getTtlMs;
    }
    now() {
        return Date.now();
    }
    get() {
        if (this.expiresAt === null)
            return undefined;
        if (this.now() > this.expiresAt) {
            this.clear();
            return undefined;
        }
        return this.value;
    }
    set(v) {
        this.value = v;
        const ttl = this.getTtlMs ? this.getTtlMs(v) : this.ttlMs;
        this.expiresAt = this.now() + ttl;
    }
    clear() {
        this.value = undefined;
        this.expiresAt = null;
    }
    isStale() {
        if (this.expiresAt === null)
            return true;
        return this.now() > this.expiresAt;
    }
}
export default InMemoryCache;
//# sourceMappingURL=base-cache.js.map