import { ToolCacheEntry } from './types';

/**
 * In-memory LRU cache for fastest access with TTL awareness
 */
export class MemoryToolCache {
  private cache = new Map<string, ToolCacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private ttlTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private maxSize: number,
    private defaultTtl: number,
  ) {}

  get(key: string): ToolCacheEntry | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.accessOrder.set(key, ++this.accessCounter);
      return entry;
    }
    return null;
  }

  set(key: string, entry: ToolCacheEntry, ttl?: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.removeEntry(oldestKey);
      }
    }

    // Clear existing timer if updating entry
    this.clearTtlTimer(key);

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    // Set TTL timer for automatic expiration
    const effectiveTtl = ttl || this.defaultTtl;
    const timer = setTimeout(() => {
      this.removeEntry(key);
    }, effectiveTtl * 1000);

    this.ttlTimers.set(key, timer);
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private removeEntry(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    this.clearTtlTimer(key);
  }

  private clearTtlTimer(key: string): void {
    const timer = this.ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(key);
    }
  }

  invalidateKey(key: string): void {
    this.removeEntry(key);
  }

  clear(): void {
    // Clear all timers first
    for (const timer of this.ttlTimers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.accessOrder.clear();
    this.ttlTimers.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }
}
