/**
 * @jest-environment node
 */

/**
 * Jest tests for the chat history middleware functionality
 */

import { jest } from '@jest/globals';
import { makeMockDb } from '@/__tests__/jest.setup';

// Mock the database connection and schema
let mockDb: DatabaseType;

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
  type ChatHistoryContext,
} from '@/lib/ai/middleware/chat-history';
import {
  LanguageModelV1,
  LanguageModelV1Prompt,
  LanguageModelV1StreamPart,
  streamText,
  wrapLanguageModel,
} from 'ai';
import { DatabaseType } from '@/lib/drizzle-db';

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

describe('Chat History Middleware', () => {
  beforeEach(() => {
    mockDb = makeMockDb();
  });

  describe('createChatHistoryMiddleware', () => {
    it('should create a middleware that handles text streaming', async () => {
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

      runStreamableTest({
        startStream(controller) {
          mockStreamParts.forEach((part) =>
            controller.enqueue(part as LanguageModelV1StreamPart),
          );
          controller.close();
        },
      });

      // Verify database operations were called
      expect(mockDb.insert).toHaveBeenCalled(); // For creating chat and turn
    });

    it('should handle tool calls correctly', async () => {
      runStreamableTest({
        startStream(controller) {
          controller.enqueue({
            type: 'tool-call',
            toolCallType: 'function',
            toolCallId: 'call-123',
            toolName: 'searchCaseFile',
            args: JSON.stringify({ query: 'test query' }),
          });
          controller.enqueue({
            type: 'text-delta',
            textDelta: 'Based on search results...',
          });
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: 15, completionTokens: 25 },
          });
          controller.close();
        },
      });
      expect(mockDb.insert).toHaveBeenCalled(); // Should insert tool call message
    });

    /*
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
        }) as any,
      }) as any;

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
    */
  });
});
