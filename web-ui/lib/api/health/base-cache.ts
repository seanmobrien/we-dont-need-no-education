/**
 * Generic in-memory cache base class.
 * Provides a simple TTL-based cache with a configurable timeout.
 */
export type CacheConfig = {
  ttlMs?: number; // time-to-live in milliseconds
};

export class InMemoryCache<T> {
  private ttlMs: number;
  private value: T | undefined;
  private expiresAt: number | null = null;

  constructor(config: CacheConfig = {}) {
    this.ttlMs = config.ttlMs ?? 60 * 1000; // default 1 minute
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
    this.expiresAt = this.now() + this.ttlMs;
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
