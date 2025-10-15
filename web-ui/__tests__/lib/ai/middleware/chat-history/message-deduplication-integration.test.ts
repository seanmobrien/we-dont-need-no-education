 
/**
 * @fileoverview Integration tests for chat history message deduplication
 *
 * These tests verify the end-to-end behavior of message deduplication
 * in the chat history middleware when processing multiple conversation turns.
 *
 * @module __tests__/lib/ai/middleware/chat-history/message-deduplication-integration.test.ts
 */

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { generateChatId } from '@/lib/ai/core';
import { log } from '@/lib/logger';
import type { DbTransactionType } from '@/lib/drizzle-db';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';
import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/ai/core');
jest.mock('@/lib/logger');
jest.mock('@/lib/drizzle-db', () => ({
  schema: {
    chats: {
      id: 'mocked-chats-id-column',
      _: { config: { name: 'chats' } },
    },
    chatTurns: {
      _: { config: { name: 'chat_turns' } },
    },
    chatMessages: {
      role: 'mocked-role-column',
      content: 'mocked-content-column',
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
      _: { config: { name: 'chat_messages' } },
    },
  },
}));

const mockGetNextSequence = getNextSequence as jest.MockedFunction<
  typeof getNextSequence
>;
const mockGetNewMessages = getNewMessages as jest.MockedFunction<
  typeof getNewMessages
>;
const mockGenerateChatId = generateChatId as jest.MockedFunction<
  typeof generateChatId
>;
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
            execute: jest.fn().mockResolvedValue([
              {
                messageId: 100,
                content: '',
                role: 'assistant',
              },
            ]),
          }),
          execute: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as jest.Mocked<DbTransactionType>;

    // Mock context
    mockContext = createUserChatHistoryContext({
      userId: 'user-123',
      chatId: 'existing-chat-456',
      model: 'gpt-4o',
      requestId: 'session-789',
    });

    // Mock functions
    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    mockLog.mockImplementation((cb: any) =>
      cb({
        verbose: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }),
    );

    // Reset mocks between tests
    mockGetNextSequence.mockReset();
    mockGetNewMessages.mockReset();
  });

  describe('First conversation turn (all messages new)', () => {
    it('should save all messages in the first turn', async () => {
      // Arrange - First conversation turn
      const firstTurnMessages = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello, how are you?' }],
          messageOrder: 1,
        },
        {
          role: 'assistant' as const,
          content: [
            { type: 'text' as const, text: 'I am doing well, thank you!' },
          ],
          messageOrder: 2,
        },
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What can you help me with?' },
          ],
          messageOrder: 3,
        },
      ];

      const mockParams: LanguageModelV2CallOptions = {
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
      expect(mockGetNewMessages).toHaveBeenCalledWith(
        mockTx,
        'existing-chat-456',
        firstTurnMessages,
        1, // currentTurnId
      );
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
        tableName: 'chat_messages',
        chatId: 'existing-chat-456',
        turnId: 1,
        count: 3, // 3 new messages
        tx: mockTx,
      });

      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(1);
    });
  });

  describe('Second conversation turn (some messages duplicate)', () => {
    it('should only save new messages in subsequent turns', async () => {
      // Arrange - Second turn with conversation history included
      const secondTurnMessages = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello, how are you?' }],
          messageOrder: 1,
        }, // Duplicate from turn 1
        {
          role: 'assistant' as const,
          content: [
            { type: 'text' as const, text: 'I am doing well, thank you!' },
          ],
          messageOrder: 2,
        }, // Duplicate from turn 1
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What can you help me with?' },
          ],
          messageOrder: 3,
        }, // Duplicate from turn 1
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Can you write a poem?' }],
          messageOrder: 4,
        }, // NEW message
      ];

      const newMessages = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Can you write a poem?' }],
        }, // Only the new message
      ];

      const mockParams: LanguageModelV2CallOptions = {
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
      expect(mockGetNewMessages).toHaveBeenCalledWith(
        mockTx,
        'existing-chat-456',
        secondTurnMessages,
        2, // currentTurnId
      );
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
        tableName: 'chat_messages',
        chatId: 'existing-chat-456',
        turnId: 2,
        count: 1,
        tx: mockTx,
      });

      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(2);
    });
  });

  describe('Third conversation turn (no new messages)', () => {
    it('should handle turns with no new user messages', async () => {
      // Arrange - Turn with only existing messages (e.g., retry scenario)
      const thirdTurnMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello, how are you?' }],
        }, // Duplicate
        {
          role: 'assistant' as const,
          content: [
            { type: 'text' as const, text: 'I am doing well, thank you!' },
          ],
        }, // Duplicate
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What can you help me with?' },
          ],
        }, // Duplicate
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Can you write a poem?' }],
        }, // Duplicate
      ];

      const newMessages: LanguageModelV2CallOptions['prompt'] = []; // No new messages

      const mockParams: LanguageModelV2CallOptions = {
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
      expect(mockGetNewMessages).toHaveBeenCalledWith(
        mockTx,
        'existing-chat-456',
        thirdTurnMessages,
        3, // currentTurnId
      );
      expect(mockGetNextSequence).toHaveBeenNthCalledWith(1, {
        tableName: 'chat_turns',
        chatId: 'existing-chat-456',
        tx: mockTx,
      });

      expect(result.chatId).toBe('existing-chat-456');
      expect(result.turnId).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty prompt arrays gracefully', async () => {
      // Arrange
      const mockParams: LanguageModelV2CallOptions = {
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
        context: createUserChatHistoryContext({
          userId: 'user-123',
          chatId: 'existing-chat-456',
          model: 'gpt-4o',
          requestId: 'session-789',
        }),
        params: mockParams,
      });

      // Assert
      expect(mockGetNewMessages).toHaveBeenCalledWith(
        mockTx,
        'existing-chat-456',
        [],
        4, // currentTurnId
      );
      expect(result.chatId).toBe('existing-chat-456');
    });
  });
});
