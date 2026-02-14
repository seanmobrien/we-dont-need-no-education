import { InMemoryCache } from '@/lib/api/health/base-cache';
describe('InMemoryCache', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it('should cache values with default TTL', () => {
        const cache = new InMemoryCache();
        cache.set('test-value');
        expect(cache.get()).toBe('test-value');
        jest.advanceTimersByTime(59000);
        expect(cache.get()).toBe('test-value');
        jest.advanceTimersByTime(2000);
        expect(cache.get()).toBeUndefined();
    });
    it('should cache values with custom TTL', () => {
        const cache = new InMemoryCache({ ttlMs: 30000 });
        cache.set('test-value');
        expect(cache.get()).toBe('test-value');
        jest.advanceTimersByTime(29000);
        expect(cache.get()).toBe('test-value');
        jest.advanceTimersByTime(2000);
        expect(cache.get()).toBeUndefined();
    });
    it('should support dynamic TTL based on cached value', () => {
        const cache = new InMemoryCache({
            ttlMs: 60000,
            getTtlMs: (value) => {
                return value.status === 'error' ? 10000 : 60000;
            },
        });
        cache.set({ status: 'error', data: 'error-data' });
        expect(cache.get()).toEqual({ status: 'error', data: 'error-data' });
        jest.advanceTimersByTime(9000);
        expect(cache.get()).toEqual({ status: 'error', data: 'error-data' });
        jest.advanceTimersByTime(2000);
        expect(cache.get()).toBeUndefined();
        cache.set({ status: 'ok', data: 'ok-data' });
        expect(cache.get()).toEqual({ status: 'ok', data: 'ok-data' });
        jest.advanceTimersByTime(59000);
        expect(cache.get()).toEqual({ status: 'ok', data: 'ok-data' });
        jest.advanceTimersByTime(2000);
        expect(cache.get()).toBeUndefined();
    });
    it('should clear cached values', () => {
        const cache = new InMemoryCache();
        cache.set('test-value');
        expect(cache.get()).toBe('test-value');
        cache.clear();
        expect(cache.get()).toBeUndefined();
    });
    it('should report stale status correctly', () => {
        const cache = new InMemoryCache({ ttlMs: 30000 });
        expect(cache.isStale()).toBe(true);
        cache.set('test-value');
        expect(cache.isStale()).toBe(false);
        jest.advanceTimersByTime(29000);
        expect(cache.isStale()).toBe(false);
        jest.advanceTimersByTime(2000);
        expect(cache.isStale()).toBe(true);
    });
    it('should handle multiple set operations correctly', () => {
        const cache = new InMemoryCache({ ttlMs: 30000 });
        cache.set('first-value');
        expect(cache.get()).toBe('first-value');
        jest.advanceTimersByTime(20000);
        cache.set('second-value');
        expect(cache.get()).toBe('second-value');
        jest.advanceTimersByTime(29000);
        expect(cache.get()).toBe('second-value');
        jest.advanceTimersByTime(2000);
        expect(cache.get()).toBeUndefined();
    });
});
//# sourceMappingURL=base-cache.test.js.map