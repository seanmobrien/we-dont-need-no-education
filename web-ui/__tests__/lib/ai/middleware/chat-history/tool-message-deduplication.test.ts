/**
 * @fileoverview Unit tests for tool message deduplication functionality
 *
 * These tests verify that tool messages are properly deduplicated using providerId
 * and that the upsert logic works correctly for tool calls and results.
 *
 * @module __tests__/lib/ai/middleware/chat-history/tool-message-deduplication.test.ts
 */

import { upsertToolMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import type { DbTransactionType } from '@/lib/drizzle-db';
import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';

// Mock database schema
jest.mock('@/lib/drizzle-db', () => ({
  schema: {
    chatMessages: {
      chatMessageId: 'mocked-chat-message-id',
      messageId: 'mocked-message-id',
      turnId: 'mocked-turn-id',
      functionCall: 'mocked-function-call',
      toolResult: 'mocked-tool-result',
      metadata: 'mocked-metadata',
      optimizedContent: 'mocked-optimized-content',
      role: 'mocked-role-column',
      content: 'mocked-content-column',
      messageOrder: 'mocked-order-column',
      chatId: 'mocked-chatid-column',
      providerId: 'mocked-provider-id-column',
      toolName: 'mocked-tool-name-column',
    },
    chatToolCalls: {
      chatMessageId: 'mocked-tool-calls-message-id',
      input: 'mocked-tool-calls-input',
      output: 'mocked-tool-calls-output',
    },
    chatTool: {
      chatToolId: 'mocked-chat-tool-id',
      toolName: 'mocked-chat-tool-name',
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('Tool Message Deduplication', () => {
  let mockTx: jest.Mocked<DbTransactionType>;
  let mockSelect: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSet: jest.Mock;
  let mockWhere: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transaction methods
    mockWhere = jest.fn().mockResolvedValue(undefined);
    mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    mockUpdate = jest.fn().mockReturnValue({ set: mockSet });
    
    const mockFrom = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
        orderBy: jest.fn().mockResolvedValue([]),
      }),
      leftJoin: jest.fn().mockReturnThis(),
    });

    mockSelect = jest.fn().mockReturnValue({ 
      from: mockFrom,
    });

    mockTx = {
      select: mockSelect,
      update: mockUpdate,
    } as unknown as jest.Mocked<DbTransactionType>;
  });

  describe('upsertToolMessage', () => {
    it('should return null when providerId is not present', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        providerId: null,
        toolName: 'testTool',
        functionCall: { args: { test: 'value' } },
      };

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBeNull();
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should return null when no existing message is found', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        toolName: 'testTool',
        functionCall: { args: { test: 'value' } },
      };

      // Mock empty result (no existing message)
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest.fn().mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBeNull();
      expect(mockSelect).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should skip update when current turn is not greater than modifiedTurnId', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        toolName: 'testTool',
        toolResult: { result: 'success' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        turnId: 1,
        functionCall: { args: { test: 'value' } },
        toolResult: null,
        metadata: { modifiedTurnId: 3 }, // Higher than current turn
        optimizedContent: 'existing content',
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest.fn().mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should update existing message when current turn is greater', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 4;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        toolName: 'testTool',
        toolResult: { result: 'success' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        turnId: 1,
        functionCall: { args: { test: 'value' } },
        toolResult: null,
        metadata: { modifiedTurnId: 2 },
        optimizedContent: 'existing content',
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest.fn().mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        turnId: 4,
        toolName: 'testTool',
        metadata: {
          modifiedTurnId: 4,
        },
        optimizedContent: null,
        toolResult: { result: 'success' },
      });
    });

    it('should preserve existing functionCall when adding toolResult', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 3;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        toolName: 'testTool',
        toolResult: { result: 'success' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        turnId: 1,
        functionCall: { args: { test: 'existing' } },
        toolResult: null,
        metadata: {},
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest.fn().mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          toolResult: { result: 'success' },
          // functionCall should NOT be included since it already exists
        })
      );
      
      const setCallArgs = mockSet.mock.calls[0][0];
      expect(setCallArgs).not.toHaveProperty('functionCall');
    });

    it('should add functionCall when it does not exist', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 3;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        toolName: 'testTool',
        functionCall: { args: { test: 'new' } },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        turnId: 1,
        functionCall: null,
        toolResult: null,
        metadata: {},
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest.fn().mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          functionCall: { args: { test: 'new' } },
        })
      );
    });
  });

  describe('getNewMessages - tool message deduplication', () => {
    it('should filter out tool messages with existing provider IDs', async () => {
      // Arrange
      const chatId = 'chat-123';
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Call a tool' }],
        },
        {
          role: 'assistant',
          content: [{
            type: 'tool-call',
            toolCallId: 'call_existing123',
            toolName: 'testTool',
            args: { param: 'value' }
          }],
        },
        {
          role: 'tool',
          content: [{
            type: 'tool-result',
            toolCallId: 'call_existing123',
            result: { output: 'result' }
          }],
        },
        {
          role: 'assistant',
          content: [{
            type: 'tool-call',
            toolCallId: 'call_new456',
            toolName: 'newTool',
            args: { param: 'new' }
          }],
        },
      ];

      // Mock existing messages with one tool call
      const existingMessages = [
        {
          role: 'user',
          content: 'Call a tool',
          messageOrder: 1,
          providerId: null,
        },
        {
          role: 'tool', 
          content: null,
          messageOrder: 2,
          providerId: 'call_existing123',
        },
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
      const mockWhereClause = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = jest.fn().mockReturnThis();
      const mockFromClause = jest.fn().mockReturnValue({ 
        leftJoin: mockLeftJoin,
        where: mockWhereClause 
      });

      mockSelect.mockReturnValue({ from: mockFromClause });
      
      // Mock the leftJoin chain
      const chainedMock = {
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      };
      mockLeftJoin.mockReturnValue(chainedMock);

      // Act
      const result = await getNewMessages(mockTx, chatId, incomingMessages);

      // Assert
      expect(result).toHaveLength(1); // Should exclude existing messages and only include new tool call
      
      // Should include the new tool call
      expect(result.some((msg: any) => 
        Array.isArray(msg.content) && 
        msg.content.some((part: any) => part.toolCallId === 'call_new456')
      )).toBe(true);
      
      // Should exclude the existing tool call
      expect(result.some((msg: any) => 
        Array.isArray(msg.content) && 
        msg.content.some((part: any) => part.toolCallId === 'call_existing123')
      )).toBe(false);
    });
  });
});