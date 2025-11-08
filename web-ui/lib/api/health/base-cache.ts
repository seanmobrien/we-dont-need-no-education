/**
 * Generic in-memory cache base class.
 * Provides a simple TTL-based cache with a configurable timeout.
 */
export type CacheConfig<T = unknown> = {
  ttlMs?: number; // time-to-live in milliseconds
  getTtlMs?: (value: T) => number; // optional function to determine TTL based on cached value
};

export class InMemoryCache<T> {
  private ttlMs: number;
  private getTtlMs?: (value: T) => number;
  private value: T | undefined;
  private expiresAt: number | null = null;

  constructor(config: CacheConfig<T> = {}) {
    this.ttlMs = config.ttlMs ?? 60 * 1000; // default 1 minute
    this.getTtlMs = config.getTtlMs;
  }

  protected now() {
    return Date.now();
  }

  get(): T | undefined {
    if (this.expiresAt === null) return undefined;
    if (this.now() > this.expiresAt) {
      this.clear();
      return undefined;
    }
    return this.value;
  }

  set(v: T) {
    this.value = v;
    // Use custom TTL function if provided, otherwise use default TTL
    const ttl = this.getTtlMs ? this.getTtlMs(v) : this.ttlMs;
    this.expiresAt = this.now() + ttl;
  }

  clear() {
    this.value = undefined;
    this.expiresAt = null;
  }

  isStale(): boolean {
    if (this.expiresAt === null) return true;
    return this.now() > this.expiresAt;
  }
}

export default InMemoryCache;
