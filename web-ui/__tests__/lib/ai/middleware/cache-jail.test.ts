/**
 * @jest-environment node
 */

/**
 * Jest tests for     // Mock jail threshold of 3
    const config = getCacheConfig();
    const jailThreshold = config.jailThreshold;he jail functionality
 */

// Mock Redis client first
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

// Mock the Redis client module
jest.mock('@/lib/ai/middleware/cacheWithRedis/redis-client', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
  closeRedisClient: jest.fn().mockResolvedValue(undefined),
}));

import { openai } from '@ai-sdk/openai';
import { generateText, wrapLanguageModel } from 'ai';
import { cacheWithRedis } from '@/lib/ai/middleware/cacheWithRedis/cacheWithRedis';
import { metricsCollector } from '@/lib/ai/middleware/cacheWithRedis/metrics';

// Mock the openai model to return responses for testing
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => ({
    doGenerate: jest.fn(async () => ({
      text: 'Generated response',
      finishReason: 'stop',
      usage: { totalTokens: 10 },
      warnings: undefined,
    })),
    provider: 'openai',
    modelId: 'gpt-4o-mini',
  })),
}));

describe('Cache Jail Functionality', () => {
  beforeEach(() => {
    // Reset metrics and mock calls
    metricsCollector.reset();
    // jest.clearAllMocks();
    mockRedisClient.get.mockResolvedValue(null); // Default to no existing data
  });
  it('should cache response after jail threshold is exceeded', async () => {
    const model = wrapLanguageModel({
      model: openai('gpt-4o-mini'),
      middleware: [cacheWithRedis],
    });

    const testMessage = 'Test jail graduation';

    // Mock jail tracking - response has exceeded threshold
    mockRedisClient.get.mockImplementation((key: string) => {
      if (key.includes('ai-jail:')) {
        return Promise.resolve(
          JSON.stringify({
            count: 3 + 1, // Above threshold
            lastSeen: new Date().toISOString(),
          }),
        );
      }
      return Promise.resolve(null);
    });

    await generateText({
      model,
      messages: [{ role: 'user', content: testMessage }],
    });

    // Should cache the response now
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      expect.stringContaining('ai-cache:'),
      expect.any(Number),
      expect.stringContaining('Generated response'),
    );

    const metrics = metricsCollector.getMetrics();
    expect(metrics.successfulCaches).toBe(1);
  });
});
