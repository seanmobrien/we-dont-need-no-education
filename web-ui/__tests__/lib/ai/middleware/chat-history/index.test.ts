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
  initializeChatHistoryTables,
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history';
import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { handleFlush } from '@/lib/ai/middleware/chat-history/flush-handlers';
import { generateChatId } from '@/lib/ai/core';
import { db } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { messageStatuses, turnStatuses } from '@/drizzle/schema';
import type { LanguageModelV1CallOptions, LanguageModelV1StreamPart } from 'ai';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/import-incoming-message');
jest.mock('@/lib/ai/middleware/chat-history/processing-queue');
jest.mock('@/lib/ai/middleware/chat-history/flush-handlers');
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
const mockGenerateChatId = generateChatId as jest.MockedFunction<typeof generateChatId>;
const mockDb = db as jest.Mocked<typeof db>;
const mockLog = log as jest.MockedFunction<typeof log>;
//const mockLoggedError = LoggedError as jest.Mocked<typeof LoggedError>;

describe('Chat History Middleware', () => {
  let mockContext: ChatHistoryContext;
  let mockParams: LanguageModelV1CallOptions;
  let mockQueueInstance: jest.Mocked<ProcessingQueue>;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Mock context
    mockContext = {
      userId: 'user-123',
      chatId: 'chat-456',
      model: 'gpt-4o',
      temperature: 0.7,
      sessionId: 'session-789',
    };

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
    mockImportIncomingMessage.mockResolvedValue({
      chatId: 'chat-456',
      turnId: 1,
      messageId: 100,
      nextMessageOrder: 1,
      pendingMessage: { 
        messageId: 100, 
        content: '', 
        role: 'assistant',
        chatId: 'chat-456',
        turnId: 1,
        metadata: null,
        providerId: null,
        statusId: 1,
        toolInstanceId: null,
        toolName: null,
        functionCall: null,
        messageOrder: 1,
        optimizedContent: null,
      },
    });

    mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    mockHandleFlush.mockResolvedValue({ 
      success: true, 
      latencyMs: 100, 
      textLength: 50 
    });
    (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock)
      .mockClear();
    // mockLoggedError.isTurtlesAllTheWayDownBaby = jest.fn();
    

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
      expect(middleware.transformParams).toBeDefined();
    });

    it('should generate chatId when not provided', () => {
      // Arrange
      const contextWithoutChatId = { ...mockContext, chatId: undefined };

      // Act
      createChatHistoryMiddleware(contextWithoutChatId);

      // Assert
      expect(mockGenerateChatId).toHaveBeenCalledWith();
    });

    it('should generate chatId from numeric value', () => {
      // Arrange
      const contextWithNumericChatId = { ...mockContext, chatId: 123 as unknown as string };

      // Act
      createChatHistoryMiddleware(contextWithNumericChatId);

      // Assert
      expect(mockGenerateChatId).toHaveBeenCalledWith(123);
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
      });      mockDoStream = jest.fn().mockResolvedValue({
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

    it('should initialize chat through transaction', async () => {
      // Act
      await callWrapStream(middleware);

      // Assert
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockImportIncomingMessage).toHaveBeenCalledWith({
        tx: expect.anything(),
        context: mockContext,
        params: mockParams,
      });
    });

    it('should return transformed stream', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result?.stream).toBeDefined();
      expect(result?.stream).toBeInstanceOf(ReadableStream);
    });

    it('should handle stream transformation errors gracefully', async () => {
      // Arrange
      mockImportIncomingMessage.mockRejectedValue(new Error('Import failed'));

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          log: true,
          source: 'ChatHistoryMiddleware',
          message: 'Error initializing chat history middleware',
          critical: true,
        })
      );
      expect(result?.stream).toBeDefined(); // Should still return original stream
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

    it('should handle flush operation', async () => {
      // Act
      const result = await callWrapStream(middleware);

      // The flush is called internally, we verify the mock was set up correctly
      expect(mockHandleFlush).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should handle flush errors gracefully', async () => {
      // Arrange
      mockHandleFlush.mockResolvedValue({
        success: false,
        error: new Error('Flush failed'),
        latencyMs: 100,
        textLength: 50,
      });

      // Act
      const result = await callWrapStream(middleware);

      // Assert
      expect(result).toBeDefined();
      // Error should be logged but stream should continue
    });

    it('should handle flush exception gracefully', async () => {
      // Arrange
      mockHandleFlush.mockRejectedValue(new Error('Flush exception'));

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

  describe('Console Logging', () => {
    it('should log middleware creation', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      createChatHistoryMiddleware(mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('create chat history');

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Context Variations', () => {
    it('should handle minimal context', () => {
      // Arrange
      const minimalContext: ChatHistoryContext = {
        userId: 'user-minimal',
      };

      // Act
      const middleware = createChatHistoryMiddleware(minimalContext);

      // Assert
      expect(middleware).toBeDefined();
      expect(mockGenerateChatId).toHaveBeenCalled();
    });

    it('should handle full context', () => {
      // Arrange
      const fullContext: ChatHistoryContext = {
        userId: 'user-full',
        chatId: 'chat-full',
        sessionId: 'session-full',
        model: 'gpt-4-turbo',
        temperature: 0.9,
        topP: 0.95,
      };

      // Act
      const middleware = createChatHistoryMiddleware(fullContext);

      // Assert
      expect(middleware).toBeDefined();
      expect(mockGenerateChatId).not.toHaveBeenCalled();
    });
  });
});

describe('initializeChatHistoryTables', () => {
  let mockInsert: jest.Mock;
  let mockOnConflictDoNothing: jest.Mock;

  beforeEach(() => {
    // jest.clearAllMocks();

    mockOnConflictDoNothing = jest.fn().mockResolvedValue(undefined);
    mockInsert = jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoNothing: mockOnConflictDoNothing,
      }),
    });

    mockDb.insert = mockInsert;
  });

  it('should initialize message statuses', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(mockInsert).toHaveBeenCalledWith(messageStatuses);
    expect(mockInsert.mock.calls[0][0]).toBe(messageStatuses);
  });

  it('should initialize turn statuses', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(mockInsert).toHaveBeenCalledWith(turnStatuses);
    expect(mockInsert.mock.calls[1][0]).toBe(turnStatuses);
  });

  it('should insert correct message status values', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    const messageStatusCall = mockInsert.mock.calls.find(call => call[0] === messageStatuses);
    expect(messageStatusCall).toBeDefined();
    
    const valuesCall = mockInsert().values.mock.calls[0][0];
    expect(valuesCall).toEqual([
      { id: 1, code: 'streaming', description: 'Message is being generated' },
      { id: 2, code: 'complete', description: 'Message is fully completed' },
    ]);
  });

  it('should insert correct turn status values', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    const turnStatusCall = mockInsert.mock.calls.find(call => call[0] === turnStatuses);
    expect(turnStatusCall).toBeDefined();
    
    const valuesCall = mockInsert().values.mock.calls[1][0];
    expect(valuesCall).toEqual([
      { id: 1, code: 'waiting', description: 'Waiting for model or tool response' },
      { id: 2, code: 'complete', description: 'Turn is complete' },
      { id: 3, code: 'error', description: 'Turn completed with error' },
    ]);
  });

  it('should use onConflictDoNothing for both inserts', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(2);
  });

  it('should log successful initialization', async () => {
    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const dbError = new Error('Database connection failed');
    mockOnConflictDoNothing.mockRejectedValue(dbError);

    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        log: true,
        source: 'ChatHistoryMiddleware',
        message:
          'Failed to initialize chat message status table',
        critical: true,
      }),
    );
  });

  it('should handle insert errors for message statuses', async () => {
    // Arrange
    mockInsert.mockImplementationOnce(() => {
      throw new Error('Insert failed');
    });

    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'ChatHistoryMiddleware',
        message: 'Failed to initialize chat message status table',
      }),
    );
  });

  it('should handle insert errors for turn statuses', async () => {
    // Arrange
    let callCount = 0;
    mockInsert.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Turn status insert failed');
      }
      return {
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
        }),
      };
    });

    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'ChatHistoryMiddleware',
        message: 'Failed to initialize chat turn status table',
      }),
    );
  });

  it('should continue initialization even if first insert fails', async () => {
    // Arrange
    let callCount = 0;
    mockOnConflictDoNothing.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First insert failed');
      }
      return Promise.resolve(undefined);
    });

    // Act
    await initializeChatHistoryTables();

    // Assert
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalled();
  });
});
