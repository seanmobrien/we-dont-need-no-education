/**
 * @fileoverview Unit tests for chat history flush handlers
 * 
 * These tests verify the behavior of flush handlers that complete chat turns,
 * finalize messages, generate titles, and handle error scenarios.
 * 
 * @module __tests__/lib/ai/middleware/chat-history/flush-handlers.test.ts
 */


import {
  finalizeAssistantMessage,
  completeChatTurn,
  generateChatTitle,
  markTurnAsError,
  handleFlush,
  DEFAULT_FLUSH_CONFIG,
} from '@/lib/ai/middleware/chat-history/flush-handlers';
import { chats, chatTurns, chatMessages } from '@/drizzle/schema';
import type { FlushContext, FlushConfig } from '@/lib/ai/middleware/chat-history/types';
import { drizDb } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';

const mockLog = log as jest.MockedFunction<typeof log>;

describe('Flush Handlers', () => {
  let mockContext: FlushContext;
  let mockUpdate: jest.Mock;
  const mockQuery = {
    chats: {
      findFirst: jest.fn(),
    },
  };
  beforeEach(() => {
    // jest.clearAllMocks();

    mockContext = {
      chatId: 'chat-123',
      turnId: 1,
      messageId: 42,
      generatedText: 'Hello, how can I help you?',
      startTime: Date.now() - 1000, // 1 second ago
    };
    mockUpdate = drizDb().update as jest.Mock;    
    mockQuery.chats.findFirst = drizDb().query.chats.findFirst as jest.Mock;

    // Setup default database mocks
    mockUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });

    mockQuery.chats.findFirst.mockResolvedValue(null);
  });

  describe('finalizeAssistantMessage', () => {
    it('should finalize assistant message successfully', async () => {
      // Act
      await finalizeAssistantMessage(mockContext);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle missing messageId gracefully', async () => {
      // Arrange
      const contextWithoutMessageId = { ...mockContext, messageId: undefined };

      // Act
      await finalizeAssistantMessage(contextWithoutMessageId);

      // Assert
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      // Arrange
      const dbError = new Error('Database update failed');
      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(dbError),
        }),
      });

      // Act & Assert
      await expect(finalizeAssistantMessage(mockContext)).rejects.not.toThrow('Database update failed');
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty generated text', async () => {
      // Arrange
      const contextWithEmptyText = { ...mockContext, generatedText: '' };

      // Act
      await finalizeAssistantMessage(contextWithEmptyText);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatMessages);
    });

    it('should handle special characters in generated text', async () => {
      // Arrange
      const contextWithSpecialChars = {
        ...mockContext,
        generatedText: 'Hello 🌟 "quotes" & <tags> and émojis',
      };

      // Act
      await finalizeAssistantMessage(contextWithSpecialChars);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatMessages);
    });
  });

  describe('completeChatTurn', () => {
    it('should complete chat turn with latency', async () => {
      // Arrange
      const latencyMs = 1250;

      // Act
      await completeChatTurn(mockContext, latencyMs);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle missing turnId gracefully', async () => {
      // Arrange
      const contextWithoutTurnId = { ...mockContext, turnId: undefined };
      const latencyMs = 1000;

      // Act
      await completeChatTurn(contextWithoutTurnId, latencyMs);

      // Assert
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle zero latency', async () => {
      // Arrange
      const latencyMs = 0;

      // Act
      await completeChatTurn(mockContext, latencyMs);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
    });

    it('should handle large latency values', async () => {
      // Arrange
      const latencyMs = 30000; // 30 seconds

      // Act
      await completeChatTurn(mockContext, latencyMs);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
    });
  });

  describe('generateChatTitle', () => {
    beforeEach(() => {
      mockQuery.chats.findFirst.mockResolvedValue(null);
    });

    it('should generate title from first few words', async () => {
      // Arrange
      const contextWithLongText = {
        ...mockContext,
        generatedText: 'Hello world this is a very long response that should be truncated for the title',
      };

      // Act
      await generateChatTitle(contextWithLongText);

      // Assert
      expect(mockQuery.chats.findFirst).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(chats);
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should skip title generation if chat already has title', async () => {
      // Arrange
      mockQuery.chats.findFirst.mockResolvedValue({
        title: 'Existing Title',
      });

      // Act
      await generateChatTitle(mockContext);

      // Assert
      expect(mockQuery.chats.findFirst).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should skip title generation when disabled in config', async () => {
      // Arrange
      const config: FlushConfig = {
        autoGenerateTitle: false,
        maxTitleLength: 100,
        titleWordCount: 6,
      };

      // Act
      await generateChatTitle(mockContext, config);

      // Assert
      expect(mockQuery.chats.findFirst).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should skip title generation for empty text', async () => {
      // Arrange
      const contextWithEmptyText = { ...mockContext, generatedText: '' };

      // Act
      await generateChatTitle(contextWithEmptyText);

      // Assert
      expect(mockQuery.chats.findFirst).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should respect custom word count configuration', async () => {
      // Arrange
      const config: FlushConfig = {
        autoGenerateTitle: true,
        maxTitleLength: 50,
        titleWordCount: 3,
      };
      const contextWithText = {
        ...mockContext,
        generatedText: 'One Two Three Four Five Six Seven',
      };

      // Act
      await generateChatTitle(contextWithText, config);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chats);
    });

    it('should respect max title length configuration', async () => {
      // Arrange
      const config: FlushConfig = {
        autoGenerateTitle: true,
        maxTitleLength: 10,
        titleWordCount: 10,
      };
      const contextWithLongWords = {
        ...mockContext,
        generatedText: 'This is a very long sentence that will exceed the maximum title length',
      };

      // Act
      await generateChatTitle(contextWithLongWords, config);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chats);
    });

    it('should handle database query errors gracefully', async () => {
      // Arrange
      const queryError = new Error('Database query failed');
      mockQuery.chats.findFirst.mockRejectedValue(queryError);

      // Act
      await generateChatTitle(mockContext);

      // Assert
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
      // Should not throw error - title generation is not critical
    });

    it('should handle database update errors gracefully', async () => {
      // Arrange
      const updateError = new Error('Title update failed');
      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(updateError),
        }),
      } as unknown as ReturnType<typeof mockUpdate>);

      // Act
      await generateChatTitle(mockContext);

      // Assert
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
      // Should not throw error - title generation is not critical
    });

    it('should handle whitespace-only text', async () => {
      // Arrange
      const contextWithWhitespace = { ...mockContext, generatedText: '   \n\t   ' };

      // Act
      await generateChatTitle(contextWithWhitespace);

      // Assert
      expect(mockQuery.chats.findFirst).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled(); // Should not update with empty title
    });
  });

  describe('markTurnAsError', () => {
    it('should mark turn as error successfully', async () => {
      // Arrange
      const error = new Error('Processing failed');

      // Act
      await markTurnAsError(mockContext, error);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle missing turnId gracefully', async () => {
      // Arrange
      const contextWithoutTurnId = { ...mockContext, turnId: undefined };
      const error = new Error('Test error');

      // Act
      await markTurnAsError(contextWithoutTurnId, error);

      // Assert
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle database update errors gracefully', async () => {
      // Arrange
      const error = new Error('Original error');
      const updateError = new Error('Update failed');
      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(updateError),
        }),
      } as unknown as ReturnType<typeof mockUpdate>);

      // Act
      await markTurnAsError(mockContext, error);

      // Assert
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
      // Should not throw error - we're already in an error state
    });

    it('should handle error objects with special characters', async () => {
      // Arrange
      const error = new Error('Error with "quotes" & <special> chars');

      // Act
      await markTurnAsError(mockContext, error);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
    });

    it('should handle very long error messages', async () => {
      // Arrange
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);

      // Act
      await markTurnAsError(mockContext, error);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(chatTurns);
    });
  });

  describe('handleFlush', () => {
    beforeEach(() => {
      // Reset the mock to avoid interference between tests
      // jest.clearAllMocks();
      
      // Setup successful mocks
      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof mockUpdate>);

      mockQuery.chats.findFirst.mockResolvedValue(null);
    });

    it('should complete flush operation successfully', async () => {
      // Act
      const result = await handleFlush(mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.textLength).toBe(mockContext.generatedText.length);
      expect(result.error).toBeUndefined();

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should use custom configuration', async () => {
      // Arrange
      const customConfig: FlushConfig = {
        autoGenerateTitle: false,
        maxTitleLength: 50,
        titleWordCount: 3,
      };

      // Act
      const result = await handleFlush(mockContext, customConfig);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle errors and mark turn as failed', async () => {
      // Arrange
      const dbError = new Error('Database operation failed');
      mockUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(dbError),
        }),
      } as unknown as ReturnType<typeof mockUpdate>);

      // Act
      const result = await handleFlush(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(LoggedError);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.textLength).toBe(mockContext.generatedText.length);

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should calculate latency correctly', async () => {
      // Arrange
      const pastTime = Date.now() - 2500; // 2.5 seconds ago
      const contextWithPastTime = { ...mockContext, startTime: pastTime };

      // Act
      const result = await handleFlush(contextWithPastTime);

      // Assert
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(2500);
      expect(result.processingTimeMs).toBeLessThan(3000); // Allow some tolerance
    });

    it('should handle zero-length generated text', async () => {
      // Arrange
      const contextWithEmptyText = { ...mockContext, generatedText: '' };

      // Act
      const result = await handleFlush(contextWithEmptyText);

      // Assert
      expect(result.success).toBe(true);
      expect(result.textLength).toBe(0);
    });

    it('should handle context without optional fields', async () => {
      // Arrange
      const minimalContext: FlushContext = {
        chatId: 'chat-minimal',
        generatedText: 'Minimal text',
        startTime: Date.now() - 1000,
      };

      // Act
      const result = await handleFlush(minimalContext);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should use default configuration when none provided', async () => {
      // Act
      const result = await handleFlush(mockContext);

      // Assert
      expect(result.success).toBe(true);
      // Verify that title generation was attempted (default config enables it)
      expect(mockQuery.chats.findFirst).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_FLUSH_CONFIG', () => {
    it('should export default configuration', () => {
      expect(DEFAULT_FLUSH_CONFIG).toEqual({
        autoGenerateTitle: true,
        maxTitleLength: 100,
        titleWordCount: 6,
      });
    });


  });

  describe('Integration Tests', () => {
    it('should handle complete flush workflow', async () => {
      // This test simulates a complete flush operation with all components
      const startTime = Date.now();
      const fullContext: FlushContext = {
        chatId: 'integration-chat',
        turnId: 5,
        messageId: 100,
        generatedText: 'This is a complete integration test response that should generate a proper title',
        startTime: startTime - 1500,
      };

      // Act
      const result = await handleFlush(fullContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(1500);
      expect(result.textLength).toBe(fullContext.generatedText.length);

      // Verify all operations were called
      expect(mockUpdate).toHaveBeenCalledTimes(3); // Message finalization + turn completion
      // expect(mockQuery.chats.findFirst).toHaveBeenCalled(); // Title generation check
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange - make title generation fail but others succeed
      let updateCallCount = 0;
      mockUpdate.mockImplementation(() => {
        updateCallCount++;
        if (updateCallCount === 1) {
          // First call (finalize message) succeeds
          return {
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          } as unknown as ReturnType<typeof mockUpdate>;
        } else {
          // Second call (complete turn) fails
          return {
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockRejectedValue(new Error('Turn completion failed')),
            }),
          } as unknown as ReturnType<typeof mockUpdate>;
        }
      });

      // Act
      const result = await handleFlush(mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Turn completion failed');
    });
  });
});
