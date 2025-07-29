/**
 * @fileoverview Unit tests for chat history message deduplication functionality
 * 
 * These tests verify that the chat history middleware only saves new messages
 * and doesn't duplicate previously saved messages from earlier turns.
 * 
 * @module __tests__/lib/ai/middleware/chat-history/message-deduplication.test.ts
 */

import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import { schema } from '@/lib/drizzle-db';
import type { DbTransactionType } from '@/lib/drizzle-db';
import type { LanguageModelV1CallOptions } from 'ai';

// Mock database schema
jest.mock('@/lib/drizzle-db', () => ({
  schema: {
    chatMessages: {
      role: 'mocked-role-column',
      content: 'mocked-content-column',
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
    }
  }
}));

describe('Message Deduplication', () => {
  let mockTx: jest.Mocked<DbTransactionType>;

  beforeEach(() => {
    // Mock transaction with chainable query methods
    mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue([]), // Return empty array by default
          }),
        }),
      }),
    } as unknown as jest.Mocked<DbTransactionType>;
  });

  describe('getNewMessages', () => {
    it('should return all messages when chat has no existing messages', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      // Mock empty existing messages (new chat)
      mockTx.select().from().where().orderBy.mockResolvedValue([]);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toEqual(incomingMessages);
      expect(result).toHaveLength(2);
    });

    it('should filter out duplicate messages', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello' },           // Existing message
        { role: 'assistant', content: 'Hi there!' },  // Existing message
        { role: 'user', content: 'How are you?' }     // New message
      ];

      // Mock existing messages in database
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
        { role: 'assistant', content: 'Hi there!', messageOrder: 2 }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ role: 'user', content: 'How are you?' });
    });

    it('should handle complex content structures', async () => {
      // Arrange
      const chatId = 'chat-123';
      const complexContent = [{ type: 'text', text: 'Hello with metadata' }];
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: complexContent },
        { role: 'user', content: 'Simple text message' }
      ];

      // Mock existing message with complex content
      const existingMessages = [
        { 
          role: 'user', 
          content: JSON.stringify(complexContent), 
          messageOrder: 1 
        }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ role: 'user', content: 'Simple text message' });
    });

    it('should return empty array when all messages already exist', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      // Mock existing messages that match all incoming messages
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
        { role: 'assistant', content: 'Hi there!', messageOrder: 2 }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle mixed content types correctly', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Text message' },                    // String content
        { role: 'assistant', content: [{ type: 'text', text: 'Complex' }] }, // Complex content
        { role: 'user', content: 'New message' }                      // New message
      ];

      // Mock existing messages with mixed content types
      const existingMessages = [
        { role: 'user', content: 'Text message', messageOrder: 1 },
        { role: 'assistant', content: '[{"type":"text","text":"Complex"}]', messageOrder: 2 }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ role: 'user', content: 'New message' });
    });

    it('should be case sensitive for content comparison', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'hello' }  // Different case
      ];

      // Mock existing message with different case
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ role: 'user', content: 'hello' });
    });

    it('should handle role differences correctly', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hello' }  // Same content, different role
      ];

      // Mock existing message with same content but different role
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 }
      ];
      mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ role: 'assistant', content: 'Hello' });
    });
  });
});