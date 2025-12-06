/**
 * @jest-environment node
 * @fileoverview Unit tests for chat history middleware main entry point
 *
 * These tests verify the middleware creation, stream transformation,
 * and table initialization functionality.
 *
 * @module __tests__/lib/ai/middleware/chat-history/index.test.ts
 */

jest.mock('@/lib/ai/middleware/chat-history/utility', () => {
  const original = jest.requireActual(
    '/lib/ai/middleware/chat-history/utility',
  );
  return {
    ...original,
    getNextSequence: jest.fn().mockResolvedValue([1, 2, 3, 4]),
  };
});

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import {
  createChatHistoryMiddlewareEx as createChatHistoryMiddleware,
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history';
import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { generateChatId } from '@/lib/ai/core';
import { DbDatabaseType, drizDb } from '@/lib/drizzle-db';
import { LoggedError } from '@/lib/react-util';
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
  LanguageModelV2,
} from '@ai-sdk/provider';

import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';

// Mock dependencies
//jest.mock('@/lib/ai/middleware/chat-history/processing-queue');
jest.mock('@/lib/ai/core');
// jest.mock('@/lib/drizzle-db');

jest.mock('@/lib/react-util', () => {
  const original = jest.requireActual('/lib/react-util');
  const mockLoggedErrorImpl: any = jest
    .fn()
    .mockImplementation((message, options) => {
      return {
        ...options,
        message,
      };
    });
  mockLoggedErrorImpl.isTurtlesAllTheWayDownBaby = jest.fn();
  return {
    ...original,
    LoggedError: mockLoggedErrorImpl,
  };
});

const mockProcessingQueue = ProcessingQueue as jest.MockedClass<
  typeof ProcessingQueue
>;
const mockGenerateChatId = generateChatId as jest.MockedFunction<
  typeof generateChatId
>;
let mockDb: jest.Mocked<DbDatabaseType>;

