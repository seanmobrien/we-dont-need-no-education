/**
 * @jest-environment node
 */

/**
 * Integration tests for chat history middleware with AI SDK streaming
 */

import { jest } from '@jest/globals';
import { makeMockDb } from '@/__tests__/jest.setup';

const setupMockDb = () => {
  const theDb = makeMockDb();
  let seq = 1;
  (theDb.execute as jest.Mock).mockImplementation(() => {
    return [seq++, seq++, seq++, seq++];
  });
  return theDb;
};

let mockDb = setupMockDb();
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

import {
  LanguageModelV1,
  LanguageModelV1Prompt,
  LanguageModelV1StreamPart,
  streamText,
  wrapLanguageModel,
} from 'ai';
import {
  createChatHistoryMiddleware,
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history';

const setupStreamingMockModel = ({
  startStream,
  rawCall,
}: {
  startStream: UnderlyingDefaultSource<LanguageModelV1StreamPart>['start'];
  rawCall?: Record<string, unknown>;
}): LanguageModelV1 =>
  /*  new MockLanguageModelV1({
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: `Hello, world!`,
    }),
  });*/

  ({
    specificationVersion: 'v1',
    provider: 'test',
    modelId: 'test-model',
    defaultObjectGenerationMode: 'json',
    doStream: jest.fn<LanguageModelV1['doStream']>().mockResolvedValue({
      stream: new ReadableStream({
        start: startStream,
      }),
      rawCall: {
        rawPrompt: undefined,
        rawSettings: {},
        ...(rawCall ?? {}),
      },
    }),
    doGenerate: jest.fn<LanguageModelV1['doGenerate']>(),
  });

const runStreamableTest = async ({
  context,
  prompt,
  ...props
}:
  | {
      model: LanguageModelV1;
      context?: Partial<ChatHistoryContext>;
      prompt?: LanguageModelV1Prompt;
    }
  | {
      context?: Partial<ChatHistoryContext>;
      prompt?: LanguageModelV1Prompt;
      startStream: UnderlyingDefaultSource<LanguageModelV1StreamPart>['start'];
      rawCall?: Record<string, unknown>;
    }) => {
  const model =
    'model' in props
      ? props.model
      : setupStreamingMockModel({
          startStream: props.startStream,
          rawCall: props.rawCall,
        });
  // Create wrapped model with chat history middleware
  const wrappedModel = wrapLanguageModel({
    model,
    middleware: createChatHistoryMiddleware({
      userId: 'test-user',
      sessionId: 'test-session',
      ...(context ?? {}),
    }),
  });

  // Use doStream to test streaming behavior
  const streamResult = await streamText({
    // await wrappedModel.doStream({
    model: wrappedModel,
    messages: prompt
      ? prompt
      : [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Try and make the world a a better place.',
              },
            ],
          },
        ],
    //seed: undefined,
    //maxTokens: undefined,
    //temperature: undefined,
    //topP: undefined,
    //topK: undefined,
    //frequencyPenalty: undefined,
    //presencePenalty: undefined,
    //stopSequences: undefined,
    // mode: { type: 'regular' },
    //inputFormat: 'messages',
  });

  /*
  expect(streamResult).toBeDefined();
  expect(streamResult.stream).toBeInstanceOf(ReadableStream);

  // Read from the stream to trigger middleware
  const reader = streamResult.stream.getReader();
  const chunks: Array<LanguageModelV1StreamPart> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      chunks.push(value);
    }
    if (done) {
      break;
    }
  }

  // Verify we received the expected chunks
  return chunks;
  */
  // Read from the stream to trigger middleware and collect all chunks as a string
  return await streamResult.text;
};

