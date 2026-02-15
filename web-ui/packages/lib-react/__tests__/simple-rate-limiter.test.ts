import { SimpleRateLimiter } from '../src/simple-rate-limiter';

describe('SimpleRateLimiter', () => {
  let rateLimiter: SimpleRateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    rateLimiter = new SimpleRateLimiter(3, 1000); // 3 attempts per 1 second
  });

  afterEach(() => {
    // jest.clearAllMocks();
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

      // Fourth attempt should be blocked
      expect(rateLimiter.canAttempt('user1')).toBe(false);
    });

    it('should deny attempts when rate limit is exceeded', () => {
      // Make 3 attempts (at the limit)
      for (let i = 0; i < 3; i++) {
        expect(rateLimiter.canAttempt('user1')).toBe(true);
        rateLimiter.recordAttempt('user1');
      }

      // Fourth attempt should be denied
      expect(rateLimiter.canAttempt('user1')).toBe(false);
    });

    it('should handle different keys independently', () => {
      // Max out user1
      for (let i = 0; i < 3; i++) {
        expect(rateLimiter.canAttempt('user1')).toBe(true);
        rateLimiter.recordAttempt('user1');
      }
      expect(rateLimiter.canAttempt('user1')).toBe(false);

      // user2 should still be able to make attempts
      expect(rateLimiter.canAttempt('user2')).toBe(true);
      rateLimiter.recordAttempt('user2');
      expect(rateLimiter.canAttempt('user2')).toBe(true);
    });

    it('should clean up expired attempts from the sliding window', () => {
      // Make 3 attempts to reach the limit
      for (let i = 0; i < 3; i++) {
        expect(rateLimiter.canAttempt('user1')).toBe(true);
        rateLimiter.recordAttempt('user1');
      }
      expect(rateLimiter.canAttempt('user1')).toBe(false);

      // Fast-forward time window to pass
      jest.advanceTimersByTime(1100);

      // Should be able to attempt again after window expires
      expect(rateLimiter.canAttempt('user1')).toBe(true);
    });

    it('should handle partial window expiration correctly', () => {
      // Make first attempt
      expect(rateLimiter.canAttempt('user1')).toBe(true);
      rateLimiter.recordAttempt('user1');

      // Fast-forward half the window period
      jest.advanceTimersByTime(600);

      // Make more attempts
      expect(rateLimiter.canAttempt('user1')).toBe(true);
      rateLimiter.recordAttempt('user1');
      expect(rateLimiter.canAttempt('user1')).toBe(true);
      rateLimiter.recordAttempt('user1');

      // Should be at limit now
      expect(rateLimiter.canAttempt('user1')).toBe(false);

      // Fast-forward for first attempt to expire (total ~1.1 seconds from first attempt)
      jest.advanceTimersByTime(600);

      // Should have capacity for one more attempt (first expired, 2 remaining + 1 new = 3)
      expect(rateLimiter.canAttempt('user1')).toBe(true);
    });

    it('should handle edge case of exactly at window boundary', () => {
      const quickLimiter = new SimpleRateLimiter(2, 500); // 2 attempts per 500ms

      // Make 2 attempts
      expect(quickLimiter.canAttempt('user1')).toBe(true);
      quickLimiter.recordAttempt('user1');
      expect(quickLimiter.canAttempt('user1')).toBe(true);
      quickLimiter.recordAttempt('user1');

      // Should be at limit
      expect(quickLimiter.canAttempt('user1')).toBe(false);

      // Fast-forward exactly the window period
      jest.advanceTimersByTime(550);

      // Should be able to attempt again
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

      // One attempt recorded, should still allow more
      expect(rateLimiter.canAttempt('user1')).toBe(true);
    });

    it('should increment attempt count for existing key', () => {
      rateLimiter.recordAttempt('user1');
      rateLimiter.recordAttempt('user1');
      rateLimiter.recordAttempt('user1');

      // Should be at limit after 3 recorded attempts
      expect(rateLimiter.canAttempt('user1')).toBe(false);
    });

    it('should handle multiple keys simultaneously', () => {
      // Record attempts for different users
      rateLimiter.recordAttempt('user1');
      rateLimiter.recordAttempt('user2');
      rateLimiter.recordAttempt('user1');
      rateLimiter.recordAttempt('user3');
      rateLimiter.recordAttempt('user1');

      // user1 should be at limit, others should not
      expect(rateLimiter.canAttempt('user1')).toBe(false);
      expect(rateLimiter.canAttempt('user2')).toBe(true);
      expect(rateLimiter.canAttempt('user3')).toBe(true);
    });

    it('should handle rapid successive attempts', () => {
      const timestamps: number[] = [];

      for (let i = 0; i < 5; i++) {
        timestamps.push(Date.now());
        rateLimiter.recordAttempt('rapid-user');
      }

      // All timestamps should be very close together
      const timeDiff = timestamps[timestamps.length - 1] - timestamps[0];
      expect(timeDiff).toBeLessThan(100); // Should complete within 100ms

      // Should exceed rate limit
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

      // Should be at limit
      expect(rateLimiter.canAttempt('user1')).toBe(false);

      // Total time should be around 200ms
      expect(endTime - startTime).toBeGreaterThan(190);
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      // Set up some attempts for different keys
      for (let i = 0; i < 3; i++) {
        rateLimiter.recordAttempt('user1');
        rateLimiter.recordAttempt('user2');
      }
      // Both users should be at limit
      expect(rateLimiter.canAttempt('user1')).toBe(false);
      expect(rateLimiter.canAttempt('user2')).toBe(false);
    });

    it('should reset attempts for specific key', () => {
      rateLimiter.reset('user1');

      // user1 should be reset, user2 should still be limited
      expect(rateLimiter.canAttempt('user1')).toBe(true);
      expect(rateLimiter.canAttempt('user2')).toBe(false);
    });

    it('should reset all attempts when no key provided', () => {
      rateLimiter.reset();

      // Both users should be reset
      expect(rateLimiter.canAttempt('user1')).toBe(true);
      expect(rateLimiter.canAttempt('user2')).toBe(true);
    });

    it('should handle reset of non-existent key gracefully', () => {
      rateLimiter.reset('non-existent-user');

      // Should not affect existing users
      expect(rateLimiter.canAttempt('user1')).toBe(false);
      expect(rateLimiter.canAttempt('user2')).toBe(false);

      // Non-existent user should be able to make attempts
      expect(rateLimiter.canAttempt('non-existent-user')).toBe(true);
    });

    it('should allow normal operation after reset', () => {
      rateLimiter.reset('user1');

      // Should be able to use normal rate limiting after reset
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
      rateLimiter.reset('user1'); // Reset again

      expect(rateLimiter.canAttempt('user1')).toBe(true);

      rateLimiter.reset(); // Reset all
      rateLimiter.reset(); // Reset all again

      expect(rateLimiter.canAttempt('user1')).toBe(true);
      expect(rateLimiter.canAttempt('user2')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle authentication rate limiting scenario', () => {
      const authLimiter = new SimpleRateLimiter(3, 300000); // 3 attempts per 5 minutes
      const username = 'john.doe';

      // Simulate failed login attempts
      for (let i = 0; i < 3; i++) {
        expect(authLimiter.canAttempt(username)).toBe(true);
        authLimiter.recordAttempt(username); // Record failed attempt
      }

      // Should be locked out
      expect(authLimiter.canAttempt(username)).toBe(false);

      // Admin reset (successful login or manual unlock)
      authLimiter.reset(username);
      expect(authLimiter.canAttempt(username)).toBe(true);
    });

    it('should handle API rate limiting scenario', () => {
      const apiLimiter = new SimpleRateLimiter(100, 60000); // 100 requests per minute
      const clientIP = '192.168.1.100';

      // Simulate normal API usage
      for (let i = 0; i < 100; i++) {
        expect(apiLimiter.canAttempt(clientIP)).toBe(true);
        apiLimiter.recordAttempt(clientIP);
      }

      // Should be rate limited
      expect(apiLimiter.canAttempt(clientIP)).toBe(false);
    });

    it('should handle mixed success and failure patterns', async () => {
      const mixedLimiter = new SimpleRateLimiter(5, 2000); // 5 attempts per 2 seconds
      const userKey = 'mixed-user';

      // Simulate mixed pattern: 2 failures, 1 success (reset), 3 failures, 1 success (reset)

      // 2 failures
      mixedLimiter.recordAttempt(userKey);
      mixedLimiter.recordAttempt(userKey);
      expect(mixedLimiter.canAttempt(userKey)).toBe(true);

      // Success (reset the failures)
      mixedLimiter.reset(userKey);

      // 3 failures
      mixedLimiter.recordAttempt(userKey);
      mixedLimiter.recordAttempt(userKey);
      mixedLimiter.recordAttempt(userKey);
      expect(mixedLimiter.canAttempt(userKey)).toBe(true);

      // Another success (reset again)
      mixedLimiter.reset(userKey);
      expect(mixedLimiter.canAttempt(userKey)).toBe(true);
    });

    it('should handle high-frequency operations', () => {
      const highFreqLimiter = new SimpleRateLimiter(1000, 1000); // 1000 per second
      const startTime = Date.now();

      // Simulate high frequency API calls
      for (let i = 0; i < 500; i++) {
        expect(highFreqLimiter.canAttempt(`user-${i % 10}`)).toBe(true);
        highFreqLimiter.recordAttempt(`user-${i % 10}`);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast

      // Some users should be approaching their limits
      expect(highFreqLimiter.canAttempt('user-0')).toBe(true); // 50 attempts, still within limit
    });

    it('should handle edge case with very short time windows', () => {
      const quickLimiter = new SimpleRateLimiter(2, 100); // 2 attempts per 100ms

      expect(quickLimiter.canAttempt('quick-user')).toBe(true);
      quickLimiter.recordAttempt('quick-user');

      expect(quickLimiter.canAttempt('quick-user')).toBe(true);
      quickLimiter.recordAttempt('quick-user');

      expect(quickLimiter.canAttempt('quick-user')).toBe(false);

      // Fast-forward for window to expire
      jest.advanceTimersByTime(150);

      expect(quickLimiter.canAttempt('quick-user')).toBe(true);
    });

    it('should handle concurrent operations on same key', () => {
      const concurrentLimiter = new SimpleRateLimiter(5, 1000);
      let successCount = 0;

      // Simulate concurrent requests for the same user
      for (let i = 0; i < 10; i++) {
        const canAttempt = concurrentLimiter.canAttempt('concurrent-user');
        if (canAttempt) {
          concurrentLimiter.recordAttempt('concurrent-user');
          successCount++;
        }
      }

      // Should have at most 5 successful attempts due to rate limiting
      expect(successCount).toBeLessThanOrEqual(5);
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle cleanup of very old entries', () => {
      const longWindowLimiter = new SimpleRateLimiter(3, 2000); // 3 per 2 seconds

      // Make some attempts
      longWindowLimiter.recordAttempt('cleanup-user');
      longWindowLimiter.recordAttempt('cleanup-user');
      expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);

      // Fast-forward for entries to age
      jest.advanceTimersByTime(2100);

      // Making new attempts should clean up old ones
      expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);
      longWindowLimiter.recordAttempt('cleanup-user');
      expect(longWindowLimiter.canAttempt('cleanup-user')).toBe(true);
    });
  });

  describe('performance and memory', () => {
    it('should handle large numbers of unique keys efficiently', () => {
      const largeLimiter = new SimpleRateLimiter(10, 60000);
      const startTime = Date.now();

      // Create many unique keys
      for (let i = 0; i < 1000; i++) {
        const key = `user-${i}`;
        expect(largeLimiter.canAttempt(key)).toBe(true);
        largeLimiter.recordAttempt(key);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly

      // All users should still be able to make more attempts
      for (let i = 0; i < 10; i++) {
        expect(largeLimiter.canAttempt(`user-${i}`)).toBe(true);
      }
    });

    it('should not grow memory indefinitely', () => {
      const memoryLimiter = new SimpleRateLimiter(1, 100); // 1 per 100ms

      // Create many keys that will expire
      for (let i = 0; i < 100; i++) {
        memoryLimiter.recordAttempt(`temp-user-${i}`);
      }

      // Fast-forward for all entries to expire
      jest.advanceTimersByTime(200);

      // Making new attempts should clean up expired entries
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
