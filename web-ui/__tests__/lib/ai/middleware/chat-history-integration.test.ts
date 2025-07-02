/**
 * @jest-environment node
 */

/**
 * Integration tests for chat history middleware with AI SDK streaming
 */

import { jest } from '@jest/globals';

// Mock all dependencies
const mockDb = {
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'test-chat-123' }]),
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

jest.mock('@/lib/drizzle-db/connection', () => ({ db: mockDb }));
jest.mock('drizzle-orm', () => ({ eq: jest.fn() }));
jest.mock('@/drizzle/schema', () => ({
  chats: { id: 'chats.id' },
  chatTurns: { id: 'chatTurns.id' },
  chatMessages: { id: 'chatMessages.id' },
  tokenUsage: {},
  messageStatuses: {},
  turnStatuses: {},
}));
jest.mock('@/lib/logger', () => ({
  log: jest.fn((fn) => fn({ info: jest.fn(), error: jest.fn() })),
}));

import { wrapLanguageModel } from 'ai';
import { createChatHistoryMiddleware, type ChatHistoryContext } from '@/lib/ai/middleware/chat-history-middleware';

describe('Chat History Middleware Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate with AI SDK wrapLanguageModel', async () => {
    // Mock base language model
    const mockBaseModel = {
      specificationVersion: 'v1' as const,
      provider: 'test',
      modelId: 'test-model',
      doStream: jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.enqueue({ type: 'text-delta', textDelta: ' world!' });
            controller.enqueue({ 
              type: 'finish', 
              finishReason: 'stop',
              usage: { promptTokens: 5, completionTokens: 10 }
            });
            controller.close();
          }
        }),
        finishReason: 'stop',
        usage: { promptTokens: 5, completionTokens: 10 },
      }),
      doGenerate: jest.fn(),
    };

    const context: ChatHistoryContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      model: 'test-model',
    };

    // Create wrapped model with chat history middleware
    const wrappedModel = wrapLanguageModel({
      model: mockBaseModel,
      middleware: createChatHistoryMiddleware(context),
    });

    expect(wrappedModel).toBeDefined();
    expect(wrappedModel.provider).toBe('test');
    expect(wrappedModel.modelId).toBe('test-model');

    // Test streaming with the wrapped model
    const streamResult = await wrappedModel.doStream({
      prompt: [{ role: 'user', content: 'Test message' }],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
    });

    expect(streamResult).toBeDefined();
    expect(streamResult.stream).toBeInstanceOf(ReadableStream);

    // Read from the stream to trigger middleware
    const reader = streamResult.stream.getReader();
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Verify we received the expected chunks
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ type: 'text-delta', textDelta: 'Hello' });
    expect(chunks[1]).toEqual({ type: 'text-delta', textDelta: ' world!' });
    expect(chunks[2]).toEqual({ 
      type: 'finish', 
      finishReason: 'stop',
      usage: { promptTokens: 5, completionTokens: 10 }
    });

    // Verify database operations were called
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should handle tool calls in streaming context', async () => {
    const mockBaseModel = {
      specificationVersion: 'v1' as const,
      provider: 'test',
      modelId: 'test-model',
      doStream: jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ 
              type: 'tool-call',
              toolCallId: 'call-123',
              toolName: 'searchCaseFile',
              args: { query: 'policy violation' }
            });
            controller.enqueue({ type: 'text-delta', textDelta: 'Based on the search...' });
            controller.enqueue({ 
              type: 'finish', 
              finishReason: 'stop',
              usage: { promptTokens: 15, completionTokens: 25 }
            });
            controller.close();
          }
        }),
      }),
      doGenerate: jest.fn(),
    };

    const context: ChatHistoryContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      model: 'test-model',
    };

    const wrappedModel = wrapLanguageModel({
      model: mockBaseModel,
      middleware: createChatHistoryMiddleware(context),
    });

    const streamResult = await wrappedModel.doStream({
      prompt: [{ role: 'user', content: 'Search for policy violations' }],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
    });

    // Read stream
    const reader = streamResult.stream.getReader();
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Verify tool call was handled
    expect(chunks).toHaveLength(3);
    expect(chunks[0].type).toBe('tool-call');
    expect(chunks[0].toolName).toBe('searchCaseFile');

    // Verify database operations included tool call storage
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.insert().values).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'tool',
        toolName: 'searchCaseFile',
      })
    );
  });

  it('should handle middleware errors gracefully without breaking stream', async () => {
    // Mock database error
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const mockBaseModel = {
      specificationVersion: 'v1' as const,
      provider: 'test',
      modelId: 'test-model',
      doStream: jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.close();
          }
        }),
      }),
      doGenerate: jest.fn(),
    };

    const context: ChatHistoryContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      model: 'test-model',
    };

    // Should not throw error even if middleware fails
    const wrappedModel = wrapLanguageModel({
      model: mockBaseModel,
      middleware: createChatHistoryMiddleware(context),
    });

    const streamResult = await wrappedModel.doStream({
      prompt: [{ role: 'user', content: 'Test' }],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
    });

    expect(streamResult).toBeDefined();
    expect(streamResult.stream).toBeInstanceOf(ReadableStream);

    // Stream should still work despite middleware error
    const reader = streamResult.stream.getReader();
    const { value } = await reader.read();
    expect(value).toEqual({ type: 'text-delta', textDelta: 'Hello' });
  });

  it('should preserve original stream behavior when middleware is bypassed', async () => {
    // Create a fresh mock for each test case
    const createMockModel = () => ({
      specificationVersion: 'v1' as const,
      provider: 'test',
      modelId: 'test-model',
      doStream: jest.fn().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Original behavior' });
            controller.close();
          }
        }),
        finishReason: 'stop',
        usage: { promptTokens: 3, completionTokens: 7 },
      }),
      doGenerate: jest.fn(),
    });

    // Test without middleware first
    const originalModel = createMockModel();
    const originalResult = await originalModel.doStream({
      prompt: [{ role: 'user', content: 'Test' }],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
    });

    const originalReader = originalResult.stream.getReader();
    const { value: originalValue } = await originalReader.read();

    // Test with middleware using a fresh model instance
    const context: ChatHistoryContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      model: 'test-model',
    };

    const wrappedModel = wrapLanguageModel({
      model: createMockModel(),
      middleware: createChatHistoryMiddleware(context),
    });

    const wrappedResult = await wrappedModel.doStream({
      prompt: [{ role: 'user', content: 'Test' }],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
    });

    const wrappedReader = wrappedResult.stream.getReader();
    const { value: wrappedValue } = await wrappedReader.read();

    // Stream content should be identical
    expect(wrappedValue).toEqual(originalValue);
    expect(wrappedValue).toEqual({ type: 'text-delta', textDelta: 'Original behavior' });
  });
});