describe('Chat History Middleware Integration', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockDb = setupMockDb();
  });

  it('should integrate with AI SDK wrapLanguageModel', async () => {
    const chunks = await runStreamableTest({
      startStream: (controller) => {
        controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
        controller.enqueue({ type: 'text-delta', textDelta: ' world!' });
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 10 },
        });
        controller.close();
      },
    });

    /*
       expect(wrappedModel).toBeDefined();
    expect(wrappedModel.provider).toBe('test');
    expect(wrappedModel.modelId).toBe('test-model');

    // Test streaming with the wrapped model
    const streamResult = await wrappedModel.doStream({
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, how are you today?',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,

      mode: { type: 'regular' },
      inputFormat: 'messages',
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
    */
    expect(chunks).toEqual('Hello, World!');

    /*
    // Verify we received the expected chunks
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ type: 'text-delta', textDelta: 'Hello' });
    expect(chunks[1]).toEqual({ type: 'text-delta', textDelta: ' world!' });
    expect(chunks[2]).toEqual({
      type: 'finish',
      finishReason: 'stop',
      usage: { promptTokens: 5, completionTokens: 10 },
    });
*/
    // Verify database operations were called
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should integrate with AI SDK wrapLanguageModel', async () => {
    // Mock base language model
    const mockBaseModel = {
      specificationVersion: 'v1' as const,
      defaultObjectGenerationMode: 'json',
      provider: 'test',
      modelId: 'test-model',
      doStream: jest.fn<LanguageModelV1['doStream']>().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.enqueue({ type: 'text-delta', textDelta: ' world!' });
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 5, completionTokens: 10 },
            });
            controller.close();
          },
        }),
        rawCall: {
          rawPrompt: undefined,
          rawSettings: {},
        },
      }),
      doGenerate: jest.fn(),
    } as LanguageModelV1;

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
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, how are you today?',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,

      mode: { type: 'regular' },
      inputFormat: 'messages',
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
      usage: { promptTokens: 5, completionTokens: 10 },
    });

    // Verify database operations were called
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('should handle tool calls in streaming context', async () => {
    const mockBaseModel: LanguageModelV1 = {
      specificationVersion: 'v1',
      provider: 'test',
      modelId: 'test-model',
      defaultObjectGenerationMode: 'json',
      doStream: jest.fn<LanguageModelV1['doStream']>().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallType: 'function',
              toolCallId: 'call-123',
              toolName: 'searchCaseFile',
              args: JSON.stringify({ query: 'policy violation' }),
            });
            controller.enqueue({
              type: 'text-delta',
              textDelta: 'Based on the search...',
            });
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 15, completionTokens: 25 },
            });
            controller.close();
          },
        }),
        rawCall: {
          rawPrompt: undefined,
          rawSettings: {},
        },
      }),
      doGenerate: jest.fn<LanguageModelV1['doGenerate']>(),
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
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Search for policy violations',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
      mode: { type: 'regular' },
      inputFormat: 'messages',
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
    expect(chunks[0]).toHaveProperty('type', 'tool-call');
    expect(chunks[0]).toHaveProperty('toolName', 'searchCaseFile');

    // Verify database operations included tool call storage
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.insert().values).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'tool',
        toolName: 'searchCaseFile',
      }),
    );
  });

  it('should handle middleware errors gracefully without breaking stream', async () => {
    // Mock database error
    mockDb.insert.mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const mockBaseModel: LanguageModelV1 = {
      specificationVersion: 'v1',
      provider: 'test',
      modelId: 'test-model',
      defaultObjectGenerationMode: 'json',
      doStream: jest.fn<LanguageModelV1['doStream']>().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
            controller.close();
          },
        }),
        rawCall: {
          rawPrompt: undefined,
          rawSettings: {},
        },
      }),
      doGenerate: jest.fn<LanguageModelV1['doGenerate']>(),
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
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Test',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,

      mode: { type: 'regular' },
      inputFormat: 'messages',
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
    const createMockModel = (): LanguageModelV1 => ({
      specificationVersion: 'v1',
      provider: 'test',
      modelId: 'test-model',
      defaultObjectGenerationMode: 'json',
      doStream: jest.fn<LanguageModelV1['doStream']>().mockResolvedValue({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: 'Original behavior',
            });
            controller.close();
          },
        }),
        rawCall: {
          rawPrompt: undefined,
          rawSettings: {},
        },
      }),
      doGenerate: jest.fn<LanguageModelV1['doGenerate']>(),
    });

    // Test without middleware first
    const originalModel = createMockModel();
    const originalResult = await originalModel.doStream({
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Test',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
      inputFormat: 'messages',
      mode: {
        type: 'regular',
        tools: undefined,
        toolChoice: undefined,
      },
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
      prompt: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Test',
            },
          ],
        },
      ],
      seed: undefined,
      maxTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
      mode: { type: 'regular' },
      inputFormat: 'messages',
    });

    const wrappedReader = wrappedResult.stream.getReader();
    const { value: wrappedValue } = await wrappedReader.read();

    // Stream content should be identical
    expect(wrappedValue).toEqual(originalValue);
    expect(wrappedValue).toEqual({
      type: 'text-delta',
      textDelta: 'Original behavior',
    });
  });
});
