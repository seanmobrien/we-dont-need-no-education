/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Unit tests for chat history stream handlers
 *
 * These tests verify the behavior of stream chunk handlers that process
 * different types of streaming data from AI language models.
 *
 * @module __tests__/lib/ai/middleware/chat-history/stream-handlers.test.ts
 */

import {
  handleTextDelta,
  handleToolCall,
  handleFinish,
  processStreamChunk,
} from '@/lib/ai/middleware/chat-history/stream-handlers';
import { DbDatabaseType, drizDb } from '@/lib/drizzle-db';
import { chatMessages, tokenUsage } from '@/drizzle/schema';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { log } from '@/lib/logger';
import type { StreamHandlerContext } from '@/lib/ai/middleware/chat-history/types';
import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';

// Mock dependencies
jest.mock('@/lib/drizzle-db');
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/logger');

let mockDb: jest.Mocked<DbDatabaseType>;
const mockGetNextSequence = getNextSequence as jest.MockedFunction<
  typeof getNextSequence
>;
const mockLog = log as jest.MockedFunction<typeof log>;

describe('Stream Handlers', () => {
  let mockContext: StreamHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = drizDb() as jest.Mocked<DbDatabaseType>;

    mockContext = {
      chatId: 'chat-123',
      turnId: 1,
      messageId: 42,
      currentMessageOrder: 1,
      generatedText: 'Initial text',
      toolCalls: new Map(),
    };

    // Setup default mocks
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as ReturnType<typeof mockDb.update>);

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue([
            {
              messageId: 100,
              providerId: 'test-provider-id',
              toolName: 'test-tool',
            },
          ]),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.insert>);

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>);

    mockDb.transaction.mockImplementation(async (callback) => {
      // Mock transaction that calls the callback with a mock tx object
      return await callback({
        insert: mockDb.insert,
        update: mockDb.update,
        select: mockDb.select,
      } as any);
    });

    mockGetNextSequence.mockImplementation((params) => {
      if (params.tx) {
        return Promise.resolve([100]);
      }
      return Promise.resolve([100]);
    });
  });

  describe('handleTextDelta', () => {
    it('should accumulate text and update message successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =
        {
          type: 'text-delta',
          delta: ' additional text',
        };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text additional text',
        toolCalls: expect.any(Map),
        success: true,
      });

      expect(mockDb.update).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle empty text delta', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =
        {
          type: 'text-delta',
          delta: '',
        };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: true,
      });
    });

    it('should handle context without messageId', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =
        {
          type: 'text-delta',
          delta: ' new text',
        };
      const contextWithoutMessageId = { ...mockContext, messageId: undefined };

      // Act
      const result = await handleTextDelta(chunk, contextWithoutMessageId);

      // Assert
      expect(result).toEqual({
        currentMessageId: expect.any(Number), // Will be assigned during transaction
        currentMessageOrder: 2, // Incremented during transaction
        generatedText: 'Initial text new text',
        toolCalls: expect.any(Map),
        success: true,
      });

      // Should call db transaction when no messageId to create new message
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle database update errors gracefully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =
        {
          type: 'text-delta',
          delta: ' error text',
        };
      const dbError = new Error('Database update failed');

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(dbError),
        }),
      } as unknown as ReturnType<typeof mockDb.update>);

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle special characters correctly', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'text-delta' }> =
        {
          type: 'text-delta',
          delta: ' 🚀 émojis and ñoñó special chars',
        };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result.generatedText).toBe(
        'Initial text 🚀 émojis and ñoñó special chars',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('handleToolCall', () => {
    it('should create tool message successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-123',
        toolName: 'search',
        input: JSON.stringify({ query: 'test search' }),
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 2,
        generatedText: '',
        toolCalls: expect.any(Map),
        success: true,
      });

      expect(mockGetNextSequence).toHaveBeenCalledWith({
        tableName: 'chat_messages',
        chatId: 'chat-123',
        turnId: 1,
        count: 1,
        tx: expect.any(Object),
      });

      expect(mockDb.insert).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle tool call without arguments', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-456',
        toolName: 'ping',
        input: '',
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 2,
        generatedText: '',
        toolCalls: expect.any(Map),
        success: true,
      });
    });

    it('should handle getNextSequence errors', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-error',
        toolName: 'error-tool',
        input: '{}',
      };
      const sequenceError = new Error('Failed to get next sequence');
      mockGetNextSequence.mockRejectedValue(sequenceError);

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle database insert errors', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-db-error',
        toolName: 'db-error-tool',
        input: '{}',
      };
      const insertError = new Error('Database insert failed');

      mockDb.transaction.mockRejectedValue(insertError);

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle complex tool arguments', async () => {
      // Arrange
      const complexArgs = {
        query: 'test search',
        filters: {
          date: '2025-01-01',
          category: 'tech',
        },
        options: ['precise', 'fast'],
      };

      const chunk: Extract<LanguageModelV2StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-complex',
        toolName: 'complex-search',
        input: JSON.stringify(complexArgs),
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.currentMessageId).toBe(undefined);
      expect(result.currentMessageOrder).toBe(2);
      expect(result.generatedText).toBe('');
      expect(result.toolCalls).toEqual(expect.any(Map));
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe('handleFinish', () => {
    it('should record token usage successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
          totalTokens: 75,
        },
        finishReason: 'stop',
      };

      // Act
      const result = await handleFinish(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: true,
      });

      expect(mockDb.insert).toHaveBeenCalledWith(tokenUsage);
    });

    it('should handle finish without usage data', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }> = {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      };
      // Remove messageId so that the condition doesn't trigger insertion
      const contextWithoutMessageId = { ...mockContext, messageId: undefined };

      // Act
      const result = await handleFinish(chunk, contextWithoutMessageId);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: true,
      });

      // Should not insert token usage when no usage data and no messageId
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should handle context without turnId', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          inputTokens: 30,
          outputTokens: 15,
          totalTokens: 45,
        },
        finishReason: 'stop',
      };
      const contextWithoutTurnId = {
        ...mockContext,
        turnId: undefined,
      } as unknown as StreamHandlerContext;

      // Act
      const result = await handleFinish(chunk, contextWithoutTurnId);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: true,
      });

      // Should not insert when no turnId
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database insert errors for token usage', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          inputTokens: 40,
          outputTokens: 20,
          totalTokens: 60,
        },
        finishReason: 'stop',
      };
      const insertError = new Error('Token usage insert failed');

      mockDb.transaction.mockRejectedValue(insertError);

      // Act
      const result = await handleFinish(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should calculate total tokens correctly', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          inputTokens: 100,
          outputTokens: 75,
          totalTokens: 175,
        },
        finishReason: 'stop',
      };

      // Act
      await handleFinish(chunk, mockContext);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledWith(tokenUsage);
      // Verify the values call contains correct total
      const insertCall = mockDb.insert.mock.results[0].value;
      expect(insertCall.values).toHaveBeenCalledWith({
        chatId: 'chat-123',
        turnId: 1,
        promptTokens: 100,
        completionTokens: 75,
        totalTokens: 175, // 100 + 75
      });
    });
  });

  describe('processStreamChunk', () => {
    it('should route text-delta chunks correctly', async () => {
      // Arrange
      const chunk: LanguageModelV2StreamPart = {
        type: 'text-delta',
        delta: ' routed text',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: 42,
        currentMessageOrder: 1,
        generatedText: 'Initial text routed text',
        toolCalls: expect.any(Map),
        success: true,
      });
    });

    it('should route tool-call chunks correctly', async () => {
      // Arrange
      const chunk: LanguageModelV2StreamPart = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-route',
        toolName: 'route-tool',
        input: '{}',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 2,
        generatedText: '',
        toolCalls: expect.any(Map),
        success: true,
      });
    });

    it('should route finish chunks correctly', async () => {
      // Arrange
      const chunk: LanguageModelV2StreamPart = {
        type: 'finish',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageId: undefined,
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        toolCalls: expect.any(Map),
        success: true,
      });
    });

    it('should handle unrecognized chunk types gracefully', async () => {
      // Arrange
      const chunk = {
        type: 'unknown-chunk-type',
        data: 'some data',
      } as unknown as LanguageModelV2StreamPart;

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        chatId: 'chat-123',
        turnId: 1,
        messageId: 42,
        currentMessageOrder: 1,
        generatedText:
          'Initial text{"type":"unknown-chunk-type","data":"some data"}',
        toolCalls: expect.any(Map),
        currentMessageId: 42,
        success: true,
      });
    });

    it('should handle error chunks', async () => {
      // Arrange
      const chunk: LanguageModelV2StreamPart = {
        type: 'error',
        error: new Error('Stream error'),
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        chatId: 'chat-123',
        turnId: 1,
        messageId: 42,
        currentMessageOrder: 1,
        generatedText: expect.stringContaining('Initial text'),
        toolCalls: expect.any(Map),
        currentMessageId: 42,
        success: true,
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle a sequence of different chunk types', async () => {
      // Test a realistic sequence of chunks
      const context = { ...mockContext };

      // First chunk: text-delta
      const textChunk: LanguageModelV2StreamPart = {
        type: 'text-delta',
        delta: 'Hello',
      };
      let result = await processStreamChunk(textChunk, context);
      context.generatedText = result.generatedText;

      expect(result.generatedText).toBe('Initial textHello');

      // Second chunk: tool-call
      const toolChunk: LanguageModelV2StreamPart = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-seq',
        toolName: 'sequence-tool',
        input: JSON.stringify({ step: 1 }),
      };
      result = await processStreamChunk(toolChunk, context);
      context.currentMessageOrder = result.currentMessageOrder;

      expect(result.currentMessageOrder).toBe(2);

      // Third chunk: more text
      const moreTextChunk: LanguageModelV2StreamPart = {
        type: 'text-delta',
        delta: ' world',
      };
      result = await processStreamChunk(moreTextChunk, context);
      context.generatedText = result.generatedText;

      expect(result.generatedText).toBe('Initial textHello world');

      // Final chunk: finish
      const finishChunk: LanguageModelV2StreamPart = {
        type: 'finish',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      };
      result = await processStreamChunk(finishChunk, context);

      expect(result.success).toBe(true);
    });

    it('should maintain state consistency across multiple chunks', async () => {
      // Arrange
      const chunks: LanguageModelV2StreamPart[] = [
        { type: 'text-delta', delta: 'First' },
        { type: 'text-delta', delta: ' Second' },
        { type: 'text-delta', delta: ' Third' },
      ];

      const currentContext = { ...mockContext };

      // Act
      for (const chunk of chunks) {
        const result = await processStreamChunk(chunk, currentContext);
        currentContext.generatedText = result.generatedText;
        currentContext.currentMessageOrder = result.currentMessageOrder;
      }

      // Assert
      expect(currentContext.generatedText).toBe(
        'Initial textFirst Second Third',
      );
    });
  });
});
