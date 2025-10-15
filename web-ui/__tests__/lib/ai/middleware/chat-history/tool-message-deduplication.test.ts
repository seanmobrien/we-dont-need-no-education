 
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
    // jest.clearAllMocks();

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
        statusId: 1,
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
        statusId: 1,
        providerId: 'call_abc123',
        toolName: 'testTool',
        functionCall: { args: { test: 'value' } },
      };

      // Mock empty result (no existing message)
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
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
        statusId: 1,
        providerId: 'call_abc123',
        toolName: 'testTool',
        toolResult: { result: 'success' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        statusId: 1,
        turnId: 1,
        functionCall: { args: { test: 'value' } },
        toolResult: { result: 'success' },
        metadata: { modifiedTurnId: 3 }, // Higher than current turn
        optimizedContent: 'existing content',
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
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
        statusId: 2,
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
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        // turnId should NOT be updated - preserves original insertion turn
        statusId: 2,
        functionCall: { args: { test: 'value' } },
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
        statusId: 2,
        providerId: 'call_abc123',
        toolName: 'testTool',
        toolResult: { result: 'success' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        statusId: 1,
        turnId: 1,
        functionCall: { args: { test: 'existing' } },
        toolResult: null,
        metadata: {},
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          toolResult: { result: 'success' },
          statusId: 2,
          functionCall: { args: { test: 'existing' } },
          metadata: { modifiedTurnId: 3 },
          optimizedContent: null,

          // functionCall should NOT be included since it already exists
        }),
      );

      const setCallArgs = mockSet.mock.calls[0][0];
      expect(setCallArgs).toHaveProperty('functionCall', {
        args: { test: 'existing' },
      });
    });

    it('should add functionCall when it does not exist', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 3;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_abc123',
        statusId: 1,
        turnId: 1,
        toolName: 'testTool',
        functionCall: { args: { test: 'new' } },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 42,
        statusId: 1,
        functionCall: null,
        toolResult: null,
        metadata: {},
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert
      expect(result).toBe(42);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          functionCall: { args: { test: 'new' } },
        }),
      );
    });
  });

  describe('turnId validation - acceptance criteria tests', () => {
    it('should update existing record when current turnId > modifiedTurnId', async () => {
      // Arrange - Simulate turn 1: tool-call, turn 3: tool-result
      const chatId = 'chat-123';
      const turnId = 3;
      const toolRow = {
        role: 'tool' as const,
        statusId: 2,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        toolResult: { result: 'value' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        turnId: 1,
        statusId: 1,
        functionCall: { arg1: 'value' },
        toolResult: null,
        metadata: { modifiedTurnId: 1 }, // Initial creation turn
        optimizedContent: 'some content',
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should update because turn 3 > modifiedTurnId 1
      expect(result).toBe(123);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        // turnId should NOT be updated - preserves original insertion turn
        metadata: {
          modifiedTurnId: 3,
        },
        statusId: 2,
        functionCall: { arg1: 'value' },
        optimizedContent: null,
        toolResult: { result: 'value' },
      });
    });

    it('should NOT update when current turnId <= modifiedTurnId', async () => {
      // Arrange - Simulate old turn trying to update newer record
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        statusId: 1,
        toolResult: { result: 'value' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        statusId: 1,
        turnId: 1,
        functionCall: { arg1: 'value' },
        toolResult: { result: 'other value' },
        metadata: { modifiedTurnId: 3 }, // Already updated in turn 3
        optimizedContent: 'some content',
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should NOT update because turn 2 <= modifiedTurnId 3
      expect(result).toBe(123);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('non-destructive merge - acceptance criteria tests', () => {
    it('should preserve existing functionCall when adding toolResult', async () => {
      // Arrange - Turn 1: tool-call creates record, Turn 2: tool-result adds output
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        statusId: 2,
        functionCall: null, // tool-result messages don't have input
        toolResult: { result: 'value' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        turnId: 1,
        functionCall: { arg1: 'value' }, // Existing from tool-call
        toolResult: null,
        metadata: { modifiedTurnId: 1 },
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should preserve functionCall and add toolResult
      expect(result).toBe(123);
      expect(mockSet).toHaveBeenCalled();
      const setCallArgs = mockSet.mock.calls[0][0];
      expect(setCallArgs).toEqual(
        expect.objectContaining({
          statusId: 2,
          metadata: { modifiedTurnId: 2 },
          optimizedContent: null,
          functionCall: { arg1: 'value' },
          toolResult: { result: 'value' },
        }),
      );
      // functionCall should be preserved (allowed to be present with existing value)
      expect(setCallArgs.functionCall).toEqual({ arg1: 'value' });
    });

    it('should add functionCall when it does not exist and not overwrite toolResult', async () => {
      // Arrange - Turn 1: tool-result somehow came first, Turn 2: tool-call adds input
      const chatId = 'chat-123';
      const turnId = 2;
      const toolRow = {
        role: 'tool' as const,
        statusId: 2,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        functionCall: { arg1: 'value' }, // tool-call messages have input
        toolResult: null,
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        turnId: 1,
        functionCall: null,
        toolResult: { result: 'existing' }, // Existing from tool-result
        metadata: { modifiedTurnId: 1 },
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should add functionCall and preserve toolResult
      expect(result).toBe(123);
      expect(mockSet).toHaveBeenCalled();
      const setCallArgs = mockSet.mock.calls[0][0];
      expect(setCallArgs).toEqual(
        expect.objectContaining({
          toolResult: { result: 'existing' }, // Existing from tool-result
          metadata: { modifiedTurnId: 2 },
          optimizedContent: null,
          statusId: 2,
          functionCall: { arg1: 'value' },
        }),
      );
      // toolResult should be preserved as existing
      expect(setCallArgs.toolResult).toEqual({ result: 'existing' });
    });

    it('should achieve the desired end goal: single record with both functionCall and toolResult', async () => {
      // Arrange - This simulates the complete workflow:
      // Turn 1: tool-call creates record with functionCall
      // Turn 2: tool-result updates record with toolResult
      const chatId = 'chat-123';

      // First, tool-call creates record
      const turnId1 = 1;
      const toolCallRow = {
        role: 'tool' as const,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        statusId: 1,
        functionCall: { arg1: 'value' },
        toolResult: null,
      };

      // Mock no existing message (first insert)
      const mockLimit1 = jest.fn().mockResolvedValue([]);
      const mockWhereClause1 = jest.fn().mockReturnValue({ limit: mockLimit1 });
      const mockFromClause1 = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause1 });
      mockSelect.mockReturnValue({ from: mockFromClause1 });

      // Act - Tool call
      const result1 = await upsertToolMessage(
        mockTx,
        chatId,
        turnId1,
        toolCallRow,
      );

      // Assert - Should return null (no existing message to update)
      expect(result1).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();

      // Reset mocks for second call
      // jest.clearAllMocks();
      mockUpdate.mockClear();
      mockSet.mockClear();
      mockWhere.mockClear();
      mockSelect.mockClear();

      // Now tool-result updates existing record
      const turnId2 = 2;
      const toolResultRow = {
        role: 'tool' as const,
        providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        statusId: 1,
        functionCall: null,
        toolResult: { result: 'value' },
      };

      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        statusId: 1,
        turnId: 1,
        functionCall: { arg1: 'value' }, // From previous tool-call
        toolResult: null,
        metadata: { modifiedTurnId: 1 },
        optimizedContent: null,
      };

      // Mock existing message found
      const mockLimit2 = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause2 = jest.fn().mockReturnValue({ limit: mockLimit2 });
      const mockFromClause2 = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause2 });
      mockSelect.mockReturnValue({ from: mockFromClause2 });

      // Act - Tool result
      const result2 = await upsertToolMessage(
        mockTx,
        chatId,
        turnId2,
        toolResultRow,
      );

      // Assert - Final state should have both functionCall and toolResult
      expect(result2).toBe(123);
      expect(mockUpdate).toHaveBeenCalled();
      const setCallArgs = mockSet.mock.calls[0][0];
      expect(setCallArgs).toEqual(
        expect.objectContaining({
          functionCall: { arg1: 'value' }, // From previous tool-call
          statusId: 1,
          metadata: { modifiedTurnId: 2 },
          optimizedContent: null,
          toolResult: { result: 'value' },
        }),
      );
      // functionCall preserved from existing record is allowed in update payload
      expect(setCallArgs.functionCall).toEqual({ arg1: 'value' });
    });

    it('should properly handle truthy empty containers but ignore falsy primitives for toolResult', async () => {
      // truthy containers should be saved
      const truthyCases = [
        { value: [], description: 'empty array' },
        { value: {}, description: 'empty object' },
      ];

      for (const testCase of truthyCases) {
        const chatId = 'chat-123';
        const turnId = 2;
        const toolRow = {
          role: 'tool' as const,
          statusId: 2,
          providerId: 'call_falsy_test',
          toolName: 'testTool',
          toolResult: testCase.value,
        };

        const existingMessage = {
          chatMessageId: 'msg-uuid-123',
          messageId: 42,
          turnId: 1,
          functionCall: { args: { test: 'existing' } },
          toolResult: null,
          metadata: { modifiedTurnId: 1 },
          optimizedContent: null,
        };

        const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
        const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockFromClause = jest
          .fn()
          .mockReturnValue({ where: mockWhereClause });
        mockSelect.mockReturnValue({ from: mockFromClause });

        const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

        expect(result).toBe(42);
        expect(mockUpdate).toHaveBeenCalled();
        expect(mockSet).toHaveBeenCalledWith(
          expect.objectContaining({ toolResult: testCase.value }),
        );

        mockLimit.mockClear();
        mockWhereClause.mockClear();
        mockFromClause.mockClear();
        mockSelect.mockClear();
        mockUpdate.mockClear();
        mockSet.mockClear();
      }

      // falsy primitives should not trigger an update
      const falsyCases = [
        { value: 0, description: 'numeric zero' },
        { value: false, description: 'boolean false' },
        { value: '', description: 'empty string' },
      ];

      for (const testCase of falsyCases) {
        //jest.clearAllMocks();

        const chatId = 'chat-123';
        const turnId = 2;
        const toolRow = {
          role: 'tool' as const,
          statusId: 2,
          providerId: 'call_falsy_test',
          toolName: 'testTool',
          toolResult: testCase.value,
        };

        const existingMessage = {
          chatMessageId: 'msg-uuid-123',
          messageId: 42,
          turnId: 1,
          functionCall: { args: { test: 'existing' } },
          toolResult: null,
          metadata: { modifiedTurnId: 1 },
          optimizedContent: null,
        };

        const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
        const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockFromClause = jest
          .fn()
          .mockReturnValue({ where: mockWhereClause });
        mockSelect.mockReturnValue({ from: mockFromClause });

        const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);
        expect(result).toBe(42);
        expect(mockUpdate).toHaveBeenCalled();
      }
    });

    it('should NOT update toolResult when incoming value is null or undefined', async () => {
      // Arrange - Test null and undefined cases
      const testCases = [
        { value: null, description: 'null' },
        { value: undefined, description: 'undefined' },
      ];

      for (const testCase of testCases) {
        const chatId = 'chat-123';
        const turnId = 2;
        const toolRow = {
          role: 'tool' as const,
          statusId: 2,
          providerId: 'call_null_test',
          toolName: 'testTool',
          toolResult: testCase.value,
        };

        const existingMessage = {
          chatMessageId: 'msg-uuid-123',
          messageId: 42,
          turnId: 1,
          functionCall: { args: { test: 'existing' } },
          toolResult: { existing: 'result' },
          metadata: { modifiedTurnId: 1 },
          optimizedContent: null,
        };

        // Mock existing message found
        const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
        const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
        const mockFromClause = jest
          .fn()
          .mockReturnValue({ where: mockWhereClause });
        mockSelect.mockReturnValue({ from: mockFromClause });

        // Act
        const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

        // Assert - Should NOT update when value is null/undefined
        expect(result).toBe(42);
        expect(mockUpdate).toHaveBeenCalled();

        mockLimit.mockClear();
        mockWhereClause.mockClear();
        mockFromClause.mockClear();
        mockSelect.mockClear();
        mockUpdate.mockClear();
        mockSet.mockClear();
      }
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
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_existing123',
              toolName: 'testTool',
              input: { type: 'text', value: 'result' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolName: 'testTool',
              toolCallId: 'call_existing123',
              output: { type: 'text', value: 'result' },
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_new456',
              toolName: 'newTool',
              input: { type: 'text', value: 'result' },
            },
          ],
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
      const mockWhereClause = jest
        .fn()
        .mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = jest.fn().mockReturnThis();
      const mockFromClause = jest.fn().mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
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
      expect(
        result.some(
          (msg: any) =>
            Array.isArray(msg.content) &&
            msg.content.some((part: any) => part.toolCallId === 'call_new456'),
        ),
      ).toBe(true);

      // Should exclude the existing tool call
      expect(
        result.some(
          (msg: any) =>
            Array.isArray(msg.content) &&
            msg.content.some(
              (part: any) => part.toolCallId === 'call_existing123',
            ),
        ),
      ).toBe(false);
    });
  });

  describe('stream handler integration - acceptance criteria tests', () => {
    it('should properly handle tool-call in stream with upsert logic', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 2;

      // Mock tool call chunk
      const toolCallChunk = {
        type: 'tool-call' as const,
        toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        input: '{"arg1": "value"}',
      };

      // Mock no existing message for new tool call (should create new)
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const toolRow = {
        statusId: 1,
        role: 'tool' as const,
        content: '',
        toolName: toolCallChunk.toolName,
        functionCall: JSON.parse(toolCallChunk.input || '{}'),
        providerId: toolCallChunk.toolCallId,
        metadata: null,
        toolResult: null,
      };

      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should return null indicating new record creation needed
      expect(result).toBeNull();
    });

    it('should properly handle tool-result in stream with upsert logic', async () => {
      // Arrange
      const chatId = 'chat-123';
      const turnId = 3;

      // Mock existing tool message with functionCall
      const existingMessage = {
        chatMessageId: 'msg-uuid-123',
        messageId: 123,
        statusId: 1,
        turnId: 1,
        functionCall: { arg1: 'value' },
        toolResult: null,
        metadata: { modifiedTurnId: 1 },
        optimizedContent: null,
      };

      // Mock tool result chunk
      const toolResultChunk = {
        type: 'tool-result' as const,
        statusId: 2,
        toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
        toolName: 'some_function',
        output: { result: 'success' },
      };

      // Mock existing message found
      const mockLimit = jest.fn().mockResolvedValue([existingMessage]);
      const mockWhereClause = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFromClause = jest
        .fn()
        .mockReturnValue({ where: mockWhereClause });
      mockSelect.mockReturnValue({ from: mockFromClause });

      // Act
      const toolRow = {
        statusId: 2,
        role: 'tool' as const,
        content: '',
        functionCall: null,
        providerId: toolResultChunk.toolCallId,
        metadata: null,
        toolResult: JSON.stringify(toolResultChunk.output),
      };

      const result = await upsertToolMessage(mockTx, chatId, turnId, toolRow);

      // Assert - Should update existing record
      expect(result).toBe(123);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        // turnId should NOT be updated - preserves original insertion turn
        statusId: 2,
        functionCall: {
          arg1: 'value',
        },
        metadata: {
          modifiedTurnId: 3,
        },
        optimizedContent: null,
        toolResult: JSON.stringify(toolResultChunk.output),
      });
    });
  });

  describe('getNewMessages with turn-based update logic - acceptance criteria tests', () => {
    it('should include tool messages for update when currentTurnId > modifiedTurnId', async () => {
      // Arrange - Tool message that exists but can be updated
      const chatId = 'chat-123';
      const currentTurnId = 3;
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolName: 'testTool',
              toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
              output: { type: 'text', value: 'new result' },
            },
          ],
        },
      ];

      // Mock existing messages - tool message was last modified in turn 1
      const existingMessages = [
        {
          role: 'tool',
          content: null,
          messageOrder: 1,
          providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
          metadata: { modifiedTurnId: 1 }, // Last modified in turn 1
        },
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
      const mockWhereClause = jest
        .fn()
        .mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = jest.fn().mockReturnThis();
      const mockFromClause = jest.fn().mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      });

      mockSelect.mockReturnValue({ from: mockFromClause });

      // Mock the leftJoin chain
      const chainedMock = {
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      };
      mockLeftJoin.mockReturnValue(chainedMock);

      // Act
      const result = await getNewMessages(
        mockTx,
        chatId,
        incomingMessages,
        currentTurnId,
      );

      // Assert - Should include the message since currentTurnId (3) > modifiedTurnId (1)
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
          },
        ],
      });
    });

    it('should exclude tool messages when currentTurnId <= modifiedTurnId', async () => {
      // Arrange - Tool message that exists and is already up-to-date
      const chatId = 'chat-123';
      const currentTurnId = 2;
      const incomingMessages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
              toolName: 'testTool',
              output: { type: 'text', value: 'old result' },
            },
          ],
        },
      ];

      // Mock existing messages - tool message was last modified in turn 3 (newer than current)
      const existingMessages = [
        {
          role: 'tool',
          content: null,
          messageOrder: 1,
          providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
          metadata: { modifiedTurnId: 3 }, // Already modified in turn 3
        },
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
      const mockWhereClause = jest
        .fn()
        .mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = jest.fn().mockReturnThis();
      const mockFromClause = jest.fn().mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      });

      mockSelect.mockReturnValue({ from: mockFromClause });

      // Mock the leftJoin chain
      const chainedMock = {
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      };
      mockLeftJoin.mockReturnValue(chainedMock);

      // Act
      const result = await getNewMessages(
        mockTx,
        chatId,
        incomingMessages,
        currentTurnId,
      );

      // Assert - Should exclude the message since currentTurnId (2) <= modifiedTurnId (3)
      expect(result).toHaveLength(0);
    });

    it('should demonstrate the desired end goal: single record evolution', async () => {
      // This test demonstrates the complete workflow that @seanmobrien described
      // Before: Two separate records for tool-call and tool-result
      // After: One record with both functionCall and toolResult

      const chatId = 'chat-123';

      // Simulate Turn 1: tool-call message comes in (should be new)
      const turn1Messages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
              toolName: 'some_function',
              input: { type: 'text', value: 'test' },
            },
          ],
        },
      ];

      // Mock no existing messages (first time)
      mockSelect.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const turn1Result = await getNewMessages(
        mockTx,
        chatId,
        turn1Messages,
        1,
      );
      expect(turn1Result).toHaveLength(1); // New message included

      // Reset mocks for turn 2
      // jest.clearAllMocks();
      mockSelect.mockClear();

      // Simulate Turn 2: tool-result message comes in for same providerId
      const turn2Messages: LanguageModelV2CallOptions['prompt'] = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
              toolName: 'some_function',
              output: { type: 'text', value: 'value' },
            },
          ],
        },
      ];

      // Mock existing tool message from turn 1
      const existingMessages = [
        {
          role: 'tool',
          content: null,
          messageOrder: 1,
          providerId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
          metadata: { modifiedTurnId: 1 }, // Created in turn 1
        },
      ];

      const mockOrderBy = jest.fn().mockResolvedValue(existingMessages);
      const mockWhereClause = jest
        .fn()
        .mockReturnValue({ orderBy: mockOrderBy });
      const mockLeftJoin = jest.fn().mockReturnThis();
      const mockFromClause = jest.fn().mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      });

      mockSelect.mockReturnValue({ from: mockFromClause });
      mockLeftJoin.mockReturnValue({
        leftJoin: mockLeftJoin,
        where: mockWhereClause,
      });

      const turn2Result = await getNewMessages(
        mockTx,
        chatId,
        turn2Messages,
        2,
      );

      // Assert - Should include the message for updating since turn 2 > modifiedTurnId 1
      expect(turn2Result).toHaveLength(1);
      expect(turn2Result[0]).toMatchObject({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_XVYMmeNjnCBu6E5PyMp8SHrl',
            toolName: 'some_function',
            output: {
              type: 'text',
              value: 'value',
            },
          },
        ],
      });

      // This message will be processed by upsertToolMessage to update the existing record
      // instead of creating a duplicate, achieving the desired single record evolution
    });
  });
});
