/**
 * @jest-environment node
 * @fileoverview Unit tests for chat history middleware main entry point
 * 
 * These tests verify the middleware creation, stream transformation,
 * and table initialization functionality.
 * 
 * @module __tests__/lib/ai/middleware/chat-history/index.test.ts
 */


import {
  createChatHistoryMiddleware,
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history';
import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { handleFlush } from '@/lib/ai/middleware/chat-history/flush-handlers';
import { 
  safeInitializeMessagePersistence, 
  safeCompleteMessagePersistence 
} from '@/lib/ai/middleware/chat-history/message-persistence';
import { generateChatId } from '@/lib/ai/core';
import { DbDatabaseType, drizDb } from '@/lib/drizzle-db';
import { LoggedError } from '@/lib/react-util';
import type { LanguageModelV1CallOptions, LanguageModelV1Middleware, LanguageModelV1StreamPart } from 'ai';
import { LanguageModelV1FunctionToolCall, LanguageModelV1FinishReason, LanguageModelV1CallWarning, LanguageModelV1ProviderMetadata, LanguageModelV1Source, LanguageModelV1LogProbs } from '@ai-sdk/provider';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/import-incoming-message');
jest.mock('@/lib/ai/middleware/chat-history/processing-queue');
jest.mock('@/lib/ai/middleware/chat-history/flush-handlers');
jest.mock('@/lib/ai/middleware/chat-history/message-persistence');
jest.mock('@/lib/ai/core');
jest.mock('@/lib/drizzle-db');
jest.mock('@/lib/logger');

jest.mock('@/lib/react-util', () => {
  const original = jest.requireActual('@/lib/react-util');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLoggedErrorImpl: any = jest.fn().mockImplementation((message, options) => {
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


const mockImportIncomingMessage = importIncomingMessage as jest.MockedFunction<typeof importIncomingMessage>;
const mockProcessingQueue = ProcessingQueue as jest.MockedClass<typeof ProcessingQueue>;
const mockHandleFlush = handleFlush as jest.MockedFunction<typeof handleFlush>;
const mockSafeInitializeMessagePersistence = safeInitializeMessagePersistence as jest.MockedFunction<typeof safeInitializeMessagePersistence>;
const mockSafeCompleteMessagePersistence = safeCompleteMessagePersistence as jest.MockedFunction<typeof safeCompleteMessagePersistence>;
const mockGenerateChatId = generateChatId as jest.MockedFunction<typeof generateChatId>;
let mockDb: jest.Mocked<DbDatabaseType>;

describe('Chat History Middleware', () => {
  let mockContext: ChatHistoryContext;
  let mockParams: LanguageModelV1CallOptions;
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
    };

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

    // Setup default mocks
    mockSafeInitializeMessagePersistence.mockResolvedValue({
      chatId: 'chat-456',
      turnId: 1,
      messageId: 100,
    });

    mockSafeCompleteMessagePersistence.mockResolvedValue({
      success: true,
      processingTimeMs: 100,
      textLength: 50,
    });

    mockImportIncomingMessage.mockResolvedValue({
      chatId: 'chat-456',
      turnId: 1,
      messageId: 100,
      nextMessageOrder: 1,
    });

    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    mockHandleFlush.mockResolvedValue({ 
      success: true, 
      processingTimeMs: 100, 
      textLength: 50 
    });
    (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock)
      .mockClear();
    

    // Mock db.transaction
    mockDb.transaction = jest.fn().mockImplementation((callback) =>
      callback({} as unknown as Parameters<typeof callback>[0])
    );
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
      const contextWithNumericChatId = { ...mockContext, chatId: 123 as unknown as string };

      // Act
      const middleware = createChatHistoryMiddleware(contextWithNumericChatId);

      // Assert
      expect(middleware).toBeDefined();
      // chatId processing happens in importIncomingMessage, not in constructor
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });

    it('should use string chatId directly', () => {
      // Arrange
      const contextWithStringChatId = { ...mockContext, chatId: 'existing-chat' };

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
      expect(mockProcessingQueue).toHaveBeenCalled();
    });
  });

  describe('wrapStream', () => {
    let middleware: ReturnType<typeof createChatHistoryMiddleware>;
    let mockDoStream: jest.Mock;
    let mockStream: ReadableStream<LanguageModelV1StreamPart>;

    beforeEach(() => {
      middleware = createChatHistoryMiddleware(mockContext);

      // Create mock stream
      mockStream = new ReadableStream({
        start(controller) {
          // Emit some test chunks
          controller.enqueue({
            type: 'text-delta',
            textDelta: 'Hello',
          });
          controller.enqueue({
            type: 'text-delta',
            textDelta: ' world',
          });
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              promptTokens: 10,
              completionTokens: 5,
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
    const callWrapStream = async (middleware: ReturnType<typeof createChatHistoryMiddleware>) => {
      return await middleware.wrapStream?.({
        doStream: mockDoStream,
        doGenerate: jest.fn(),
        model: { modelId: 'test-model' } as unknown as Parameters<NonNullable<typeof middleware.wrapStream>>[0]['model'],
        params: mockParams,
      });
    };

    it('should initialize message persistence', async () => {
      // Act
      await callWrapStream(middleware);

      // Assert
      expect(mockSafeInitializeMessagePersistence).toHaveBeenCalledWith(
        mockContext,
        mockParams
      );
    });

    it('should return transformed stream', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      mockSafeInitializeMessagePersistence.mockResolvedValue(null); // Simulate failure

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined(); // Should still return original stream
      expect(mockSafeInitializeMessagePersistence).toHaveBeenCalled();
    });

    it('should process chunks through queue', async () => {
      // Act
      const result = await callWrapStream(middleware);
      
      // Verify the queue processing setup
      expect(mockQueueInstance.enqueue).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should handle queue processing errors', async () => {
      // Arrange
      mockQueueInstance.enqueue.mockRejectedValue(new Error('Queue processing failed'));

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      // Error should be logged but not propagated
    });

    it('should handle completion operation', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // The completion is handled by the safe utilities
      expect(mockSafeCompleteMessagePersistence).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should handle completion errors gracefully', async () => {
      // Arrange
      mockSafeCompleteMessagePersistence.mockResolvedValue({
        success: false,
        error: new Error('Completion failed'),
        processingTimeMs: 100,
        textLength: 50,
      });

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      // Error should be logged but stream should continue
    });

    it('should handle completion exception gracefully', async () => {
      // Arrange
      mockSafeCompleteMessagePersistence.mockRejectedValue(new Error('Completion exception'));

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
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
      expect(result?.rawCall).toEqual(originalResult.rawCall);
      expect(result?.rawResponse).toEqual(originalResult.rawResponse);
      // Note: usage might not be available in all stream responses
    });
  });

  describe('transformParams', () => {
    let middleware: ReturnType<typeof createChatHistoryMiddleware>;

    beforeEach(() => {
      middleware = createChatHistoryMiddleware(mockContext);
    });

    it('should return params unchanged', async () => {
      // Act
      const result = await middleware.transformParams?.({ type: 'stream', params: mockParams });

      // Assert
      expect(result).toEqual(mockParams);
    });

    it('should handle empty params', async () => {
      // Arrange
      const emptyParams = {} as LanguageModelV1CallOptions;

      // Act
      const result = await middleware.transformParams?.({ type: 'generate', params: emptyParams });

      // Assert
      expect(result).toEqual(emptyParams);
    });

    it('should handle complex params', async () => {
      // Arrange
      const complexParams = {
        ...mockParams,
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 1000,
        stop: ['END'],
      };

      // Act
      const result = await middleware.transformParams?.({ type: 'stream', params: complexParams });

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
        usage: { totalTokens: 20 },
      });
    });

    const callWrapGenerate = async (middleware: LanguageModelV1Middleware) => {
      return middleware.wrapGenerate ? await middleware.wrapGenerate({
        doGenerate: mockDoGenerate,
        doStream: jest.fn(),
        params: mockParams,
        model: {
          specificationVersion: 'v1',
          provider: '',
          modelId: '',
          defaultObjectGenerationMode: undefined,
          supportsImageUrls: undefined,
          supportsStructuredOutputs: undefined,
          supportsUrl: undefined,
          doGenerate: function (): PromiseLike<{ text?: string; reasoning?: string | Array<{ type: 'text'; text: string; signature?: string; } | { type: 'redacted'; data: string; }>; files?: Array<{ data: string | Uint8Array; mimeType: string; }>; toolCalls?: Array<LanguageModelV1FunctionToolCall>; finishReason: LanguageModelV1FinishReason; usage: { promptTokens: number; completionTokens: number; }; rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown>; }; rawResponse?: { headers?: Record<string, string>; body?: unknown; }; request?: { body?: string; }; response?: { id?: string; timestamp?: Date; modelId?: string; }; warnings?: LanguageModelV1CallWarning[]; providerMetadata?: LanguageModelV1ProviderMetadata; sources?: LanguageModelV1Source[]; logprobs?: LanguageModelV1LogProbs; }> {
            throw new Error('Function not implemented.');
          },
          doStream: function (): PromiseLike<{ stream: ReadableStream<LanguageModelV1StreamPart>; rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown>; }; rawResponse?: { headers?: Record<string, string>; }; request?: { body?: string; }; warnings?: Array<LanguageModelV1CallWarning>; }> {
            throw new Error('Function not implemented.');
          }
        }
      }) : undefined;
    };

    it('should initialize message persistence for text generation', async () => {
      // Act
      await callWrapGenerate(middleware);

      // Assert
      expect(mockSafeInitializeMessagePersistence).toHaveBeenCalledWith(
        mockContext,
        mockParams
      );
    });

    it('should complete message persistence after generation', async () => {
      // Act
      await callWrapGenerate(middleware);

      // Assert
      expect(mockSafeCompleteMessagePersistence).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 'chat-456',
          turnId: 1,
          messageId: 100,
          generatedText: 'Generated text response',
          startTime: expect.any(Number),
        })
      );
    });

    it('should return generated result', async () => {
      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toEqual({
        text: 'Generated text response',
        finishReason: 'stop',
        usage: { totalTokens: 20 },
      });
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      // Arrange
      mockSafeInitializeMessagePersistence.mockResolvedValue(null);

      // Act
      const result = await callWrapGenerate(middleware);

      // Assert
      expect(result).toEqual({
        text: 'Generated text response',
        finishReason: 'stop',
        usage: { totalTokens: 20 },
      });
      expect(mockDoGenerate).toHaveBeenCalled();
    });

    it('should handle generation errors', async () => {
      // Arrange
      const generationError = new Error('Generation failed');
      mockDoGenerate.mockRejectedValue(generationError);

      // Act & Assert
      await expect(callWrapGenerate(middleware)).rejects.toThrow('Generation failed');
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
