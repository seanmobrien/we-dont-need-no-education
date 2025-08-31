/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolUIPart, UIMessage } from 'ai';
import {
  optimizeMessagesWithToolSummarization,
  cacheManager,
  extractToolCallIds,
  hasToolCalls,
} from '@/lib/ai/chat/message-optimizer-tools';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { generateText, generateObject } from 'ai';

// Mock dependencies
jest.mock('@/lib/ai/aiModelFactory');
jest.mock('ai');
jest.mock('@/lib/logger', () => ({
  log: jest.fn((callback) => {
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    callback(mockLogger);
  }),
}));

const mockAiModelFactory = aiModelFactory as jest.MockedFunction<
  typeof aiModelFactory
>;
const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;
const mockGenerateObject = generateObject as jest.MockedFunction<
  typeof generateObject
>;

// Helper to extract text from UIMessage parts
const messageText = (m: UIMessage): string =>
  (m.parts || [])
    .map((p: any) =>
      p && p.type === 'text' && typeof p.text === 'string'
        ? p.text
        : 'input' in p
          ? p.input
          : '',
    )
    .join(' ')
    .trim();

describe('Message Optimizer Tools', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    cacheManager.clear();

    // Default mock setup
    mockAiModelFactory.mockReturnValue('mock-lofi-model' as never);
    mockGenerateText.mockResolvedValue({
      text: 'Tool executed successfully with optimized results.',
      usage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
    } as never);
    mockGenerateObject.mockResolvedValue({
      object: {
        messageSummary: 'Tool executed successfully with optimized results.',
        chatTitle: 'Tool Summary',
      },
      usage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
    } as never);
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should clear cache properly', () => {
      // Import some test data
      cacheManager.import({
        test_key_1: 'Test summary 1',
        test_key_2: 'Test summary 2',
      });

      expect(cacheManager.getStats().size).toBe(2);

      cacheManager.clear();
      expect(cacheManager.getStats().size).toBe(0);
    });

    it('should export and import cache data', () => {
      const testData = {
        hash1: 'Summary for tool call 1',
        hash2: 'Summary for tool call 2',
      };

      cacheManager.import(testData);
      const exported = cacheManager.export();

      expect(exported).toEqual(testData);
    });

    it('should track cache statistics', () => {
      cacheManager.import({
        abcd1234: 'Test summary 1',
        efgh5678: 'Test summary 2',
      });

      const stats = cacheManager.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['abcd1234', 'efgh5678']);
    });
  });

  describe('Utility Functions', () => {
    describe('extractToolCallIds', () => {
      it('should extract tool call IDs from assistant messages', () => {
        const message: UIMessage = {
          role: 'assistant',
          parts: [
            { type: 'text', text: 'I will help you' },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-streaming',
              input: undefined,
            },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-available',
              input: { searchTerm: 'search term' },
            },
            {
              type: 'tool-analyze',
              toolCallId: 'call_2',
              state: 'input-available',
              input: { target: 'results' },
            },
          ],
          id: 'msg_1',
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual(['call_1', 'call_2']);
      });

      it('should return empty array for non-assistant messages', () => {
        const message: UIMessage = {
          role: 'user',
          parts: [
            { type: 'text', text: 'Hello' },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-streaming',
              input: undefined,
            },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-available',
              input: { searchTerm: 'search term' },
            },
            {
              type: 'tool-analyze',
              toolCallId: 'call_2',
              state: 'input-available',
              input: { target: 'results' },
            },
          ],
          id: 'msg_1',
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual([]);
      });

      it('should handle messages without tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello back' }],
          id: 'msg_1',
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual([]);
      });
    });

    describe('hasToolCalls', () => {
      it('should return true for assistant messages with tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          parts: [
            { type: 'text', text: 'Processing...' },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-streaming',
              input: undefined,
            },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-available',
              input: { searchTerm: 'search term' },
            },
            {
              type: 'tool-analyze',
              toolCallId: 'call_2',
              state: 'input-available',
              input: { target: 'results' },
            },
          ],
          id: 'msg_1',
        };

        expect(hasToolCalls(message)).toBe(true);
      });

      it('should return false for user messages', () => {
        const message: UIMessage = {
          role: 'user',
          parts: [
            { type: 'text', text: 'Processing...' },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-streaming',
              input: undefined,
            },
            {
              type: 'tool-search',
              toolCallId: 'call_1',
              state: 'input-available',
              input: { searchTerm: 'search term' },
            },
            {
              type: 'tool-analyze',
              toolCallId: 'call_2',
              state: 'input-available',
              input: { target: 'results' },
            },
          ],
          id: 'msg_1',
        };

        expect(hasToolCalls(message)).toBe(false);
      });

      it('should return false for assistant messages without tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello back' }],
          id: 'msg_1',
        };

        expect(hasToolCalls(message)).toBe(false);
      });
    });
  });
  type FakeToolType = {
    type: string;
    toolCallId: string;
    state: string;
    input?: Record<string, unknown>;
    output?: unknown;
    id?: string;
    rawInput?: unknown;
    errorText?: string;
  };

  const createUserMessage = (content: string, id: string): UIMessage => ({
    role: 'user',
    parts: [{ type: 'text', text: content }],
    id,
  });

  const createAssistantMessage = (content: string, id: string): UIMessage => ({
    role: 'assistant',
    parts: [{ type: 'text', text: content }],
    id,
  });

  const createToolMessage = (
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>,
    result?: unknown,
    id?: string,
    error?: string,
  ): UIMessage => {
    const builtToolName = `tool-${toolName}`;

    const toolParts: FakeToolType[] = [
      {
        type: builtToolName,
        toolCallId: toolCallId,
        state: 'input-streaming',
        input: undefined,
        id,
      },
    ];
    if (args) {
      toolParts.push({
        type: builtToolName,
        toolCallId: toolCallId,
        state: 'input-available',
        input: args,
        id,
      });
    }
    if (result) {
      toolParts.push({
        type: builtToolName,
        toolCallId: toolCallId,
        state: 'output-available',
        input: args,
        output: result,
        id,
      });
    }
    if (error) {
      toolParts.push({
        type: builtToolName,
        state: 'output-error',
        toolCallId: toolCallId,
        rawInput: args,
        errorText: error,
      });
    }

    const baseMessage = {
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Processing...' }, ...toolParts],
      id: id || `tool_msg_${toolCallId}`,
    };

    // Tool result message
    return {
      ...baseMessage,
    } as UIMessage;
  };

  const createToolResultMessage = (
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>,
    result?: unknown,
    id?: string,
    error?: string,
  ): UIMessage => {
    const builtToolName = `tool-${toolName}`;

    const toolParts: FakeToolType[] = [];
    // Skip input / streaming message (they must have been sent in an earlier message)
    if (result) {
      toolParts.push({
        type: builtToolName,
        toolCallId: toolCallId,
        state: 'output-available',
        input: args,
        output: result,
        id,
      });
    }
    if (error) {
      toolParts.push({
        type: builtToolName,
        state: 'output-error',
        toolCallId: toolCallId,
        rawInput: args,
        errorText: error,
      });
    }

    const baseMessage = {
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'Processing...' }, ...toolParts],
      id: id || `tool_msg_${toolCallId}_result`,
    };

    // Tool result message
    return {
      ...baseMessage,
    } as UIMessage;
  };

  const createRecentMessageBuffer = (includeTool: boolean) => {
    const messages: UIMessage[] = [];
    // Recent interactions (should be preserved - last 2 user interactions)
    messages.push(createUserMessage('What about examples?', 'user_3'));
    if (includeTool) {
      messages.push(
        createToolResultMessage(
          'call_inrecent',
          'semantic_search',
          { query: 'examples' },
          'Found 5 results',
        ),
      );
    }
    messages.push(
      createAssistantMessage('Let me search for examples', 'assistant_4'),
    );
    messages.push(createUserMessage('Thanks!', 'user_4'));
    messages.push(createAssistantMessage('You are welcome!', 'assistant_5'));

    return messages;
  };

  const createStandardUsecase = () => {
    const messages: UIMessage[] = [
      // Old interaction with completed tool call (will be summarized)
      createUserMessage('Search for documentation', 'user_1'),
      createAssistantMessage('I will search for documentation', 'assistant_1'),
      createToolMessage(
        'call_1',
        'semantic_search',
        { query: 'docs' },
        'Found 10 results',
      ),
      createAssistantMessage('Found some documentation', 'assistant_2'),

      // Another old interaction
      createUserMessage('What about tutorials?', 'user_2'),
      createAssistantMessage('Let me search for tutorials', 'assistant_3'),
      // Neither of these messages should be optimized because the response is in the preserve set
      createToolMessage('call_inrecent', 'semantic_search', {
        query: 'this value is split',
      }),
      ...createRecentMessageBuffer(true),
    ];
    return messages;
  };

  describe('Message Optimization', () => {
    it('should preserve recent messages when no optimization is needed', async () => {
      const messages: UIMessage[] = [
        createUserMessage('Hello', 'user_1'),
        createAssistantMessage('Hi there!', 'assistant_1'),
        createUserMessage('How are you?', 'user_2'),
        createAssistantMessage('I am doing well', 'assistant_2'),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );

      expect(optimized).toEqual(messages);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    const summary_input = '[SUMMARIZED - (input) See summary message]';
    const summary_output = '[SUMMARIZED - (output) See summary message]';

    it('should optimize old tool calls while preserving recent interactions', async () => {
      const messages = createStandardUsecase();

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );
      // Should have created summary messages
      expect(optimized.length).toEqual(messages.length);
      // Should have excluded streaming tool with response
      expect(optimized[2].parts.length).toEqual(messages[2].parts.length - 1);
      // Should have optimized request
      expect(
        (
          optimized[2].parts[1] as ToolUIPart & {
            type: 'tool-abc';
            state: 'input-available';
          }
        ).input,
      ).toEqual(summary_input);
      expect(
        (
          optimized[2].parts[2] as ToolUIPart & {
            type: 'tool-abc';
            state: 'output-available';
          }
        ).input,
      ).toEqual(summary_input);
      expect(
        (
          optimized[2].parts[2] as ToolUIPart & {
            type: 'tool-abc';
            state: 'output-available';
          }
        ).output,
      ).toEqual(summary_output);
      // Should have called LLM for summarization
      expect(mockGenerateObject).toHaveBeenCalled();
    });
    it('should use cached summaries for identical tool calls', async () => {
      const toolMessages = [
        // Old messages with tool calls
        createUserMessage('Search for docs', 'user_1'),
        createAssistantMessage('I will search', 'assistant_1'),
        createToolMessage('call_1', 'search', { query: 'docs' }),
        createToolMessage('call_1', 'search', { query: 'docs' }, 'Results...'),
        createAssistantMessage('Found docs', 'assistant_2'),

        // Intermediate user interaction
        createUserMessage('Intermediate question', 'user_2'),
        createAssistantMessage('Intermediate response', 'assistant_3'),

        // Recent interactions
        createUserMessage('Recent question', 'user_3'),
        createAssistantMessage('Recent response', 'assistant_4'),
      ];

      // First optimization - should call LLM
      await optimizeMessagesWithToolSummarization(
        toolMessages,
        'gpt-4',
        'test_user',
      );
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);

      // Reset mock but keep cache
      mockGenerateObject.mockClear();

      // Second optimization with same tool calls - should use cache
      await optimizeMessagesWithToolSummarization(
        toolMessages,
        'gpt-4',
        'test_user',
      );
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });
    it('should handle LLM summarization failures gracefully', async () => {
      mockGenerateObject.mockRejectedValueOnce(
        new Error('LLM service unavailable'),
      );

      const messages: UIMessage[] = [
        // Old messages with tool calls
        createUserMessage('Search for something', 'user_1'),
        createAssistantMessage('Searching...', 'assistant_1'),
        createToolMessage(
          'call_1',
          'search',
          { query: 'test' },
          'Found matches',
        ),
        createToolMessage(
          'call_2',
          'search',
          { query: 'test' },
          'Found results',
        ),
        createAssistantMessage('Here are results', 'assistant_2'),

        // Intermediate interaction
        createUserMessage('Intermediate', 'user_2'),
        createAssistantMessage('Intermediate response', 'assistant_3'),

        // Recent interactions
        createUserMessage('Recent question', 'user_3'),
        createAssistantMessage('Recent answer', 'assistant_4'),
        ...createRecentMessageBuffer(false),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      ); // Should still return optimized messages with fallback summary
      expect(optimized.length).toBeGreaterThanOrEqual(messages.length - 1); // Allow for some optimization
      // Should find fallback summary message or summary message
      const summaryMessage = optimized.find((m) => {
        const text = messageText(m);
        return typeof text === 'string' && text.includes(summary_input);
      });
      expect(summaryMessage).toBeDefined();
    });
    it('should preserve tool calls from recent interactions', async () => {
      const messages = createStandardUsecase();
      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );
      // Should have unoptimized response in 4th to last message
      expect(optimized[optimized.length - 4].parts.length).toEqual(
        messages[optimized.length - 4].parts.length,
      );
      expect(
        (optimized[optimized.length - 4].parts[1] as Record<string, unknown>)
          .output,
      ).toEqual(
        (messages[optimized.length - 4].parts[1] as Record<string, unknown>)
          .output,
      );
      // Should have unoptimized request in 6th to last message -> all messages are present
      expect(optimized[optimized.length - 6].parts.length).toEqual(
        messages[optimized.length - 6].parts.length,
      );
      // Streaming request is unoptimized for match
      expect(
        (optimized[optimized.length - 6].parts[1] as Record<string, unknown>)
          .input,
      ).toEqual(
        (messages[optimized.length - 6].parts[1] as Record<string, unknown>)
          .input,
      );

      expect(
        (optimized[optimized.length - 6].parts[1] as Record<string, unknown>)
          .output,
      ).toEqual(
        (messages[optimized.length - 6].parts[2] as Record<string, unknown>)
          .output,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message array', async () => {
      const optimized = await optimizeMessagesWithToolSummarization(
        [],
        'gpt-4',
        'test_user',
      );
      expect(optimized).toEqual([]);
    });

    it('should handle messages without tool invocations', async () => {
      const messages: UIMessage[] = [
        {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
          id: '1',
        },
        {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hi' }],
          id: '2',
        },
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );
      expect(optimized).toEqual(messages);
    });

    it('should handle tool calls without proper IDs', async () => {
      const messages: UIMessage[] = [
        createUserMessage('1', 'Test'),
        createAssistantMessage('2', 'Processing'),
        createToolMessage(
          undefined as unknown as string,
          'semantic_search',
          { query: 'search-term', toolName: 'search' },
          '1000 search results found',
        ),
        createUserMessage('3', 'You sure are a helpful assistant'),
        createAssistantMessage('4', 'Thank you!'),
        ...createRecentMessageBuffer(false),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );

      // Should handle gracefully without errors
      expect(optimized).toBeDefined();
      expect(optimized.length).toBe(messages.length);

      // Should have unoptimized request in 6th to last message -> all messages are present
      expect(optimized[2].parts.length).toEqual(messages[2].parts.length);
      // Streaming request is unoptimized for match
      expect((optimized[2].parts[1] as Record<string, unknown>).input).toEqual(
        (messages[2].parts[1] as Record<string, unknown>).input,
      );
      expect((optimized[2].parts[2] as Record<string, unknown>).input).toEqual(
        (messages[2].parts[2] as Record<string, unknown>).input,
      );
      expect((optimized[2].parts[3] as Record<string, unknown>).input).toEqual(
        (messages[2].parts[3] as Record<string, unknown>).input,
      );
      // Unoptimized output
      expect((optimized[2].parts[1] as Record<string, unknown>).output).toEqual(
        (messages[2].parts[1] as Record<string, unknown>).output,
      );
      expect((optimized[2].parts[2] as Record<string, unknown>).output).toEqual(
        (messages[2].parts[2] as Record<string, unknown>).output,
      );
      expect((optimized[2].parts[3] as Record<string, unknown>).output).toEqual(
        (messages[2].parts[3] as Record<string, unknown>).output,
      );
    });
  });

  describe('Performance and Metrics', () => {
    it('should log optimization metrics', async () => {
      const largeMessages: UIMessage[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          role: 'user' as const,
          parts: [
            {
              type: 'text' as const,
              text: `User message ${i} with lots of content that makes the message quite large and contributes to token usage`,
            },
          ],
          id: `user_${i}`,
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          role: 'assistant' as const,
          parts: [
            {
              type: 'text' as const,
              text: `Assistant response ${i} with detailed explanation and comprehensive information`,
            },
          ],
          id: `assistant_${i}`,
        })),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        largeMessages,
        'gpt-4',
        'test_user',
      );

      // Should maintain conversation integrity
      expect(optimized.length).toBe(largeMessages.length);
    });
  });
});
