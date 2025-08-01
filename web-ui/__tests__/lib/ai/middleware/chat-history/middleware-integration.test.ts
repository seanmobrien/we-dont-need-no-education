/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests for chat history middleware supporting both streaming and text completions
 */
import { createChatHistoryMiddleware } from '@/lib/ai/middleware/chat-history';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';

// Mock external dependencies
jest.mock('@/lib/drizzle-db', () => ({
  drizDb: jest.fn(() => ({
    transaction: jest.fn((fn) => fn({
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              execute: jest.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => ({
          returning: jest.fn(() => ({
            execute: jest.fn(() => Promise.resolve([{ messageId: 1 }])),
          })),
          execute: jest.fn(() => Promise.resolve()),
        })),
      })),
      execute: jest.fn(() => Promise.resolve([{ allocate_scoped_ids: 1 }])),
    })),
    query: {
      chats: {
        findFirst: jest.fn(() => Promise.resolve(null)),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('@/lib/ai/core', () => ({
  generateChatId: jest.fn(() => ({ id: 'generated-chat-id' })),
}));

describe('Chat History Middleware Integration', () => {
  const mockContext: ChatHistoryContext = {
    userId: 'test-user',
    chatId: 'test-chat',
    requestId: 'test-request',
    model: 'gpt-4o',
    temperature: 0.7,
  };

  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('Middleware Structure', () => {
    it('should provide both wrapStream and wrapGenerate methods', () => {
      // Act
      const middleware = createChatHistoryMiddleware(mockContext);

      // Assert
      expect(middleware).toBeDefined();
      expect(middleware.wrapStream).toBeDefined();
      expect(middleware.wrapGenerate).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
      expect(typeof middleware.wrapStream).toBe('function');
      expect(typeof middleware.wrapGenerate).toBe('function');
      expect(typeof middleware.transformParams).toBe('function');
    });

    it('should handle wrapGenerate method call', async () => {
      // Arrange
      const middleware = createChatHistoryMiddleware(mockContext);
      const mockDoGenerate = jest.fn(() => Promise.resolve({
        text: 'Test response',
        finishReason: 'stop',
        usage: { totalTokens: 5 },
      }));

      const mockParams = {
        prompt: [{ role: 'user', content: 'Hello' }],
      };

      // Act
      const result = await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate as any,
        params: mockParams as any,
      } as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBe('Test response');
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should handle wrapStream method call', async () => {
      // Arrange
      const middleware = createChatHistoryMiddleware(mockContext);
      
      // Create a simple mock stream
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', textDelta: 'Hello' };
          yield { type: 'finish', finishReason: 'stop' };
        },
        pipeThrough: jest.fn(function(this: any) {
          return this;
        }),
      };

      const mockDoStream = jest.fn(() => Promise.resolve({
        stream: mockStream,
        rawCall: { rawPrompt: 'test', rawSettings: {} },
        rawResponse: { headers: {} },
      }));

      const mockParams = {
        prompt: [{ role: 'user', content: 'Hello' }],
      };

      // Act
      const result = await middleware.wrapStream!({
        doStream: mockDoStream as any,
        params: mockParams as any,
      } as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.stream).toBeDefined();
      expect(mockDoStream).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle database errors in wrapGenerate', async () => {
      // Arrange - Mock transaction to fail
      const mockDb = await import('@/lib/drizzle-db');
      (mockDb.drizDb as jest.Mock).mockImplementationOnce(() => ({
        transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
      }));

      const middleware = createChatHistoryMiddleware(mockContext);
      const mockDoGenerate = jest.fn(() => Promise.resolve({
        text: 'Response despite error',
        finishReason: 'stop',
        usage: { totalTokens: 5 },
      }));

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      // Act & Assert - Should not throw
      const result = await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate as any,
        params: mockParams as any,
      } as any);

      expect(result.text).toBe('Response despite error');
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should gracefully handle database errors in wrapStream', async () => {
      // Arrange - Mock transaction to fail
      const mockDb = require('@/lib/drizzle-db');
      mockDb.drizDb.mockImplementationOnce(() => ({
        transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
      }));

      const middleware = createChatHistoryMiddleware(mockContext);
      
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', textDelta: 'Recovery' };
        },
        pipeThrough: jest.fn(function(this: any) {
          return this;
        }),
      };

      const mockDoStream = jest.fn(() => Promise.resolve({
        stream: mockStream,
        rawCall: { rawPrompt: 'test', rawSettings: {} },
        rawResponse: { headers: {} },
      }));

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      // Act & Assert - Should not throw
      const result = await middleware.wrapStream!({
        doStream: mockDoStream as any,
        params: mockParams as any,
      } as any);

      expect(result.stream).toBeDefined();
      expect(mockDoStream).toHaveBeenCalled();
    });
  });
});