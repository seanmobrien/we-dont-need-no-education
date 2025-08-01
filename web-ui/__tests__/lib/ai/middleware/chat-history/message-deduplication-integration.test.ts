/**
 * @fileoverview Integration tests for chat history message deduplication
 * 
 * These tests verify the end-to-end behavior of message deduplication
 * in the chat history middleware when processing multiple conversation turns.
 * 
 * @module __tests__/lib/ai/middleware/chat-history/message-deduplication-integration.test.ts
 */

import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { generateChatId } from '@/lib/ai/core';
import { log } from '@/lib/logger';
import type { DbTransactionType } from '@/lib/drizzle-db';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';
import type { LanguageModelV1CallOptions } from 'ai';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/ai/core');
jest.mock('@/lib/logger');
jest.mock('@/lib/drizzle-db', () => ({
  schema: {
    chats: {
      id: 'mocked-chats-id-column',
      _: { config: { name: 'chats' } }
    },
    chatTurns: {
      _: { config: { name: 'chat_turns' } }
    },
    chatMessages: {
      role: 'mocked-role-column',
      content: 'mocked-content-column',
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
      _: { config: { name: 'chat_messages' } }
    }
  }
}));

const mockGetNextSequence = getNextSequence as jest.MockedFunction<typeof getNextSequence>;
const mockGetNewMessages = getNewMessages as jest.MockedFunction<typeof getNewMessages>;
const mockGenerateChatId = generateChatId as jest.MockedFunction<typeof generateChatId>;
const mockLog = log as jest.MockedFunction<typeof log>;

describe('Message Deduplication Integration', () => {
  let mockTx: jest.Mocked<DbTransactionType>;
  let mockContext: ChatHistoryContext;

  beforeEach(() => {
    // Mock transaction with comprehensive query chain
    mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue([]), // For getLastMessageOrder
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue([]),
            }),
          }),
          orderBy: jest.fn().mockResolvedValue([]), // For getNewMessages
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([{
              messageId: 100,
              content: '',
              role: 'assistant',
            }]),
          }),
          execute: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as jest.Mocked<DbTransactionType>;

    // Mock context
    mockContext = {
      userId: 'user-123',
      chatId: 'existing-chat-456',
      model: 'gpt-4o',
      temperature: 0.7,
      topP: 0.9,
      requestId: 'session-789',
    };

    // Mock functions
    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    mockLog.mockImplementation(() => {});
  });

  describe('First conversation turn (all messages new)', () => {
    it('should save all messages in the first turn', async () => {
      // Arrange - First conversation turn
      const firstTurnMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I am doing well, thank you!' },
        { role: 'user', content: 'What can you help me with?' }
      ];

      const mockParams: LanguageModelV1CallOptions = {
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: firstTurnMessages,
      };

      // Mock getNewMessages to return all messages (first turn)
      mockGetNewMessages.mockResolvedValue(firstTurnMessages);
      
      // Mock sequence generation: turn ID + message IDs for all messages + assistant response
      mockGetNextSequence
        .mockResolvedValueOnce([1]) // Turn ID
        .mockResolvedValueOnce([10, 11, 12, 13]); // 3 prompt messages + 1 assistant

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', firstTurnMessages);
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
        tableName: 'chat_messages',
        chatId: 'existing-chat-456',
        turnId: 1,
        count: 4, // 3 new messages + 1 assistant response
        tx: mockTx,
      });
      
      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(1);
      expect(result.messageId).toBe(13); // Last message ID for assistant
    });
  });

  describe('Second conversation turn (some messages duplicate)', () => {
    it('should only save new messages in subsequent turns', async () => {
      // Arrange - Second turn with conversation history included
      const secondTurnMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello, how are you?' },        // Duplicate from turn 1
        { role: 'assistant', content: 'I am doing well, thank you!' },  // Duplicate from turn 1
        { role: 'user', content: 'What can you help me with?' }, // Duplicate from turn 1
        { role: 'user', content: 'Can you write a poem?' }       // NEW message
      ];

      const newMessages = [
        { role: 'user', content: 'Can you write a poem?' } // Only the new message
      ];

      const mockParams: LanguageModelV1CallOptions = {
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: secondTurnMessages,
      };

      // Mock getNewMessages to return only the new message
      mockGetNewMessages.mockResolvedValue(newMessages);
      
      // Mock sequence generation: turn ID + message IDs for new messages + assistant response
      mockGetNextSequence
        .mockResolvedValueOnce([2]) // Turn ID
        .mockResolvedValueOnce([20, 21]); // 1 new message + 1 assistant response

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', secondTurnMessages);
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
        tableName: 'chat_messages',
        chatId: 'existing-chat-456',
        turnId: 2,
        count: 2, // 1 new message + 1 assistant response
        tx: mockTx,
      });
      
      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(2);
      expect(result.messageId).toBe(21); // Last message ID for assistant
    });
  });

  describe('Third conversation turn (no new messages)', () => {
    it('should handle turns with no new user messages', async () => {
      // Arrange - Turn with only existing messages (e.g., retry scenario)
      const thirdTurnMessages: LanguageModelV1CallOptions['prompt'] = [
        { role: 'user', content: 'Hello, how are you?' },        // Duplicate
        { role: 'assistant', content: 'I am doing well, thank you!' },  // Duplicate
        { role: 'user', content: 'What can you help me with?' }, // Duplicate
        { role: 'user', content: 'Can you write a poem?' }       // Duplicate
      ];

      const newMessages: LanguageModelV1CallOptions['prompt'] = []; // No new messages

      const mockParams: LanguageModelV1CallOptions = {
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: thirdTurnMessages,
      };

      // Mock getNewMessages to return empty array
      mockGetNewMessages.mockResolvedValue(newMessages);
      
      // Mock sequence generation: turn ID + message ID for assistant response only
      mockGetNextSequence
        .mockResolvedValueOnce([3]) // Turn ID
        .mockResolvedValueOnce([30]); // Only 1 assistant response

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', thirdTurnMessages);
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
        tableName: 'chat_messages',
        chatId: 'existing-chat-456',
        turnId: 3,
        count: 1, // Only 1 assistant response
        tx: mockTx,
      });
      
      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(3);
      expect(result.messageId).toBe(30); // Assistant message ID
    });
  });

  describe('Edge cases', () => {
    it('should handle empty prompt arrays gracefully', async () => {
      // Arrange
      const mockParams: LanguageModelV1CallOptions = {
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: [],
      };

      // Mock getNewMessages to return empty array
      mockGetNewMessages.mockResolvedValue([]);
      
      // Mock sequence generation: turn ID + assistant response only
      mockGetNextSequence
        .mockResolvedValueOnce([4]) // Turn ID
        .mockResolvedValueOnce([40]); // Only assistant response

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', []);
      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(4);
      expect(result.messageId).toBe(40);
    });
  });
});