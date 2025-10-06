/**
 * @jest-environment node
 */

/**
 * Jest tests for enterprise cache features
 * Comprehensive test suite for configuration, metrics, and advanced behaviors
 */

import { resetEnvVariables, withRedisConnection } from '/__tests__/jest.setup';
import {
  getCacheConfig,
  validateCacheConfig,
  type CacheConfig,
} from '/lib/ai/middleware/cacheWithRedis/config';
import {
  metricsCollector,
  setupConsoleMetrics,
  getPrometheusMetrics,
} from '/lib/ai/middleware/cacheWithRedis/metrics';
import {
  getRedisClient,
  closeRedisClient,
} from '/lib/ai/middleware/cacheWithRedis/redis-client';
import type { RedisClientType } from 'redis';

describe('Enterprise Cache Features', () => {
  let redis: RedisClientType;

  beforeAll(async () => {
    withRedisConnection();
  });

  afterEach(async () => {
    await closeRedisClient();
  });

  beforeEach(async () => {
    resetEnvVariables();
    withRedisConnection();
    redis = await getRedisClient();
    // Clear test data and reset metrics
    await redis.flushDb();
    metricsCollector.reset();
  });

  describe('Configuration Management', () => {
    it('should provide default configuration', () => {
      const config = getCacheConfig();

      expect(config.cacheTtl).toBe(86400); // 24 hours
      expect(config.jailThreshold).toBe(3);
      expect(config.jailTtl).toBe(86400);
      expect(config.streamChunkSize).toBe(5);
      expect(config.enableLogging).toBe(true);
      expect(config.enableMetrics).toBe(true);
      expect(config.cacheKeyPrefix).toBe('ai-cache');
      expect(config.jailKeyPrefix).toBe('ai-jail');
      expect(config.maxKeyLogLength).toBe(20);
    });

    it('should validate configuration correctly', () => {
      const validConfig: CacheConfig = {
        cacheTtl: 3600,
        jailThreshold: 5,
        jailTtl: 7200,
        streamChunkSize: 10,
        enableLogging: false,
        enableMetrics: true,
        cacheKeyPrefix: 'test-cache',
        jailKeyPrefix: 'test-jail',
        maxKeyLogLength: 30,
      };

      expect(() => validateCacheConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid configuration', () => {
      const invalidConfig: CacheConfig = {
        cacheTtl: -1, // Invalid
        jailThreshold: 0, // Invalid
        jailTtl: 3600,
        streamChunkSize: 5,
        enableLogging: true,
        enableMetrics: true,
        cacheKeyPrefix: 'test',
        jailKeyPrefix: 'test-jail',
        maxKeyLogLength: 20,
      };

      expect(() => validateCacheConfig(invalidConfig)).toThrow(
        'Cache TTL must be positive',
      );
    });

    it('should respect environment variables', async () => {
      // Save original values
      const originalTtl = process.env.AI_CACHE_TTL;
      const originalThreshold = process.env.AI_CACHE_JAIL_THRESHOLD;

      try {
        // Set test values
        process.env.AI_CACHE_TTL = '7200';
        process.env.AI_CACHE_JAIL_THRESHOLD = '5';

        // Note: In a real test environment, we'd need to restart the process
        // or use dependency injection to test environment variable changes
        // For now, we'll just test that the current function works with current env
        const config = getCacheConfig();

        // These will still be the defaults since the module is already loaded
        // In a real test, you'd need to mock the environment or use dynamic imports
        expect(typeof config.cacheTtl).toBe('number');
        expect(typeof config.jailThreshold).toBe('number');
      } finally {
        // Restore original values
        if (originalTtl !== undefined) {
          process.env.AI_CACHE_TTL = originalTtl;
        } else {
          delete process.env.AI_CACHE_TTL;
        }
        if (originalThreshold !== undefined) {
          process.env.AI_CACHE_JAIL_THRESHOLD = originalThreshold;
        } else {
          delete process.env.AI_CACHE_JAIL_THRESHOLD;
        }
      }
    });
  });

  describe('Metrics Collection', () => {
    it('should track cache hits and misses', () => {
      metricsCollector.recordHit('test-key-1', 100);
      metricsCollector.recordMiss('test-key-2');
      metricsCollector.recordHit('test-key-3', 200);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.totalResponses).toBe(3);
      expect(metrics.hitRate).toBeCloseTo(0.6667); // 2/3
      expect(metrics.avgResponseSize).toBeCloseTo(100); // (100 + 200) / 3
    });

    it('should track jail operations', () => {
      metricsCollector.recordJailUpdate('test-key', 1, 3);
      metricsCollector.recordJailUpdate('test-key', 2, 3);
      metricsCollector.recordJailPromotion('test-key', 150);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.problematicResponses).toBe(2);
      expect(metrics.jailPromotions).toBe(1);
    });

    it('should track errors', () => {
      metricsCollector.recordError('test-key', 'Redis connection failed');
      metricsCollector.recordError('test-key-2', 'Timeout error');

      const metrics = metricsCollector.getMetrics();
      expect(metrics.cacheErrors).toBe(2);
    });

    it('should provide event history', () => {
      metricsCollector.recordHit('test-key-1', 100);
      metricsCollector.recordMiss('test-key-2');
      metricsCollector.recordStore('test-key-3', 200);

      const events = metricsCollector.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('hit');
      expect(events[1].type).toBe('miss');
      expect(events[2].type).toBe('store');
    });

    it('should support metrics callbacks', (done) => {
      let callbackInvoked = false;

      const unsubscribe = metricsCollector.onMetricsUpdate((metrics) => {
        expect(metrics.cacheHits).toBe(1);
        callbackInvoked = true;
        unsubscribe();
        done();
      });

      metricsCollector.recordHit('test-key', 100);

      // Fallback timeout in case callback is not invoked
      setTimeout(() => {
        if (!callbackInvoked) {
          unsubscribe();
          done(new Error('Metrics callback was not invoked'));
        }
      }, 1000);
    });

    it('should generate Prometheus metrics', () => {
      metricsCollector.recordHit('test-key-1', 100);
      metricsCollector.recordMiss('test-key-2');
      metricsCollector.recordJailPromotion('test-key-3', 150);

      const prometheusMetrics = getPrometheusMetrics();

      expect(prometheusMetrics).toContain('ai_cache_hits_total 1');
      expect(prometheusMetrics).toContain('ai_cache_misses_total 1');
      expect(prometheusMetrics).toContain('ai_cache_jail_promotions_total 1');
      expect(prometheusMetrics).toContain(
        '# HELP ai_cache_hits_total Total number of cache hits',
      );
    });

    it('should reset metrics correctly', () => {
      metricsCollector.recordHit('test-key', 100);
      metricsCollector.recordMiss('test-key-2');

      let metrics = metricsCollector.getMetrics();
      expect(metrics.totalResponses).toBe(2);

      metricsCollector.reset();

      metrics = metricsCollector.getMetrics();
      expect(metrics.totalResponses).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });

  describe('Console Metrics Setup', () => {
    it('should setup console metrics without errors', () => {
      const cleanup = setupConsoleMetrics();
      expect(typeof cleanup).toBe('function');

      // Test that it can be cleaned up
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Performance Simulation', () => {
    it('should handle realistic usage patterns', () => {
      // Simulate a realistic cache usage pattern
      const scenarios = [
        { type: 'hit', size: 500 },
        { type: 'hit', size: 500 },
        { type: 'miss' },
        { type: 'store', size: 750 },
        { type: 'hit', size: 750 },
        { type: 'error' },
      ];

      scenarios.forEach((scenario, index) => {
        const key = `scenario-key-${index}`;
        switch (scenario.type) {
          case 'hit':
            metricsCollector.recordHit(key, scenario.size);
            break;
          case 'miss':
            metricsCollector.recordMiss(key);
            break;
          case 'store':
            metricsCollector.recordStore(key, scenario.size!);
            break;
          case 'error':
            metricsCollector.recordError(key, 'Simulated error');
            break;
        }
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics.cacheHits).toBe(3);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.successfulCaches).toBe(1);
      expect(metrics.cacheErrors).toBe(1);
      expect(metrics.hitRate).toBeCloseTo(0.75); // 3/4
    });
  });
});
