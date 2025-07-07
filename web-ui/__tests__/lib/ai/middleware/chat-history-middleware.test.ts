/**
 * @jest-environment node
 */

/**
 * Jest tests for the chat history middleware functionality
 */

import { jest } from '@jest/globals';

// Mock the database connection and schema
const mockDb = {
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'test-id-123' }]),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  }),
  query: {
    chats: {
      findFirst: jest.fn().mockResolvedValue({ title: null }),
    },
  },
};

const mockEq = jest.fn();

jest.mock('@/lib/drizzle-db/connection', () => ({
  db: mockDb,
}));

jest.mock('drizzle-orm', () => ({
  eq: mockEq,
}));

jest.mock('@/drizzle/schema', () => ({
  chats: { id: 'chats.id' },
  chatTurns: { id: 'chatTurns.id' },
  chatMessages: { id: 'chatMessages.id' },
  tokenUsage: {},
  messageStatuses: {},
  turnStatuses: {},
}));

const mockLog = jest.fn();
jest.mock('@/lib/logger', () => ({
  log: mockLog,
}));

import {
  createChatHistoryMiddleware,
  initializeChatHistoryTables,
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history-middleware';

describe('Chat History Middleware', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockLog.mockImplementation((fn) =>
      fn({
        info: jest.fn(),
        error: jest.fn(),
      }),
    );
  });

  describe('createChatHistoryMiddleware', () => {
    const mockContext: ChatHistoryContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      model: 'gpt-4',
      temperature: 0.7,
      topP: 1.0,
    };

    it('should create a middleware that handles text streaming', async () => {
      const middleware = createChatHistoryMiddleware(mockContext);

      // Mock stream parts
      const mockStreamParts = [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'text-delta', textDelta: ' world' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10 },
        },
      ];

      const mockDoStream = jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            mockStreamParts.forEach((part) => controller.enqueue(part));
            controller.close();
          },
        }),
        finishReason: 'stop',
        usage: { promptTokens: 5, completionTokens: 10 },
      });

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test message' }],
      };

      // Execute the wrapStream function
      const result = await middleware.wrapStream!({
        doStream: mockDoStream,
        params: mockParams,
      });

      expect(result).toBeDefined();
      expect(result.stream).toBeInstanceOf(ReadableStream);

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled(); // For creating chat and turn
    });

    it('should handle tool calls correctly', async () => {
      const middleware = createChatHistoryMiddleware(mockContext);

      const mockStreamParts = [
        {
          type: 'tool-call',
          toolCallId: 'call-123',
          toolName: 'searchCaseFile',
          args: { query: 'test query' },
        },
        { type: 'text-delta', textDelta: 'Based on search results...' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 15, completionTokens: 25 },
        },
      ];

      const mockDoStream = jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            mockStreamParts.forEach((part) => controller.enqueue(part));
            controller.close();
          },
        }),
      });

      const mockParams = {
        prompt: [
          {
            role: 'user',
            content: 'Search for documents about policy violations',
          },
        ],
      };

      const result = await middleware.wrapStream!({
        doStream: mockDoStream,
        params: mockParams,
      });

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled(); // Should insert tool call message
    });

    it('should use existing chatId when provided', async () => {
      const contextWithChatId: ChatHistoryContext = {
        ...mockContext,
        chatId: 'existing-chat-123',
      };

      const middleware = createChatHistoryMiddleware(contextWithChatId);

      const mockDoStream = jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.close();
          },
        }),
      });

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      await middleware.wrapStream!({
        doStream: mockDoStream,
        params: mockParams,
      });

      // Should not create a new chat since chatId was provided
      // Check that turn creation used the existing chatId
      expect(mockDb.insert().values).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 'existing-chat-123',
        }),
      );
    });

    it('should handle streaming errors gracefully', async () => {
      const middleware = createChatHistoryMiddleware(mockContext);

      // Mock database error
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest
            .fn()
            .mockRejectedValue(new Error('DB Connection Failed')),
        }),
      });

      const mockDoStream = jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.close();
          },
        }),
      });

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      // Should not throw error, should fallback to original stream
      const result = await middleware.wrapStream!({
        doStream: mockDoStream,
        params: mockParams,
      });
      expect(result).toBeDefined();
    });

    it('should transform params without modification', async () => {
      const middleware = createChatHistoryMiddleware(mockContext);

      const originalParams = {
        prompt: [{ role: 'user', content: 'Test message' }],
        temperature: 0.7,
      };

      const result = await middleware.transformParams!({
        params: originalParams,
      });

      expect(result).toEqual(originalParams);
    });

    it('should record token usage on finish', async () => {
      const middleware = createChatHistoryMiddleware(mockContext);

      const mockStreamParts = [
        { type: 'text-delta', textDelta: 'Response text' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 20 },
        },
      ];

      const mockDoStream = jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            mockStreamParts.forEach((part) => controller.enqueue(part));
            controller.close();
          },
        }),
      });

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      const result = await middleware.wrapStream!({
        doStream: mockDoStream,
        params: mockParams,
      });

      // Consume the stream to trigger the finish handler
      const reader = result.stream.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // Should have inserted token usage
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
