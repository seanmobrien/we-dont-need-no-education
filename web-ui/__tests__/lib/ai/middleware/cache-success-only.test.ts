/**
 * @jest-environment node
 */

/**
 * Jest tests for verifying that only successful responses are cached
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
jest.mock('/lib/ai/middleware/cacheWithRedis/redis-client', () => ({
  getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
  closeRedisClient: jest.fn().mockResolvedValue(undefined),
}));

import { openai } from '@ai-sdk/openai';
import { generateText, LanguageModelMiddleware, wrapLanguageModel } from 'ai';
import { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider';
import { cacheWithRedis } from '../../../../lib/ai/middleware/cacheWithRedis/cacheWithRedis';
import { hideConsoleOutput } from '/__tests__/test-utils';
import { metricsCollector } from '../../../../lib/ai/middleware/cacheWithRedis/metrics';
import { content } from 'googleapis/build/src/apis/content';

// Mock function to simulate different response types
const createMockMiddleware = (
  mockResponse: Record<string, unknown>,
): LanguageModelMiddleware => ({
  wrapGenerate: async () => {
    return mockResponse as unknown as ReturnType<LanguageModelV2['doGenerate']>;
  },
  transformParams: async ({ params }: { params: Record<string, unknown> }) =>
    params as LanguageModelV2CallOptions,
});

const wrapMockMiddleware = (
  model: LanguageModelV2,
  mockResponse: Record<string, unknown>,
): LanguageModelV2 =>
  wrapLanguageModel({
    model: wrapLanguageModel({
      model: model,
      middleware: [createMockMiddleware(mockResponse)],
    }),
    middleware: [cacheWithRedis],
  });

describe('Cache Success-Only Functionality', () => {
  beforeEach(() => {
    metricsCollector.reset();
    // jest.clearAllMocks();
    mockRedisClient.get.mockResolvedValue(null); // Default to no existing data
  });

  it('should cache successful responses', async () => {
    const baseModel = openai('gpt-4o-mini');

    const successMiddleware: LanguageModelMiddleware = createMockMiddleware({
      content: [{ type: 'text', text: 'This is a successful response' }],
      finishReason: 'stop',
      usage: { totalTokens: 10 },
      warnings: undefined,
    });

    const successModel = wrapLanguageModel({
      model: wrapLanguageModel({
        model: baseModel,
        middleware: [successMiddleware],
      }),
      middleware: [cacheWithRedis],
    });

    const result = await generateText({
      model: successModel,
      messages: [{ role: 'user', content: 'Test successful response' }],
    });

    expect(result.text).toBe('This is a successful response');

    // Check metrics
    const metrics = metricsCollector.getMetrics();
    expect(metrics.successfulCaches).toBe(1);
    expect(metrics.cacheErrors).toBe(0);
  });

  it('should NOT cache error responses', async () => {
    const mockConsole = hideConsoleOutput();
    mockConsole.setup();

    try {
      const baseModel = openai('gpt-4o-mini');

      const errorModel = wrapMockMiddleware(baseModel, {
        content: [{ type: 'text', text: '' }],
        finishReason: 'error',
        usage: { totalTokens: 10 },
        warnings: ['API Error occurred'],
      });

      const result = await generateText({
        model: errorModel,
        messages: [{ role: 'user', content: 'Test error response' }],
      });

      expect(result.text).toBe('');

      // Check metrics - should not show successful cache
      const metrics = metricsCollector.getMetrics();
      expect(metrics.successfulCaches).toBe(0);
    } finally {
      mockConsole.dispose();
    }
  });

  it('should NOT cache content filter responses initially', async () => {
    const baseModel = openai('gpt-4o-mini');

    const filterModel = wrapMockMiddleware(baseModel, {
      content: [{ type: 'text', text: 'Filtered content' }],
      finishReason: 'content-filter',
      usage: { totalTokens: 5 },
      warnings: undefined,
    });

    const result = await generateText({
      model: filterModel,
      messages: [{ role: 'user', content: 'Test content filter response' }],
    });

    expect(result.text).toBe('Filtered content');

    // Check metrics - should show problematic response (jail update)
    const metrics = metricsCollector.getMetrics();
    expect(metrics.successfulCaches).toBe(0);
    expect(metrics.problematicResponses).toBe(1);
  });

  it('should NOT cache responses with warnings initially', async () => {
    const mockConsole = hideConsoleOutput();
    mockConsole.setup();

    try {
      const baseModel = openai('gpt-4o-mini');

      const warningModel = wrapMockMiddleware(baseModel, {
        content: [{ type: 'text', text: 'Response with warnings' }],
        finishReason: 'stop',
        usage: { totalTokens: 15 },
        warnings: ['Rate limit warning'],
      });

      const result = await generateText({
        model: warningModel,
        messages: [{ role: 'user', content: 'Test warning response' }],
      });

      expect(result.text).toBe('Response with warnings');

      // Check metrics
      const metrics = metricsCollector.getMetrics();
      expect(metrics.successfulCaches).toBe(0);
      expect(metrics.problematicResponses).toBe(1);
    } finally {
      mockConsole.dispose();
    }
  });

  it('should NOT cache empty text responses', async () => {
    const baseModel = openai('gpt-4o-mini');

    const emptyModel = wrapMockMiddleware(baseModel, {
      content: [{ type: 'text', text: '' }],
      finishReason: 'stop',
      usage: { totalTokens: 1 },
      warnings: undefined,
    });

    const result = await generateText({
      model: emptyModel,
      messages: [{ role: 'user', content: 'Test empty response' }],
    });

    expect(result.text).toBe('');

    // Check metrics
    const metrics = metricsCollector.getMetrics();
    expect(metrics.successfulCaches).toBe(0);
  });
});
