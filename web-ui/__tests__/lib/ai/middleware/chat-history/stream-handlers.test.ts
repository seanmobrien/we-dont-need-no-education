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
import type { LanguageModelV1StreamPart } from 'ai';

// Mock dependencies
jest.mock('@/lib/drizzle-db');
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/logger');

let mockDb: jest.Mocked<DbDatabaseType>;
const mockGetNextSequence = getNextSequence as jest.MockedFunction<typeof getNextSequence>;
const mockLog = log as jest.MockedFunction<typeof log>;

describe('Stream Handlers', () => {
  let mockContext: StreamHandlerContext;

  beforeEach(() => {
    // jest.clearAllMocks();
        mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    
    mockContext = {
      chatId: 'chat-123',
      turnId: 1,
      messageId: 42,
      currentMessageOrder: 1,
      generatedText: 'Initial text',
    };

    // Setup default mocks
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as ReturnType<typeof mockDb.update>);

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof mockDb.insert>);

    mockGetNextSequence.mockResolvedValue([100]);
  });

  describe('handleTextDelta', () => {
    it('should accumulate text and update message successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }> = {
        type: 'text-delta',
        textDelta: ' additional text',
      };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text additional text',
        success: true,
      });

      expect(mockDb.update).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle empty text delta', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }> = {
        type: 'text-delta',
        textDelta: '',
      };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });
    });

    it('should handle context without messageId', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }> = {
        type: 'text-delta',
        textDelta: ' new text',
      };
      const contextWithoutMessageId = { ...mockContext, messageId: undefined };

      // Act
      const result = await handleTextDelta(chunk, contextWithoutMessageId);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text new text',
        success: true,
      });

      // Should not call database update when no messageId
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle database update errors gracefully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }> = {
        type: 'text-delta',
        textDelta: ' error text',
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
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle special characters correctly', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }> = {
        type: 'text-delta',
        textDelta: ' 🚀 émojis and ñoñó special chars',
      };

      // Act
      const result = await handleTextDelta(chunk, mockContext);

      // Assert
      expect(result.generatedText).toBe('Initial text 🚀 émojis and ñoñó special chars');
      expect(result.success).toBe(true);
    });
  });

  describe('handleToolCall', () => {
    it('should create tool message successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-123',
        toolName: 'search',
        args: JSON.stringify({ query: 'test search' }),
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 2,
        generatedText: 'Initial text',
        success: true,
      });

      expect(mockGetNextSequence).toHaveBeenCalledWith({
        tableName: 'chat_messages',
        chatId: 'chat-123',
        turnId: 1,
        count: 1,
      });

      expect(mockDb.insert).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle tool call without arguments', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-456',
        toolName: 'ping',
        args: '',
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 2,
        generatedText: 'Initial text',
        success: true,
      });
    });

    it('should handle getNextSequence errors', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-error',
        toolName: 'error-tool',
        args: '{}',
      };
      const sequenceError = new Error('Failed to get next sequence');
      mockGetNextSequence.mockRejectedValue(sequenceError);

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle database insert errors', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-db-error',
        toolName: 'db-error-tool',
        args: '{}',
      };
      const insertError = new Error('Database insert failed');
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(insertError),
      } as unknown as ReturnType<typeof mockDb.insert>);

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
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
      
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }> = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-complex',
        toolName: 'complex-search',
        args: JSON.stringify(complexArgs),
      };

      // Act
      const result = await handleToolCall(chunk, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith(chatMessages);
    });
  });

  describe('handleFinish', () => {
    it('should record token usage successfully', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
        },
        finishReason: 'stop',
      };

      // Act
      const result = await handleFinish(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });

      expect(mockDb.insert).toHaveBeenCalledWith(tokenUsage);
    });

    it('should handle finish without usage data', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }> = {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
        },
      };

      // Act
      const result = await handleFinish(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });

      // Should not insert token usage when no usage data
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle context without turnId', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          promptTokens: 30,
          completionTokens: 15,
        },
        finishReason: 'stop',
      };
      const contextWithoutTurnId = { ...mockContext, turnId: undefined } as unknown as StreamHandlerContext;

      // Act
      const result = await handleFinish(chunk, contextWithoutTurnId);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });

      // Should not insert when no turnId
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database insert errors for token usage', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          promptTokens: 40,
          completionTokens: 20,
        },
        finishReason: 'stop',
      };
      const insertError = new Error('Token usage insert failed');
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(insertError),
      } as unknown as ReturnType<typeof mockDb.insert>);

      // Act
      const result = await handleFinish(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: false,
      });

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should calculate total tokens correctly', async () => {
      // Arrange
      const chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }> = {
        type: 'finish',
        usage: {
          promptTokens: 100,
          completionTokens: 75,
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
      const chunk: LanguageModelV1StreamPart = {
        type: 'text-delta',
        textDelta: ' routed text',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text routed text',
        success: true,
      });
    });

    it('should route tool-call chunks correctly', async () => {
      // Arrange
      const chunk: LanguageModelV1StreamPart = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-route',
        toolName: 'route-tool',
        args: '{}',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 2,
        generatedText: 'Initial text',
        success: true,
      });
    });

    it('should route finish chunks correctly', async () => {
      // Arrange
      const chunk: LanguageModelV1StreamPart = {
        type: 'finish',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
        },
        finishReason: 'stop',
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });
    });

    it('should handle unrecognized chunk types gracefully', async () => {
      // Arrange
      const chunk = {
        type: 'unknown-chunk-type',
        data: 'some data',
      } as unknown as LanguageModelV1StreamPart;

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });
    });

    it('should handle error chunks', async () => {
      // Arrange
      const chunk: LanguageModelV1StreamPart = {
        type: 'error',
        error: new Error('Stream error'),
      };

      // Act
      const result = await processStreamChunk(chunk, mockContext);

      // Assert
      expect(result).toEqual({
        currentMessageOrder: 1,
        generatedText: 'Initial text',
        success: true,
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle a sequence of different chunk types', async () => {
      // Test a realistic sequence of chunks
      const context = { ...mockContext };

      // First chunk: text-delta
      const textChunk: LanguageModelV1StreamPart = {
        type: 'text-delta',
        textDelta: 'Hello',
      };
      let result = await processStreamChunk(textChunk, context);
      context.generatedText = result.generatedText;

      expect(result.generatedText).toBe('Initial textHello');

      // Second chunk: tool-call
      const toolChunk: LanguageModelV1StreamPart = {
        type: 'tool-call',
        toolCallType: 'function',
        toolCallId: 'tool-seq',
        toolName: 'sequence-tool',
        args: JSON.stringify({ step: 1 }),
      };
      result = await processStreamChunk(toolChunk, context);
      context.currentMessageOrder = result.currentMessageOrder;

      expect(result.currentMessageOrder).toBe(2);

      // Third chunk: more text
      const moreTextChunk: LanguageModelV1StreamPart = {
        type: 'text-delta',
        textDelta: ' world',
      };
      result = await processStreamChunk(moreTextChunk, context);
      context.generatedText = result.generatedText;

      expect(result.generatedText).toBe('Initial textHello world');

      // Final chunk: finish
      const finishChunk: LanguageModelV1StreamPart = {
        type: 'finish',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
        },
        finishReason: 'stop',
      };
      result = await processStreamChunk(finishChunk, context);

      expect(result.success).toBe(true);
    });

    it('should maintain state consistency across multiple chunks', async () => {
      // Arrange
      const chunks: LanguageModelV1StreamPart[] = [
        { type: 'text-delta', textDelta: 'First' },
        { type: 'text-delta', textDelta: ' Second' },
        { type: 'text-delta', textDelta: ' Third' },
      ];

      const currentContext = { ...mockContext };

      // Act
      for (const chunk of chunks) {
        const result = await processStreamChunk(chunk, currentContext);
        currentContext.generatedText = result.generatedText;
        currentContext.currentMessageOrder = result.currentMessageOrder;
      }

      // Assert
      expect(currentContext.generatedText).toBe('Initial textFirst Second Third');
    });
  });
});
