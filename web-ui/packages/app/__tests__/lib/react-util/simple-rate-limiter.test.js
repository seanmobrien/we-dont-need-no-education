import { SimpleRateLimiter } from '@/lib/react-util/simple-rate-limiter';
describe('SimpleRateLimiter', () => {
    let rateLimiter;
    beforeEach(() => {
        jest.useFakeTimers();
        rateLimiter = new SimpleRateLimiter(3, 1000);
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    describe('constructor', () => {
        it('should create instance with default values', () => {
            const defaultLimiter = new SimpleRateLimiter();
            expect(defaultLimiter.canAttempt('test-key')).toBe(true);
        });
        it('should create instance with custom values', () => {
            const customLimiter = new SimpleRateLimiter(10, 5000);
            expect(customLimiter.canAttempt('test-key')).toBe(true);
        });
    });
    describe('canAttempt', () => {
        it('should allow attempts when no previous attempts exist', () => {
            expect(rateLimiter.canAttempt('new-key')).toBe(true);
        });
        it('should allow attempts when within rate limit', () => {
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
        });
        it('should deny attempts when rate limit is exceeded', () => {
            for (let i = 0; i < 3; i++) {
                expect(rateLimiter.canAttempt('user1')).toBe(true);
                rateLimiter.recordAttempt('user1');
            }
            expect(rateLimiter.canAttempt('user1')).toBe(false);
        });
        it('should handle different keys independently', () => {
            for (let i = 0; i < 3; i++) {
                expect(rateLimiter.canAttempt('user1')).toBe(true);
                rateLimiter.recordAttempt('user1');
            }
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            expect(rateLimiter.canAttempt('user2')).toBe(true);
            rateLimiter.recordAttempt('user2');
            expect(rateLimiter.canAttempt('user2')).toBe(true);
        });
        it('should clean up expired attempts from the sliding window', () => {
            for (let i = 0; i < 3; i++) {
                expect(rateLimiter.canAttempt('user1')).toBe(true);
                rateLimiter.recordAttempt('user1');
            }
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            jest.advanceTimersByTime(1100);
            expect(rateLimiter.canAttempt('user1')).toBe(true);
        });
        it('should handle partial window expiration correctly', () => {
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            jest.advanceTimersByTime(600);
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            jest.advanceTimersByTime(600);
            expect(rateLimiter.canAttempt('user1')).toBe(true);
        });
        it('should handle edge case of exactly at window boundary', () => {
            const quickLimiter = new SimpleRateLimiter(2, 500);
            expect(quickLimiter.canAttempt('user1')).toBe(true);
            quickLimiter.recordAttempt('user1');
            expect(quickLimiter.canAttempt('user1')).toBe(true);
            quickLimiter.recordAttempt('user1');
            expect(quickLimiter.canAttempt('user1')).toBe(false);
            jest.advanceTimersByTime(550);
            expect(quickLimiter.canAttempt('user1')).toBe(true);
        });
        it('should handle zero rate limit correctly', () => {
            const strictLimiter = new SimpleRateLimiter(0, 1000);
            expect(strictLimiter.canAttempt('user1')).toBe(false);
        });
        it('should handle single attempt rate limit', () => {
            const singleLimiter = new SimpleRateLimiter(1, 1000);
            expect(singleLimiter.canAttempt('user1')).toBe(true);
            singleLimiter.recordAttempt('user1');
            expect(singleLimiter.canAttempt('user1')).toBe(false);
        });
    });
    describe('recordAttempt', () => {
        it('should record attempt for new key', () => {
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
        });
        it('should increment attempt count for existing key', () => {
            rateLimiter.recordAttempt('user1');
            rateLimiter.recordAttempt('user1');
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
        });
        it('should handle multiple keys simultaneously', () => {
            rateLimiter.recordAttempt('user1');
            rateLimiter.recordAttempt('user2');
            rateLimiter.recordAttempt('user1');
            rateLimiter.recordAttempt('user3');
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            expect(rateLimiter.canAttempt('user2')).toBe(true);
            expect(rateLimiter.canAttempt('user3')).toBe(true);
        });
        it('should handle rapid successive attempts', () => {
            const timestamps = [];
            for (let i = 0; i < 5; i++) {
                timestamps.push(Date.now());
                rateLimiter.recordAttempt('rapid-user');
            }
            const timeDiff = timestamps[timestamps.length - 1] - timestamps[0];
            expect(timeDiff).toBeLessThan(100);
            expect(rateLimiter.canAttempt('rapid-user')).toBe(false);
        });
        it('should record attempts with accurate timestamps', () => {
            const startTime = Date.now();
            rateLimiter.recordAttempt('user1');
            jest.advanceTimersByTime(100);
            rateLimiter.recordAttempt('user1');
            jest.advanceTimersByTime(100);
            rateLimiter.recordAttempt('user1');
            const endTime = Date.now();
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            expect(endTime - startTime).toBeGreaterThan(190);
            expect(endTime - startTime).toBeLessThan(300);
        });
    });
    describe('reset', () => {
        beforeEach(() => {
            for (let i = 0; i < 3; i++) {
                rateLimiter.recordAttempt('user1');
                rateLimiter.recordAttempt('user2');
            }
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            expect(rateLimiter.canAttempt('user2')).toBe(false);
        });
        it('should reset attempts for specific key', () => {
            rateLimiter.reset('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            expect(rateLimiter.canAttempt('user2')).toBe(false);
        });
        it('should reset all attempts when no key provided', () => {
            rateLimiter.reset();
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            expect(rateLimiter.canAttempt('user2')).toBe(true);
        });
        it('should handle reset of non-existent key gracefully', () => {
            rateLimiter.reset('non-existent-user');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
            expect(rateLimiter.canAttempt('user2')).toBe(false);
            expect(rateLimiter.canAttempt('non-existent-user')).toBe(true);
        });
        it('should allow normal operation after reset', () => {
            rateLimiter.reset('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.recordAttempt('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(false);
        });
        it('should handle multiple resets correctly', () => {
            rateLimiter.reset('user1');
            rateLimiter.reset('user1');
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            rateLimiter.reset();
            rateLimiter.reset();
            expect(rateLimiter.canAttempt('user1')).toBe(true);
            expect(rateLimiter.canAttempt('user2')).toBe(true);
        });
    });
    describe('integration scenarios', () => {
        it('should handle authentication rate limiting scenario', () => {
            const authLimiter = new SimpleRateLimiter(3, 300000);
            const username = 'john.doe';
            for (let i = 0; i < 3; i++) {
                expect(authLimiter.canAttempt(username)).toBe(true);
                authLimiter.recordAttempt(username);
            }
            expect(authLimiter.canAttempt(username)).toBe(false);
            authLimiter.reset(username);
            expect(authLimiter.canAttempt(username)).toBe(true);
        });
        it('should handle API rate limiting scenario', () => {
            const apiLimiter = new SimpleRateLimiter(100, 60000);
            const clientIP = '192.168.1.100';
            for (let i = 0; i < 100; i++) {
                expect(apiLimiter.canAttempt(clientIP)).toBe(true);
                apiLimiter.recordAttempt(clientIP);
            }
            expect(apiLimiter.canAttempt(clientIP)).toBe(false);
        });
        it('should handle mixed success and failure patterns', async () => {
            const mixedLimiter = new SimpleRateLimiter(5, 2000);
            const userKey = 'mixed-user';
            mixedLimiter.recordAttempt(userKey);
            mixedLimiter.recordAttempt(userKey);
            expect(mixedLimiter.canAttempt(userKey)).toBe(true);
            mixedLimiter.reset(userKey);
            mixedLimiter.recordAttempt(userKey);
            mixedLimiter.recordAttempt(userKey);
            mixedLimiter.recordAttempt(userKey);
            expect(mixedLimiter.canAttempt(userKey)).toBe(true);
            mixedLimiter.reset(userKey);
            expect(mixedLimiter.canAttempt(userKey)).toBe(true);
        });
        it('should handle high-frequency operations', () => {
            const highFreqLimiter = new SimpleRateLimiter(1000, 1000);
            const startTime = Date.now();
            for (let i = 0; i < 500; i++) {
                expect(highFreqLimiter.canAttempt(`user-${i % 10}`)).toBe(true);
                highFreqLimiter.recordAttempt(`user-${i % 10}`);
            }
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000);
            expect(highFreqLimiter.canAttempt('user-0')).toBe(true);
        });
        it('should handle edge case with very short time windows', () => {
            const quickLimiter = new SimpleRateLimiter(2, 100);
            expect(quickLimiter.canAttempt('quick-user')).toBe(true);
            quickLimiter.recordAttempt('quick-user');
            expect(quickLimiter.canAttempt('quick-user')).toBe(true);
            quickLimiter.recordAttempt('quick-user');
            expect(quickLimiter.canAttempt('quick-user')).toBe(false);
            jest.advanceTimersByTime(150);
            expect(quickLimiter.canAttempt('quick-user')).toBe(true);
        });
        it('should handle concurrent operations on same key', () => {
            const concurrentLimiter = new SimpleRateLimiter(5, 1000);
            let successCount = 0;
            for (let i = 0; i < 10; i++) {
                const canAttempt = concurrentLimiter.canAttempt('concurrent-user');
                if (canAttempt) {
                    concurrentLimiter.recordAttempt('concurrent-user');
                    successCount++;
                }
            }
            expect(successCount).toBeLessThanOrEqual(5);
            expect(successCount).toBeGreaterThan(0);
        });
        it('should handle cleanup of very old entries', () => {
            const longWindowLimiter = new SimpleRateLimiter(3, 2000);
            longWindowLimiter.recordAttempt('cleanup-user');
            longWindowLimiter.recordAttempt('cleanup-user');
            expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);
            jest.advanceTimersByTime(2100);
            expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);
            longWindowLimiter.recordAttempt('cleanup-user');
            expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);
        });
    });
    describe('performance and memory', () => {
        it('should handle large numbers of unique keys efficiently', () => {
            const largeLimiter = new SimpleRateLimiter(10, 60000);
            const startTime = Date.now();
            for (let i = 0; i < 1000; i++) {
                const key = `user-${i}`;
                expect(largeLimiter.canAttempt(key)).toBe(true);
                largeLimiter.recordAttempt(key);
            }
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000);
            for (let i = 0; i < 10; i++) {
                expect(largeLimiter.canAttempt(`user-${i}`)).toBe(true);
            }
        });
        it('should not grow memory indefinitely', () => {
            const memoryLimiter = new SimpleRateLimiter(1, 100);
            for (let i = 0; i < 100; i++) {
                memoryLimiter.recordAttempt(`temp-user-${i}`);
            }
            jest.advanceTimersByTime(200);
            for (let i = 0; i < 10; i++) {
                expect(memoryLimiter.canAttempt(`temp-user-${i}`)).toBe(true);
            }
        });
    });
    describe('edge cases and error conditions', () => {
        it('should handle empty string keys', () => {
            expect(rateLimiter.canAttempt('')).toBe(true);
            rateLimiter.recordAttempt('');
            expect(rateLimiter.canAttempt('')).toBe(true);
        });
        it('should handle special character keys', () => {
            const specialKeys = [
                'user@domain.com',
                'user-123',
                'user_name',
                '192.168.1.1',
                'αβγ',
            ];
            specialKeys.forEach((key) => {
                expect(rateLimiter.canAttempt(key)).toBe(true);
                rateLimiter.recordAttempt(key);
                expect(rateLimiter.canAttempt(key)).toBe(true);
            });
        });
        it('should handle very long keys', () => {
            const longKey = 'a'.repeat(1000);
            expect(rateLimiter.canAttempt(longKey)).toBe(true);
            rateLimiter.recordAttempt(longKey);
            expect(rateLimiter.canAttempt(longKey)).toBe(true);
        });
        it('should handle keys with various data types as strings', () => {
            const keys = ['123', 'true', 'null', 'undefined', '{"object": "key"}'];
            keys.forEach((key) => {
                expect(rateLimiter.canAttempt(key)).toBe(true);
                rateLimiter.recordAttempt(key);
            });
        });
    });
});
//# sourceMappingURL=simple-rate-limiter.test.js.map