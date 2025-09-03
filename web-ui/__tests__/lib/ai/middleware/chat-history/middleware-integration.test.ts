/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock external dependencies
jest.mock('@/lib/drizzle-db', () => {
  const schema = jest.requireActual('@/lib/drizzle-db/schema');
  const exports = jest.requireActual('@/lib/drizzle-db');

  return {
    ...exports,
    drizDb: jest.fn(() => ({
      transaction: jest.fn((fn) =>
        fn({
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
        }),
      ),
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
    schema,
  };
});

/**
 * Integration tests for chat history middleware supporting both streaming and text completions
 */
import { hideConsoleOutput } from '@/__tests__/test-utils';
import { createChatHistoryMiddlewareEx } from '@/lib/ai/middleware/chat-history';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import type { ChatHistoryContext } from '@/lib/ai/middleware/chat-history/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { schema, drizDb } from '@/lib/drizzle-db';

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
  const mockContext: ChatHistoryContext = createUserChatHistoryContext({
    userId: 'test-user',
    chatId: 'test-chat',
    requestId: 'test-request',
    model: 'gpt-4o',
  });

  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('Middleware Structure', () => {
    it('should provide both wrapStream and wrapGenerate methods', () => {
      // Act
      const middleware = createChatHistoryMiddlewareEx(mockContext);

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
      const mockConsole = hideConsoleOutput();
      mockConsole.setup();

      try {
        // Arrange
        const middleware = createChatHistoryMiddlewareEx(mockContext);
        const mockDoGenerate = jest.fn(() =>
          Promise.resolve({
            text: 'Test response',
            finishReason: 'stop',
            usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
            content: [{ type: 'text-delta', delta: 'Test response' }],
          }),
        );

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
        expect((result.content[0] as any).delta).toBe('Test response');
        expect(mockDoGenerate).toHaveBeenCalled();
      } finally {
        mockConsole.dispose();
      }
    });

    it('should handle wrapStream method call', async () => {
      const mockConsole = hideConsoleOutput();
      mockConsole.setup();

      try {
        // Arrange
        const middleware = createChatHistoryMiddlewareEx(mockContext);

        // Create a simple mock stream
        const mockStream = {
          [Symbol.asyncIterator]: async function* () {
            yield { type: 'text-delta', delta: 'Hello' };
            yield { type: 'finish', finishReason: 'stop' };
          },
          pipeThrough: jest.fn(function (this: any) {
            return this;
          }),
        };

        const mockDoStream = jest.fn(() =>
          Promise.resolve({
            stream: mockStream,
            rawCall: { rawPrompt: 'test', rawSettings: {} },
            rawResponse: { headers: {} },
          }),
        );

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
      } finally {
        mockConsole.dispose();
      }
    });
  });

  describe('Error Handling', () => {
    const mockConsole = hideConsoleOutput();

    beforeEach(() => {
      mockConsole.setup();
    });

    afterEach(() => {
      mockConsole.dispose();
    });

    it('should gracefully handle database errors in wrapGenerate', async () => {
      // Arrange - Mock transaction to fail
      const mockDb = await import('@/lib/drizzle-db');
      (mockDb.drizDb as jest.Mock).mockImplementationOnce(() => ({
        transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
      }));

      const middleware = createChatHistoryMiddlewareEx(mockContext);
      const mockDoGenerate = jest.fn(() =>
        Promise.resolve({
          text: 'Response despite error',
          finishReason: 'stop',
          usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
          content: [{ type: 'text-delta', delta: 'Response despite error' }],
        }),
      );

      const mockParams = {
        prompt: [{ role: 'user', content: 'Test' }],
      };

      // Act & Assert - Should not throw
      const result = await middleware.wrapGenerate!({
        doGenerate: mockDoGenerate as any,
        params: mockParams as any,
      } as any);

      expect((result.content[0] as any).delta).toBe('Response despite error');
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should gracefully handle database errors in wrapStream', async () => {
      // Arrange - Mock transaction to fail
      const mockDb = require('@/lib/drizzle-db');
      mockDb.drizDb.mockImplementationOnce(() => ({
        transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
      }));

      const middleware = createChatHistoryMiddlewareEx(mockContext);

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'text-delta', delta: 'Recovery' };
        },
        pipeThrough: jest.fn(function (this: any) {
          return this;
        }),
      };

      const mockDoStream = jest.fn(() =>
        Promise.resolve({
          stream: mockStream,
          rawCall: { rawPrompt: 'test', rawSettings: {} },
          rawResponse: { headers: {} },
        }),
      );

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
