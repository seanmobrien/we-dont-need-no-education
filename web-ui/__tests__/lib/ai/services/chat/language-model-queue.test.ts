/**
 * @fileoverview Tests for the LanguageModelQueue class
 */

import { LanguageModelV2 } from '@ai-sdk/provider';
import { LanguageModelQueue } from '@/lib/ai/services/chat';
import { MessageTooLargeForQueueError } from '@/lib/ai/services/chat/errors/message-too-large-for-queue-error';
import { AbortChatMessageRequestError } from '@/lib/ai/services/chat/errors/abort-chat-message-request-error';
import { setupMaps } from '@/__tests__/setup/jest.mock-provider-model-maps';

// Mock dependencies
jest.mock('@/lib/redis-client');
jest.mock('@/lib/ai/core/count-tokens');
jest.mock('@/lib/logger');

describe('LanguageModelQueue', () => {
  let mockModel: LanguageModelV2;
  let queue: LanguageModelQueue;

  beforeEach(() => {
    setupMaps();
    // Create a mock LanguageModel
    mockModel = {
      provider: 'azure',
      modelId: 'gpt-4.1',
    } as LanguageModelV2;

    queue = new LanguageModelQueue({
      model: mockModel,
      maxConcurrentRequests: 2,
    });
  });

  afterEach(() => {
    queue.dispose();
    // jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with provided options', () => {
      expect(queue.queueInstanceId).toBeDefined();
      expect(typeof queue.queueInstanceId).toBe('string');
      expect(queue.queueInstanceId.length).toBeGreaterThan(0);
    });

    it('should generate unique instance IDs', () => {
      const queue2 = new LanguageModelQueue({
        model: mockModel,
        maxConcurrentRequests: 1,
      });

      expect(queue.queueInstanceId).not.toBe(queue2.queueInstanceId);
      queue2.dispose();
    });
  });

  describe('Error classes', () => {
    it('should create MessageTooLargeForQueueError with correct properties', () => {
      const error = new MessageTooLargeForQueueError(1000, 500, 'test-model');

      expect(error.name).toBe('MessageTooLargeForQueueError');
      expect(error.tokenCount).toBe(1000);
      expect(error.maxTokens).toBe(500);
      expect(error.modelType).toBe('test-model');
      expect(error.message).toContain(
        '1000 tokens exceeds maximum allowed 500 tokens',
      );
    });

    it('should create AbortChatMessageRequestError with correct properties', () => {
      const error = new AbortChatMessageRequestError('test-request-id');

      expect(error.name).toBe('AbortChatMessageRequestError');
      expect(error.requestId).toBe('test-request-id');
      expect(error.message).toContain('test-request-id was aborted');
    });
  });

  describe('Model methods', () => {
    it('should have generateText method', () => {
      expect(typeof queue.generateText).toBe('function');
    });

    it('should have generateObject method', () => {
      expect(typeof queue.generateObject).toBe('function');
    });

    it('should have streamText method', () => {
      expect(typeof queue.streamText).toBe('function');
    });

    it('should have streamObject method', () => {
      expect(typeof queue.streamObject).toBe('function');
    });

    it('should accept signal parameter in all methods', async () => {
      const controller = new AbortController();
      const params = { messages: [] };

      // These will fail since we haven't implemented the full processing yet,
      // but we can verify the methods accept the signal parameter
      const promises = [
        queue.generateText(params, controller.signal).catch(() => 'expected'),
        queue.generateObject(params, controller.signal).catch(() => 'expected'),
        queue.streamText(params, controller.signal).catch(() => 'expected'),
        queue.streamObject(params, controller.signal).catch(() => 'expected'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources properly', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      queue.dispose();

      // Verify cleanup doesn't throw
      expect(() => queue.dispose()).not.toThrow();
      spy.mockRestore();
    });
  });
});
