/**
 * @fileoverview Unit tests for chat history message deduplication functionality
 *
 * These tests verify that the chat history middleware only saves new messages
 * and doesn't duplicate previously saved messages from earlier turns.
 *
 * @module __tests__/lib/ai/middleware/chat-history/message-deduplication.test.ts
 */

import { getNewMessages } from '/lib/ai/middleware/chat-history/utility';
import type { DbTransactionType } from '/lib/drizzle-db';
import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';

/*
// Mock database schema
jest.mock('/lib/drizzle-db', () => ({
  schema: {
    chatMessages: {
      role: 'mocked-role-column',
      content: 'mocked-content-column',
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
    },
  },
}));
*/

describe('Message Deduplication', () => {
  let mockTx: jest.Mocked<DbTransactionType>;
  let mockOrderBy: jest.Mock;

  beforeEach(() => {
    // Mock transaction with chainable query methods
    mockOrderBy = jest.fn().mockResolvedValue([]);
    const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
    const theLeftJoin = {
      where: mockWhere,
      select: jest.fn(),
      leftJoin: jest.fn(),
    };
    const mockLeftJoin = jest.fn().mockReturnValue(theLeftJoin);
    const mockFrom = jest
      .fn()
      .mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
    const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
    theLeftJoin.leftJoin.mockReturnValue(theLeftJoin);
    theLeftJoin.select.mockReturnValue({ from: mockFrom });

    mockTx = {
      select: mockSelect,
    } as unknown as jest.Mocked<DbTransactionType>;
  });

  describe('getNewMessages', () => {
    it('should return all messages when chat has no existing messages', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
      ];

      // Mock empty existing messages (new chat)
      mockOrderBy.mockResolvedValue([]);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toEqual(incomingMessages);
      expect(result).toHaveLength(2);
    });

    it('should filter out duplicate messages', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello' }],
        }, // Existing message
        {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Hi there!' }],
        }, // Existing message
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'How are you?' }],
        }, // New message
      ];

      // Mock existing messages in database
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
        { role: 'assistant', content: 'Hi there!', messageOrder: 2 },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'How are you?' }],
      });
    });

    it('should handle complex content structures', async () => {
      // Arrange
      const chatId = 'chat-123';
      const complexContent = [
        { type: 'text' as const, text: 'Hello with metadata' },
      ];
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        { role: 'user' as const, content: complexContent },
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Simple text message' }],
        },
      ];

      // Mock existing message with complex content
      const existingMessages = [
        {
          role: 'user',
          content: JSON.stringify(complexContent),
          messageOrder: 1,
        },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Simple text message' }],
      });
    });

    it('should return empty array when all messages already exist', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello' }],
        },
        {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Hi there!' }],
        },
      ];

      // Mock existing messages that match all incoming messages
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
        { role: 'assistant', content: 'Hi there!', messageOrder: 2 },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle mixed content types correctly', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Text message' }],
        }, // String content
        {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Complex' }],
        }, // Complex content
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'New message' }],
        }, // New message
      ];

      // Mock existing messages with mixed content types
      const existingMessages = [
        { role: 'user', content: 'Text message', messageOrder: 1 },
        {
          role: 'assistant',
          content: '[{"type":"text","text":"Complex"}]',
          messageOrder: 2,
        },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'New message' }],
      });
    });

    it('should be case sensitive for content comparison', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello' }],
        },
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'hello' }],
        }, // Different case
      ];

      // Mock existing message with different case
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
      });
    });

    it('should handle role differences correctly', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello' }],
        },
        {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'Hello' }],
        }, // Same content, different role
      ];

      // Mock existing message with same content but different role
      const existingMessages = [
        { role: 'user', content: 'Hello', messageOrder: 1 },
      ];
      mockOrderBy.mockResolvedValue(existingMessages);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });
  });
});
