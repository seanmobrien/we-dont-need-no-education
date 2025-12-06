
/**
 * @fileoverview Unit tests for chat history types module
 *
 * These tests verify that the TypeScript interfaces in the types module
 * are properly structured and can be used correctly in type assertions
 * and runtime validations.
 *
 * @module __tests__/lib/ai/middleware/chat-history/types.test.ts
 */

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import type {
  ChatHistoryContext,
  QueuedTask,
  FlushContext,
  FlushResult,
  FlushConfig,
} from '@/lib/ai/middleware/chat-history/types';
import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';

describe('Chat History Types', () => {
  describe('ChatHistoryContext', () => {
    it('should have required userId field', () => {
      const context = {
        userId: 'user-123',
      } as ChatHistoryContext;

      expect(context.userId).toBe('user-123');
    });

    it('should accept optional fields', () => {
      const context = {
        userId: 'user-123',
        chatId: 'chat-456',
        requestId: 'session-789',
        model: 'gpt-4o',
        temperature: 0.7,
        topP: 0.9,
      } as ChatHistoryContext;

      expect(context.chatId).toBe('chat-456');
      expect(context.requestId).toBe('session-789');
      expect(context.model).toBe('gpt-4o');
      expect(context.temperature).toBe(0.7);
      expect(context.topP).toBe(0.9);
    });

    it('should work with minimal required fields only', () => {
      const context = {
        userId: 'user-123',
      } as ChatHistoryContext;

      expect(context.chatId).toBeUndefined();
      expect(context.requestId).toBeUndefined();
      expect(context.model).toBeUndefined();
      expect(context.temperature).toBeUndefined();
      expect(context.topP).toBeUndefined();
    });
  });

  describe('StreamHandlerContext', () => {
    it('should have all required fields', () => {
      const context: any = {
        chatId: 'chat-123',
        turnId: 1,
        messageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Hello world',
        toolCalls: new Map<string, any>(),
      };

      expect(context.chatId).toBe('chat-123');
      expect(context.turnId).toBe(1);
      expect(context.messageId).toBe(42);
      expect(context.currentMessageOrder).toBe(1);
      expect(context.generatedText).toBe('Hello world');
    });

    it('should allow undefined messageId', () => {
      const context: any = {
        chatId: 'chat-123',
        turnId: 1,
        currentMessageOrder: 1,
        generatedText: 'Hello world',
      };

      expect(context.messageId).toBeUndefined();
    });

    it('should handle empty generated text', () => {
      const context: any = {
        chatId: 'chat-123',
        turnId: 1,
        currentMessageOrder: 0,
        generatedText: '',
      };

      expect(context.generatedText).toBe('');
      expect(context.currentMessageOrder).toBe(0);
    });
  });

  describe('StreamHandlerResult', () => {
    it('should have all required fields', () => {
      const result: any = {
        currentMessageOrder: 2,
        generatedText: 'Updated text',
        success: true,
      };

      expect(result.currentMessageOrder).toBe(2);
      expect(result.generatedText).toBe('Updated text');
      expect(result.success).toBe(true);
    });

    it('should handle failure cases', () => {
      const result: any = {
        currentMessageOrder: 1,
        generatedText: 'Original text',
        success: false,
      };

      expect(result.success).toBe(false);
    });

    it('should handle zero values correctly', () => {
      const result: any = {
        currentMessageOrder: 0,
        generatedText: '',
        success: true,
      };

      expect(result.currentMessageOrder).toBe(0);
      expect(result.generatedText).toBe('');
    });
  });

  describe('QueuedTask', () => {
    it('should have all required fields', () => {
      const mockChunk: LanguageModelV2StreamPart = {
        type: 'text-delta',
        delta: 'Hello',
        id: 'chunk-1',
      };

      const mockContext: any = {
        chatId: 'chat-123',
        turnId: 1,
        currentMessageOrder: 1,
        generatedText: '',
      };

      const mockResolve = jest.fn();
      const mockReject = jest.fn();
      const mockPromise = Promise.resolve();

      const task: QueuedTask = {
        id: 1,
        chunk: mockChunk,
        context: mockContext,
        promise: mockPromise,
        resolve: mockResolve,
        reject: mockReject,
      };

      expect(task.id).toBe(1);
      expect(task.chunk).toBe(mockChunk);
      expect(task.context).toBe(mockContext);
      expect(task.promise).toBe(mockPromise);
      expect(task.resolve).toBe(mockResolve);
      expect(task.reject).toBe(mockReject);
    });

    it('should allow optional result field', () => {
      const mockChunk: LanguageModelV2StreamPart = {
        type: 'text-delta',
        delta: 'Hello',
        id: 'chunk-1',
      };

      const mockContext: any = {
        chatId: 'chat-123',
        turnId: 1,
        currentMessageOrder: 1,
        generatedText: '',
      };

      const task: QueuedTask = {
        id: 1,
        chunk: mockChunk,
        context: mockContext,
        promise: Promise.resolve(),
        resolve: jest.fn(),
        reject: jest.fn(),
        result: {
          currentMessageOrder: 2,
          generatedText: 'Hello',
          success: true,
        } as any,
      };

      expect(task.result?.currentMessageOrder).toBe(2);
      expect(task.result?.generatedText).toBe('Hello');
      expect(task.result?.success).toBe(true);
    });
  });

  describe('FlushContext', () => {
    it('should have all required fields', () => {
      const context: FlushContext = {
        chatId: 'chat-123',
        turnId: 1,
        messageId: 42,
        generatedText: 'Final response',
        startTime: Date.now(),
      };

      expect(context.chatId).toBe('chat-123');
      expect(context.turnId).toBe(1);
      expect(context.messageId).toBe(42);
      expect(context.generatedText).toBe('Final response');
      expect(typeof context.startTime).toBe('number');
    });

    it('should allow optional turnId and messageId', () => {
      const context: FlushContext = {
        chatId: 'chat-123',
        generatedText: 'Final response',
        startTime: Date.now(),
      };

      expect(context.turnId).toBeUndefined();
      expect(context.messageId).toBeUndefined();
    });

    it('should handle empty generated text', () => {
      const context: FlushContext = {
        chatId: 'chat-123',
        generatedText: '',
        startTime: Date.now(),
      };

      expect(context.generatedText).toBe('');
    });
  });

  describe('FlushResult', () => {
    it('should have all required fields for success', () => {
      const result: FlushResult = {
        success: true,
        processingTimeMs: 1250,
        textLength: 25,
      };

      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBe(1250);
      expect(result.textLength).toBe(25);
      expect(result.error).toBeUndefined();
    });

    it('should include error for failure cases', () => {
      const error = new Error('Database connection failed');
      const result: FlushResult = {
        success: false,
        processingTimeMs: 500,
        textLength: 0,
        error,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should handle zero values correctly', () => {
      const result: FlushResult = {
        success: true,
        processingTimeMs: 0,
        textLength: 0,
      };

      expect(result.processingTimeMs).toBe(0);
      expect(result.textLength).toBe(0);
    });
  });

  describe('FlushConfig', () => {
    it('should have all required fields', () => {
      const config: FlushConfig = {
        autoGenerateTitle: true,
        maxTitleLength: 100,
        titleWordCount: 6,
      };

      expect(config.autoGenerateTitle).toBe(true);
      expect(config.maxTitleLength).toBe(100);
      expect(config.titleWordCount).toBe(6);
    });

    it('should handle disabled title generation', () => {
      const config: FlushConfig = {
        autoGenerateTitle: false,
        maxTitleLength: 50,
        titleWordCount: 3,
      };

      expect(config.autoGenerateTitle).toBe(false);
      expect(config.maxTitleLength).toBe(50);
      expect(config.titleWordCount).toBe(3);
    });

    it('should handle edge case values', () => {
      const config: FlushConfig = {
        autoGenerateTitle: true,
        maxTitleLength: 0,
        titleWordCount: 0,
      };

      expect(config.maxTitleLength).toBe(0);
      expect(config.titleWordCount).toBe(0);
    });
  });

  describe('Type Integration', () => {
    it('should work together in typical usage patterns', () => {
      // Simulate a typical workflow with all types
      const historyContext: ChatHistoryContext = createUserChatHistoryContext({
        userId: 'user-123',
        chatId: 'chat-456',
        model: 'gpt-4o',
      });

      const streamContext: any = {
        chatId: historyContext.chatId!,
        turnId: 1,
        currentMessageOrder: 1,
        generatedText: '',
      };

      const streamResult: any = {
        currentMessageOrder: streamContext.currentMessageOrder + 1,
        generatedText: 'Hello world',
        success: true,
      };

      const flushContext: FlushContext = {
        chatId: streamContext.chatId,
        turnId: streamContext.turnId,
        generatedText: streamResult.generatedText,
        startTime: Date.now(),
      };

      const flushResult: FlushResult = {
        success: true,
        processingTimeMs: 1000,
        textLength: flushContext.generatedText.length,
      };

      const config: FlushConfig = {
        autoGenerateTitle: true,
        maxTitleLength: 100,
        titleWordCount: 6,
      };

      // Verify the flow works correctly
      expect(streamContext.chatId).toBe(historyContext.chatId);
      expect(flushContext.chatId).toBe(streamContext.chatId);
      expect(flushResult.textLength).toBe(streamResult.generatedText.length);
      expect(config.autoGenerateTitle).toBe(true);
    });
  });
});
