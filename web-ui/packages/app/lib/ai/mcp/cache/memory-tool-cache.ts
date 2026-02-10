import { LRUCache } from 'lru-cache';
import { ToolCacheEntry } from './types';

/**
 * In-memory LRU cache for fastest access with TTL awareness.
 *
 * Wraps the industry-standard lru-cache npm package with a simplified
 * interface for MCP tool caching. Provides automatic eviction, TTL
 * expiration, and O(1) operations.
 */
export class MemoryToolCache {
  private cache: LRUCache<string, ToolCacheEntry>;
  private defaultTtl: number;

  constructor(maxSize: number, defaultTtl: number) {
    this.defaultTtl = defaultTtl;
    this.cache = new LRUCache<string, ToolCacheEntry>({
      max: maxSize,
      ttl: defaultTtl * 1000, // Convert seconds to milliseconds
      updateAgeOnGet: true, // LRU behavior - refresh age on access
      updateAgeOnHas: false, // Don't update age on has() checks
    });
  }

  get(key: string): ToolCacheEntry | null {
    return this.cache.get(key) ?? null;
  }

  set(key: string, entry: ToolCacheEntry, ttl?: number): void {
    const effectiveTtl = (ttl || this.defaultTtl) * 1000; // Convert seconds to milliseconds
    this.cache.set(key, entry, { ttl: effectiveTtl });
  }

  invalidateKey(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
