
/**
 * @fileoverview Unit tests for chat history import incoming message functionality
 *
 * These tests verify the behavior of importing incoming messages and setting up
 * the initial database state for new chat turns.
 *
 * @module __tests__/lib/ai/middleware/chat-history/import-incoming-message.test.ts
 */

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { schema } from '@/lib/drizzle-db';
import {
  getNextSequence,
  getNewMessages,
} from '@/lib/ai/middleware/chat-history/utility';
import { generateChatId } from '@/lib/ai/core';
import { log } from '@/lib/logger';
import type { DbTransactionType } from '@/lib/drizzle-db';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { LanguageModelV2CallOptions } from '@ai-sdk/provider';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/ai/core');
jest.mock('@/lib/logger');
/*
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
      _: { config: { name: 'chat_messages' } },
    },
  },
}));
*/

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

describe('Import Incoming Message', () => {
  let mockTx: jest.Mocked<DbTransactionType>;
  let mockContext: ChatHistoryContext;
  let mockParams: any;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Mock transaction
    mockTx = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([]), // For getLastMessageOrder
            }),
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
      chatId: 'chat-456',
      model: 'gpt-4o',
      requestId: 'session-789',
    });

    // Mock params
    mockParams = {
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello, how are you?' }],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'I am doing well, thank you!' }],
        },
      ],
    };

    // Setup default mocks
    mockGetNextSequence
      .mockResolvedValueOnce([1]) // Turn ID
      .mockResolvedValueOnce([10, 11, 12]); // Message IDs

    // Mock getNewMessages to return all messages as new by default (backwards compatible)
    // This will be overridden by specific tests as needed
    mockGetNewMessages.mockImplementation((_tx, _chatId, incomingMessages) =>
      Promise.resolve(incomingMessages),
    );

    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
  });

  describe('Chat Creation', () => {
    it('should create new chat when chatId does not exist', async () => {
      // Arrange
      mockTx.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue([]), // No existing chat
            }),
          }),
        }),
      } as unknown as ReturnType<typeof mockTx.select>);

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockTx.insert).toHaveBeenCalledWith(schema.chats);
      expect(result.chatId).toBe('chat-456');
      expect(result.turnId).toBe(1);
    });

    it('should skip chat creation when chat already exists', async () => {
      // Arrange
      mockTx.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue([{ id: 'chat-456' }]), // Existing chat
            }),
          }),
        }),
      } as unknown as ReturnType<typeof mockTx.select>);

      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
      // Should still create turn and messages even if chat exists
      expect(mockTx.insert).toHaveBeenCalledWith(schema.chatTurns);
      expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
    });

    it('should generate chatId when not provided in context', async () => {
      // Arrange
      const contextWithoutChatId = { ...mockContext, chatId: undefined };

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: contextWithoutChatId,
        params: mockParams,
      });

      // Assert
      expect(mockGenerateChatId).toHaveBeenCalledWith(1);
      expect(result.chatId).toBe('generated-chat-id');
    });

    it('should handle numeric chatId in context', async () => {
      // Arrange
      const contextWithNumericChatId = {
        ...mockContext,
        chatId: 123 as unknown as string,
      };

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: contextWithNumericChatId,
        params: mockParams,
      });

      // Assert
      expect(mockGenerateChatId).toHaveBeenCalledWith(123);
      expect(result.chatId).toBe('generated-chat-id');
    });

    it('should include chat metadata', async () => {
      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      const insertCall = mockTx.insert.mock.calls.find(
        (call) => call[0] === schema.chats,
      );
      expect(insertCall).toBeDefined();
    });
  });

  describe('Turn Creation', () => {
    it('should create chat turn with correct properties', async () => {
      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNextSequence).toHaveBeenCalledWith({
        tableName: 'chat_turns',
        chatId: 'chat-456',
        tx: mockTx,
      });

      expect(mockTx.insert).toHaveBeenCalledWith(schema.chatTurns);
      expect(result.turnId).toBe(1);
    });

    it('should handle getNextSequence failure for turn ID', async () => {
      // Arrange
      mockGetNextSequence.mockReset();
      mockGetNextSequence.mockRejectedValueOnce(
        new Error('Failed to get turn sequence'),
      );

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Failed to get turn sequence');
    });

    it('should handle empty turn ID response', async () => {
      // Arrange
      mockGetNextSequence.mockReset();
      mockGetNextSequence.mockResolvedValueOnce([]); // Empty array

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Unexpected failure retrieving next turn sequence');
    });

    it('should include turn metadata from context', async () => {
      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      const turnInsertCall = mockTx.insert.mock.calls.find(
        (call) => call[0] === schema.chatTurns,
      );
      expect(turnInsertCall).toBeDefined();
    });
  });

  describe('Message Creation', () => {
    it('should create messages for all prompt entries', async () => {
      // Arrange
      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7]) // Turn ID
        .mockResolvedValueOnce([10, 11, 12]); // Message IDs (exactly 3 for 2 prompt + 1 assistant)

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(mockGetNextSequence).toHaveBeenCalledWith({
        tableName: 'chat_messages',
        chatId: 'chat-456',
        turnId: 1,
        count: 2, // 2 prompt messages + 1 assistant message
        tx: mockTx,
      });

      expect(result.nextMessageOrder).toBe(3); // After user + assistant + new assistant
    });

    it('should handle insufficient message IDs', async () => {
      // Arrange
      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([10]); // Only 1 ID instead of 3

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Failed to reserve enough message ids');
    });

    it('should handle messages with tool calls', async () => {
      // Arrange
      const paramsWithToolCall: LanguageModelV2CallOptions = {
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Use a tool please' }],
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'tool-123',
                toolName: 'search',
                input: { query: 'test' },
              },
            ],
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: 'tool-123',
                toolName: 'search',
                output: { type: 'text', value: 'search results' },
              },
            ],
          },
        ],
      };

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([10, 11, 12, 13]);

      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: paramsWithToolCall,
      });

      // Assert
      expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
    });

    it('should handle messages with string content', async () => {
      // Arrange
      const paramsWithStringContent: LanguageModelV2CallOptions = {
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Simple string message' }],
          },
        ],
      };

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([10, 11]);

      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: paramsWithStringContent,
      });

      // Assert
      expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
    });

    it('should assign correct message order', async () => {
      // Arrange
      const multiMessageParams: LanguageModelV2CallOptions = {
        prompt: [
          { role: 'user', content: [{ type: 'text', text: 'Message 1' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'Message 2' }] },
          { role: 'user', content: [{ type: 'text', text: 'Message 3' }] },
        ],
      };

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([10, 11, 12, 13]);

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: multiMessageParams,
      });

      // Assert
      expect(result.nextMessageOrder).toBe(4); // 3 messages + 1 assistant message
    });
  });

  describe('Context Variations', () => {
    it('should handle minimal context', async () => {
      // Arrange
      const minimalContext: ChatHistoryContext = createUserChatHistoryContext({
        userId: 'user-minimal',
      });

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1, 2, 3, 4, 5, 6]) // Turn ID
        .mockResolvedValueOnce([10, 11, 12]); // Message IDs

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: minimalContext,
        params: mockParams,
      });

      // Assert
      expect(result.chatId).toBeDefined();
      expect(result.turnId).toBe(1);
    });

    it('should handle context with all optional fields', async () => {
      // Arrange
      const fullContext: ChatHistoryContext = createUserChatHistoryContext({
        userId: 'user-full',
        chatId: 'chat-full',
        requestId: 'session-full',
        model: 'gpt-4-turbo',
      });

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: fullContext,
        params: mockParams,
      });

      // Assert
      expect(result.chatId).toBe('chat-full');
    });

    it('should handle empty prompt array', async () => {
      // Arrange
      const emptyParams: LanguageModelV2CallOptions = {
        prompt: [],
      };

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1, 2, 3, 4, 5])
        .mockResolvedValueOnce([10, 11]);

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: emptyParams,
      });

      // Assert
      expect(result.nextMessageOrder).toBe(1); // Only assistant message
    });

    it('should handle numeric userId', async () => {
      // Arrange
      const contextWithNumericUserId = { ...mockContext, userId: '123' };
      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1, 2, 3, 4, 5])
        .mockResolvedValueOnce([10, 11]);
      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: contextWithNumericUserId,
        params: mockParams,
      });

      // Assert
      expect(result.chatId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should propagate database transaction errors', async () => {
      // Arrange
      const dbError = new Error('Transaction failed');
      mockTx.insert.mockReturnValue({
        values: jest.fn().mockRejectedValue(dbError),
      } as unknown as ReturnType<typeof mockTx.insert>);

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle chat existence check errors', async () => {
      // Arrange
      const checkError = new Error('Chat check failed');
      mockTx.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockRejectedValue(checkError),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof mockTx.select>);

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Chat check failed');
    });

    it('should handle message insertion errors', async () => {
      // Arrange
      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([1]) // Turn ID
        .mockResolvedValueOnce([10, 11, 12]); // Message IDs

      // Reset the mock to a clean state
      mockTx.insert.mockReset();

      let insertCallCount = 0;
      mockTx.insert.mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 3) {
          // Fail on message insertion (3rd call)
          throw new Error('Message insert failed');
        }
        return {
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
        } as unknown as ReturnType<typeof mockTx.insert>;
      });

      // Act & Assert
      await expect(
        importIncomingMessage({
          tx: mockTx,
          context: mockContext,
          params: mockParams,
        }),
      ).rejects.toThrow('Message insert failed');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with tool calls', async () => {
      // Arrange
      const complexParams: LanguageModelV2CallOptions = {
        prompt: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Search for recent news about AI' },
            ],
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'search-1',
                toolName: 'web_search',
                input: { query: 'recent AI news' },
              },
            ],
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: 'search-1',
                toolName: 'web_search',
                output: { type: 'text', value: 'Found 10 articles about AI' },
              },
            ],
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'Based on my search, here are the latest AI developments...',
              },
            ],
          },
        ],
      };

      mockGetNextSequence.mockReset();
      mockGetNextSequence
        .mockResolvedValueOnce([5]) // Turn ID
        .mockResolvedValueOnce([50, 51, 52, 53, 54, 55]); // Message IDs

      // Act
      const result = await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: complexParams,
      });

      // Assert
      expect(result.chatId).toBe('chat-456');
      expect(result.turnId).toBe(5);
      expect(result.nextMessageOrder).toBe(6); // 5 messages + 1 new assistant
    });

    /**

"[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"test\"}]},{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Hello! How can I assist you today? If you're running a test, everything seems to be working. Let me know what you need!\"}]},{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"ping\"}]},{\"role\":\"assistant\",\"content\":[{\"type\":\"tool-call\",\"toolCallId\":\"call_juCFW4lz0ScBOFe8Jdeh8Is5\",\"toolName\":\"playPingPong\",\"input\":{\"userPing\":\"ping\",\"assistantPong\":\"pong\",\"roundHistory\":[[\"ping\",\"pong\"]]}}]},{\"role\":\"tool\",\"content\":[{\"type\":\"tool-result\",\"toolCallId\":\"call_juCFW4lz0ScBOFe8Jdeh8Is5\",\"toolName\":\"playPingPong\",\"output\":{\"type\":\"json\",\"value\":{\"content\":[{\"type\":\"text\",\"text\":\"tool success\"}],\"isError\":false,\"structuredContent\":{\"result\":{\"isError\":false,\"value\":{\"result\":0}}}}}}]}
 */

    /*

    it('should maintain consistency across all database operations', async () => {
      // This test ensures all operations use the same chatId and turnId
      const capturedValues: unknown[] = [];

      const originalInsert = mockTx.insert;
      mockTx.insert = jest.fn().mockImplementation((table) => {
        const result = originalInsert(table);
        const originalValues = result.values;
        result.values = jest.fn().mockImplementation((values) => {
          capturedValues.push({
            table: (table as { _: { config: { name: string } } })._.config.name,
            values,
          });
          if (table === schema.chatMessages && Array.isArray(values)) {
            return {
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
            };
          }
          return originalValues(values);
        });
        return result;
      });

      // Act
      await importIncomingMessage({
        tx: mockTx,
        context: mockContext,
        params: mockParams,
      });

      // Assert
      expect(capturedValues.length).toBeGreaterThan(0);
      // All operations should use the same chatId
      const chatOperations = capturedValues.filter(
        (v) => typeof v === 'object' && v !== null && 'values' in v,
      );
      expect(chatOperations.length).toBeGreaterThan(0);
    });
  */
  });
});
