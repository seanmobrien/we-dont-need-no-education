/**
 * @jest-environment node
 */
/**
 * @file base-cache.test.ts
 * @description Unit tests for the InMemoryCache base class
 */

import { InMemoryCache } from '@/lib/api/health/base-cache';

describe('InMemoryCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should cache values with default TTL', () => {
    const cache = new InMemoryCache<string>();
    
    cache.set('test-value');
    expect(cache.get()).toBe('test-value');
    
    // Advance time by 59 seconds (still within default 60 second TTL)
    jest.advanceTimersByTime(59000);
    expect(cache.get()).toBe('test-value');
    
    // Advance time by 2 more seconds (past TTL)
    jest.advanceTimersByTime(2000);
    expect(cache.get()).toBeUndefined();
  });

  it('should cache values with custom TTL', () => {
    const cache = new InMemoryCache<string>({ ttlMs: 30000 }); // 30 seconds
    
    cache.set('test-value');
    expect(cache.get()).toBe('test-value');
    
    // Advance time by 29 seconds (still within TTL)
    jest.advanceTimersByTime(29000);
    expect(cache.get()).toBe('test-value');
    
    // Advance time by 2 more seconds (past TTL)
    jest.advanceTimersByTime(2000);
    expect(cache.get()).toBeUndefined();
  });

  it('should support dynamic TTL based on cached value', () => {
    interface TestValue {
      status: 'ok' | 'error';
      data: string;
    }

    const cache = new InMemoryCache<TestValue>({
      ttlMs: 60000, // Default 60 seconds
      getTtlMs: (value) => {
        // Use shorter TTL for error states
        return value.status === 'error' ? 10000 : 60000;
      },
    });
    
    // Cache an error value (should use 10 second TTL)
    cache.set({ status: 'error', data: 'error-data' });
    expect(cache.get()).toEqual({ status: 'error', data: 'error-data' });
    
    // Advance time by 9 seconds (still cached)
    jest.advanceTimersByTime(9000);
    expect(cache.get()).toEqual({ status: 'error', data: 'error-data' });
    
    // Advance time by 2 more seconds (past 10 second TTL)
    jest.advanceTimersByTime(2000);
    expect(cache.get()).toBeUndefined();
    
    // Cache an ok value (should use 60 second TTL)
    cache.set({ status: 'ok', data: 'ok-data' });
    expect(cache.get()).toEqual({ status: 'ok', data: 'ok-data' });
    
    // Advance time by 59 seconds (still cached)
    jest.advanceTimersByTime(59000);
    expect(cache.get()).toEqual({ status: 'ok', data: 'ok-data' });
    
    // Advance time by 2 more seconds (past 60 second TTL)
    jest.advanceTimersByTime(2000);
    expect(cache.get()).toBeUndefined();
  });

  it('should clear cached values', () => {
    const cache = new InMemoryCache<string>();
    
    cache.set('test-value');
    expect(cache.get()).toBe('test-value');
    
    cache.clear();
    expect(cache.get()).toBeUndefined();
  });

  it('should report stale status correctly', () => {
    const cache = new InMemoryCache<string>({ ttlMs: 30000 });
    
    // Initially stale (no value set)
    expect(cache.isStale()).toBe(true);
    
    // Not stale after setting value
    cache.set('test-value');
    expect(cache.isStale()).toBe(false);
    
    // Advance time by 29 seconds (still not stale)
    jest.advanceTimersByTime(29000);
    expect(cache.isStale()).toBe(false);
    
    // Advance time by 2 more seconds (now stale)
    jest.advanceTimersByTime(2000);
    expect(cache.isStale()).toBe(true);
  });

  it('should handle multiple set operations correctly', () => {
    const cache = new InMemoryCache<string>({ ttlMs: 30000 });
    
    // Set first value
    cache.set('first-value');
    expect(cache.get()).toBe('first-value');
    
    // Advance time by 20 seconds
    jest.advanceTimersByTime(20000);
    
    // Set second value (should reset TTL)
    cache.set('second-value');
    expect(cache.get()).toBe('second-value');
    
    // Advance time by 29 seconds (still cached because TTL was reset)
    jest.advanceTimersByTime(29000);
    expect(cache.get()).toBe('second-value');
    
    // Advance time by 2 more seconds (now expired)
    jest.advanceTimersByTime(2000);
    expect(cache.get()).toBeUndefined();
  });
});