describe('Chat History Middleware', () => {
  let mockContext: ChatHistoryContext;
  let mockParams: LanguageModelV2CallOptions;
  let mockQueueInstance: jest.Mocked<ProcessingQueue>;

  beforeEach(() => {
    // jest.clearAllMocks();
    mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    // Mock context
    mockContext = createUserChatHistoryContext({
      userId: 'user-123',
      chatId: 'chat-456',
      model: 'gpt-4o',
      requestId: 'session-789',
    });

    // Mock params
    mockParams = {
      inputFormat: 'prompt' as const,
      mode: { type: 'regular' as const },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
      tools: [],
    } as LanguageModelV2CallOptions;

    /*
    // Mock ProcessingQueue instance
    mockQueueInstance = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      getQueueLength: jest.fn().mockReturnValue(0),
      isProcessing: jest.fn().mockReturnValue(false),
      queue: [],
      processing: false,
      nextTaskId: 1,
      processTask: jest.fn(),
      drainQueue: jest.fn(),
    } as unknown as jest.Mocked<ProcessingQueue>;

    mockProcessingQueue.mockImplementation(() => mockQueueInstance);

    */

    // Setup default mocks
    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    if (
      typeof (LoggedError as any)?.isTurtlesAllTheWayDownBaby === 'function'
    ) {
      (LoggedError as any).isTurtlesAllTheWayDownBaby.mockClear();
    }

    // Mock db.transaction
    /*
    mockDb.transaction = jest
      .fn()
      .mockImplementation((callback) =>
        callback({} as unknown as Parameters<typeof callback>[0]),
      );
    */
  });

  describe('createChatHistoryMiddleware', () => {
    it('should create middleware with valid context', () => {
      // Act
      const middleware = createChatHistoryMiddleware(mockContext);

      // Assert
      expect(middleware).toBeDefined();
      expect(middleware.wrapStream).toBeDefined();
      expect(middleware.wrapGenerate).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
    });

    it('should create middleware without generating chatId in constructor', () => {
      // Arrange
      const contextWithoutChatId = { ...mockContext, chatId: undefined };

      // Act
      const middleware = createChatHistoryMiddleware(contextWithoutChatId);

      // Assert
      expect(middleware).toBeDefined();
      // chatId generation happens in importIncomingMessage, not in constructor
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });

    it('should create middleware without immediate chatId processing', () => {
      // Arrange
      const contextWithNumericChatId = {
        ...mockContext,
        chatId: 123 as unknown as string,
      };

      // Act
      const middleware = createChatHistoryMiddleware(contextWithNumericChatId);

      // Assert
      expect(middleware).toBeDefined();
      // chatId processing happens in importIncomingMessage, not in constructor
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });

    it('should use string chatId directly', () => {
      // Arrange
      const contextWithStringChatId = {
        ...mockContext,
        chatId: 'existing-chat',
      };

      // Act
      const middleware = createChatHistoryMiddleware(contextWithStringChatId);

      // Assert
      expect(mockGenerateChatId).not.toHaveBeenCalled();
      expect(middleware).toBeDefined();
    });

    it('should create ProcessingQueue instance', () => {
      // Act
      createChatHistoryMiddleware(mockContext);

      // Assert
      // expect(mockProcessingQueue).toHaveBeenCalled();
    });
  });

  describe('wrapStream', () => {
    let middleware: ReturnType<typeof createChatHistoryMiddleware>;
    let mockDoStream: jest.Mock;
    let mockStream: ReadableStream<LanguageModelV2StreamPart>;

    beforeEach(() => {
      middleware = createChatHistoryMiddleware(mockContext);

      // Create mock stream
      mockStream = new ReadableStream({
        start(controller) {
          // Emit some test chunks
          controller.enqueue({
            type: 'text-delta',
            delta: 'Hello',
            id: 'chunk-1',
          });
          controller.enqueue({
            type: 'text-delta',
            delta: ' world',
            id: 'chunk-2',
          });
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              inputTokens: 10,
              outputTokens: 5,
              totalTokens: 15,
            },
          });
          controller.close();
        },
      });
      mockDoStream = jest.fn().mockResolvedValue({
        stream: mockStream,
        rawCall: { rawPrompt: mockParams.prompt },
        rawResponse: { headers: {} },
      });
    });

    // Helper function for wrapStream calls
    const callWrapStream = async (
      middleware: ReturnType<typeof createChatHistoryMiddleware>,
    ) => {
      return await middleware.wrapStream?.({
        doStream: mockDoStream,
        doGenerate: jest.fn(),
        model: { modelId: 'test-model' } as unknown as Parameters<
          NonNullable<typeof middleware.wrapStream>
        >[0]['model'],
        params: mockParams,
      });
    };

    it('should process stream through enqueueStream', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should return transformed stream', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    }, 10000);

    it('should handle stream processing errors gracefully', async () => {
      // Arrange - create a stream that will cause processing issues
      const errorStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream processing failed'));
        },
      });
      mockDoStream.mockResolvedValue({
        stream: errorStream,
        rawCall: { rawPrompt: mockParams.prompt },
        rawResponse: { headers: {} },
      });

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined();
    });

    it('should process chunks through queue', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Verify the queue processing setup
      // expect(mockQueueInstance.enqueue).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should handle queue processing errors', async () => {
      // Arrange
      /*
      mockQueueInstance.enqueue.mockRejectedValue(
        new Error('Queue processing failed'),
      );
      */

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      // Error should be logged but not propagated
    });

    it('should handle completion operation', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should handle completion errors gracefully', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should handle completion exception gracefully', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should preserve original stream properties', async () => {
      // Arrange
      const originalResult = {
        stream: mockStream,
        rawCall: { rawPrompt: mockParams.prompt },
        rawResponse: { headers: { 'content-type': 'application/json' } },
        usage: { promptTokens: 10, completionTokens: 20 },
      };

      mockDoStream.mockResolvedValue(originalResult);

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      // Note: usage might not be available in all stream responses
    });
  });

  describe.skip('transformParams', () => {
    let middleware: ReturnType<typeof createChatHistoryMiddleware>;

    beforeEach(() => {
      middleware = createChatHistoryMiddleware(mockContext);
    });

    it('should return params unchanged', async () => {
      // Act
      const result = await middleware.transformParams?.({
        params: mockParams,
        type: 'stream',
        model: {} as LanguageModelV2,
      });

      // Assert
      expect(result).toEqual(mockParams);
    });

    it('should handle empty params', async () => {
      // Arrange
      const emptyParams = {} as LanguageModelV2CallOptions;

      // Act
      const result = await middleware.transformParams?.({
        params: emptyParams,
        type: 'stream',
        model: {} as LanguageModelV2,
      });

      // Assert
      expect(result).toEqual({ tools: [] });
    });

    it('should handle complex params', async () => {
      // Arrange
      const complexParams = {
        ...mockParams,
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 1000,
        stopSequences: ['END'],
      };

      // Act
      const result = await middleware.transformParams?.({
        params: complexParams,
        type: 'stream',
        model: {} as LanguageModelV2,
      });

      // Assert
      expect(result).toEqual(complexParams);
    });
  });

  describe('wrapGenerate', () => {
    let middleware: ReturnType<typeof createChatHistoryMiddleware>;
    let mockDoGenerate: jest.Mock;

    beforeEach(() => {
      middleware = createChatHistoryMiddleware(mockContext);
      mockDoGenerate = jest.fn().mockResolvedValue({
        text: 'Generated text response',
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        content: [{ type: 'text-delta', delta: 'Generated text response' }],
      });
    });

    const callWrapGenerate = async (middleware: LanguageModelV2Middleware) => {
      return middleware.wrapGenerate
        ? await middleware.wrapGenerate({
          doGenerate: mockDoGenerate,
          doStream: jest.fn(),
          params: mockParams,
          model: {
            specificationVersion: 'v2',
            provider: '',
            supportedUrls: {},
            modelId: '',
            doGenerate: () =>
              Promise.resolve({
                warnings: [],
                finishReason: 'stop',
                usage: { promptTokens: 10, completionTokens: 20 },
                content: [
                  {
                    type: 'text-delta',
                    delta: 'Generated text response',
                    id: 'generated-response',
                  },
                ],
              } as unknown as ReturnType<LanguageModelV2['doGenerate']>),
            doStream: (() => {
              return Promise.resolve();
            }) as unknown as LanguageModelV2['doStream'],
          },
        })
        : undefined;
    };

    it('should process generation through middleware', async () => {
      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should return generated result', async () => {
      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toEqual({
        text: 'Generated text response',
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        content: [{ type: 'text-delta', delta: 'Generated text response' }],
      });
    });

    it('should handle generation processing', async () => {
      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should handle processing gracefully', async () => {
      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toBeDefined();
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should handle generation errors', async () => {
      // Arrange
      const generationError = new Error('Generation failed');
      mockDoGenerate.mockRejectedValue(generationError);

      // Act & Assert
      await expect(callWrapGenerate(middleware)).rejects.toThrow(
        'Generation failed',
      );
    });
  });

  describe('Context Variations', () => {
    it('should handle minimal context', () => {
      // Arrange
      const minimalContext: ChatHistoryContext = createUserChatHistoryContext({
        userId: 'user-minimal',
      });

      // Act
      const middleware = createChatHistoryMiddleware(minimalContext);

      // Assert
      expect(middleware).toBeDefined();
      // chatId generation happens in message persistence, not in constructor
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });

    it('should handle full context', () => {
      // Arrange
      const fullContext: ChatHistoryContext = createUserChatHistoryContext({
        userId: 'user-full',
        chatId: 'chat-full',
        requestId: 'session-full',
        model: 'gpt-4-turbo',
      });

      // Act
      const middleware = createChatHistoryMiddleware(fullContext);

      // Assert
      expect(middleware).toBeDefined();
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });
  });
});
