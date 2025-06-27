/**
 * @jest-environment node
 */

/**
 * Jest tests for the cacheWithRedis middleware basic functionality
 */

// Mock the Redis client module first
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushDb: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
};

jest.mock('../../../../lib/ai/middleware/redis-client', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
  closeRedisClient: jest.fn().mockResolvedValue(undefined),
}));

import { openai } from '@ai-sdk/openai';
import { generateText, wrapLanguageModel } from 'ai';
import { cacheWithRedis } from '../../../../lib/ai/middleware/cacheWithRedis/cacheWithRedis';
import { metricsCollector } from '../../../../lib/ai/middleware/cacheWithRedis/metrics';

// Mock the openai model to return consistent responses for testing
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => ({
    doGenerate: jest.fn(async () => ({
      text: 'The answer is 4',
      finishReason: 'stop',
      usage: { totalTokens: 10 },
      warnings: undefined,
    })),
    provider: 'openai',
    modelId: 'gpt-4o-mini',
  })),
}));

describe('Cache Basic Functionality', () => {
  beforeEach(() => {
    // Reset metrics and mock calls
    metricsCollector.reset();
    jest.clearAllMocks();

    // Setup cache hit/miss behavior for tests
    mockRedisClient.get.mockResolvedValue(null); // Default to cache miss
  });

  it('should cache and retrieve responses correctly', async () => {
    // Setup: First call is cache miss, second call is cache hit
    const cachedResponse = JSON.stringify({
      text: 'The answer is 4',
      finishReason: 'stop',
      usage: { totalTokens: 10 },
      warnings: undefined,
    });

    mockRedisClient.get
      .mockResolvedValueOnce(null) // First call: cache miss
      .mockResolvedValueOnce(cachedResponse); // Second call: cache hit

    const model = wrapLanguageModel({
      model: openai('gpt-4o-mini'),
      middleware: [cacheWithRedis],
    });

    const testMessage = 'What is 2 + 2?';

    // First call - should be a cache miss
    const result1 = await generateText({
      model,
      messages: [{ role: 'user', content: testMessage }],
    });

    expect(result1.text).toBe('The answer is 4');

    // Verify cache storage was called
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      expect.stringContaining('ai-cache:'),
      86400, // Default TTL
      expect.stringContaining('The answer is 4'),
    );

    // Check metrics for first call
    let metrics = metricsCollector.getMetrics();
    expect(metrics.cacheMisses).toBe(1);
    expect(metrics.cacheHits).toBe(0);
    expect(metrics.successfulCaches).toBe(1);

    // Second call - should be a cache hit
    const result2 = await generateText({
      model,
      messages: [{ role: 'user', content: testMessage }],
    });

    expect(result2.text).toBe('The answer is 4');

    // Check metrics for second call
    metrics = metricsCollector.getMetrics();
    expect(metrics.cacheMisses).toBe(1);
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.hitRate).toBeCloseTo(0.5); // 1 hit out of 2 total requests
  });

  it('should generate different cache keys for different messages', async () => {
    const model = wrapLanguageModel({
      model: openai('gpt-4o-mini'),
      middleware: [cacheWithRedis],
    });

    // Both calls should be cache misses (different messages = different cache keys)
    mockRedisClient.get.mockResolvedValue(null);

    // First message
    await generateText({
      model,
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
    });

    // Second message (different)
    await generateText({
      model,
      messages: [{ role: 'user', content: 'What is 3 + 3?' }],
    });

    // Both should be cache misses since they're different
    const metrics = metricsCollector.getMetrics();
    expect(metrics.cacheMisses).toBe(2);
    expect(metrics.cacheHits).toBe(0);
    expect(metrics.successfulCaches).toBe(2);

    // Verify two different cache keys were used
    expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
    const calls = mockRedisClient.setEx.mock.calls;
    expect(calls[0][0]).not.toEqual(calls[1][0]); // Different cache keys
  });

  it('should handle Redis errors gracefully', async () => {
    // Simulate Redis connection error
    mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

    const model = wrapLanguageModel({
      model: openai('gpt-4o-mini'),
      middleware: [cacheWithRedis],
    });

    // Should still work even with Redis down (fallback to no caching)
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: 'Test with Redis down' }],
    });

    expect(result.text).toBe('The answer is 4');

    // Should record the error in metrics
    const metrics = metricsCollector.getMetrics();
    expect(metrics.cacheErrors).toBeGreaterThan(0);
  });

  it('should record error metrics when Redis fails', async () => {
    // Test direct error recording
    metricsCollector.recordError('test-key', 'Test error');

    const metrics = metricsCollector.getMetrics();
    expect(metrics.cacheErrors).toBe(1);
  });
});
