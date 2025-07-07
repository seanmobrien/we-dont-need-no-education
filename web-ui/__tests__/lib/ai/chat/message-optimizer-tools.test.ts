import { UIMessage } from 'ai';
import {
  optimizeMessagesWithToolSummarization,
  cacheManager,
  extractToolCallIds,
  hasToolCalls,
} from '@/lib/ai/chat/message-optimizer-tools';
import { aiModelFactory } from '@/lib/ai';
import { generateText } from 'ai';

// Mock dependencies
jest.mock('@/lib/ai');
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
          content: 'I will help you',
          parts: [{ type: 'text', text: 'I will help you' }],
          toolInvocations: [
            {
              state: 'call',
              toolCallId: 'call_1',
              toolName: 'search',
              args: {},
            },
            {
              state: 'call',
              toolCallId: 'call_2',
              toolName: 'analyze',
              args: {},
            },
          ],
          id: 'msg_1',
          createdAt: new Date(),
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual(['call_1', 'call_2']);
      });

      it('should return empty array for non-assistant messages', () => {
        const message: UIMessage = {
          role: 'user',
          content: 'Hello',
          parts: [{ type: 'text', text: 'Hello' }],
          id: 'msg_1',
          createdAt: new Date(),
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual([]);
      });

      it('should handle messages without tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          content: 'Hello back',
          parts: [{ type: 'text', text: 'Hello back' }],
          id: 'msg_1',
          createdAt: new Date(),
        };

        const ids = extractToolCallIds(message);
        expect(ids).toEqual([]);
      });
    });

    describe('hasToolCalls', () => {
      it('should return true for assistant messages with tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          content: 'Processing...',
          parts: [{ type: 'text', text: 'Processing...' }],
          toolInvocations: [
            {
              state: 'call',
              toolCallId: 'call_1',
              toolName: 'search',
              args: {},
            },
          ],
          id: 'msg_1',
          createdAt: new Date(),
        };

        expect(hasToolCalls(message)).toBe(true);
      });

      it('should return false for user messages', () => {
        const message: UIMessage = {
          role: 'user',
          content: 'Hello',
          parts: [{ type: 'text', text: 'Hello' }],
          id: 'msg_1',
          createdAt: new Date(),
        };

        expect(hasToolCalls(message)).toBe(false);
      });

      it('should return false for assistant messages without tool invocations', () => {
        const message: UIMessage = {
          role: 'assistant',
          content: 'Hello back',
          parts: [{ type: 'text', text: 'Hello back' }],
          id: 'msg_1',
          createdAt: new Date(),
        };

        expect(hasToolCalls(message)).toBe(false);
      });
    });
  });

  describe('Message Optimization', () => {
    const createUserMessage = (content: string, id: string): UIMessage => ({
      role: 'user',
      content,
      parts: [{ type: 'text', text: content }],
      id,
      createdAt: new Date(),
    });

    const createAssistantMessage = (
      content: string,
      id: string,
    ): UIMessage => ({
      role: 'assistant',
      content,
      parts: [{ type: 'text', text: content }],
      id,
      createdAt: new Date(),
    });
    const createToolMessage = (
      toolCallId: string,
      toolName: string,
      args: Record<string, unknown>,
      result?: unknown,
      id?: string,
    ): UIMessage => {
      const baseMessage = {
        role: 'assistant' as const,
        content: 'Processing...',
        parts: [{ type: 'text' as const, text: 'Processing...' }],
        id: id || `tool_msg_${toolCallId}`,
        createdAt: new Date(),
      };

      if (result !== undefined) {
        // Tool result message
        return {
          ...baseMessage,
          toolInvocations: [
            {
              state: 'result' as const,
              toolCallId,
              toolName,
              args,
              result,
            } as never, // Type assertion for testing
          ],
        };
      } else {
        // Tool call message
        return {
          ...baseMessage,
          toolInvocations: [
            {
              state: 'call' as const,
              toolCallId,
              toolName,
              args,
            } as never, // Type assertion for testing
          ],
        };
      }
    };

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
      expect(mockGenerateText).not.toHaveBeenCalled();
    });
    it('should optimize old tool calls while preserving recent interactions', async () => {
      const messages: UIMessage[] = [
        // Old interaction with completed tool call (will be summarized)
        createUserMessage('Search for documentation', 'user_1'),
        createAssistantMessage(
          'I will search for documentation',
          'assistant_1',
        ),
        createToolMessage('call_1', 'semantic_search', { query: 'docs' }),
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

        // Recent interactions (should be preserved - last 2 user interactions)
        createUserMessage('What about examples?', 'user_3'),
        createAssistantMessage('Let me search for examples', 'assistant_4'),
        createUserMessage('Thanks!', 'user_4'),
        createAssistantMessage('You are welcome!', 'assistant_5'),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      ); // Should have created summary messages (tool calls get summarized but messages count may stay same or increase)
      expect(optimized.length).toBeGreaterThanOrEqual(messages.length - 2); // Allow for some optimization

      // Recent interactions should be preserved (last 2 user prompts + responses)
      const recentMessages = optimized.slice(-4);
      expect(recentMessages.map((m) => m.content)).toEqual([
        'What about examples?',
        'Let me search for examples',
        'Thanks!',
        'You are welcome!',
      ]);

      // Should have called LLM for summarization
      expect(mockGenerateText).toHaveBeenCalled();
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
      expect(mockGenerateText).toHaveBeenCalledTimes(1);

      // Reset mock but keep cache
      mockGenerateText.mockClear();

      // Second optimization with same tool calls - should use cache
      await optimizeMessagesWithToolSummarization(
        toolMessages,
        'gpt-4',
        'test_user',
      );
      expect(mockGenerateText).not.toHaveBeenCalled();
    });
    it('should handle LLM summarization failures gracefully', async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error('LLM service unavailable'),
      );

      const messages: UIMessage[] = [
        // Old messages with tool calls
        createUserMessage('Search for something', 'user_1'),
        createAssistantMessage('Searching...', 'assistant_1'),
        createToolMessage('call_1', 'search', { query: 'test' }),
        createToolMessage(
          'call_1',
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
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      ); // Should still return optimized messages with fallback summary
      expect(optimized.length).toBeGreaterThanOrEqual(messages.length - 1); // Allow for some optimization
      // Should find fallback summary message or summary message
      const summaryMessage = optimized.find(
        (m) =>
          typeof m.content === 'string' &&
          (m.content.includes('[TOOL CALL COMPLETED]') ||
            m.content.includes('TOOL SUMMARY') ||
            m.id?.includes('tool-summary')),
      );
      expect(summaryMessage).toBeDefined();
    });
    it('should preserve tool calls from recent interactions', async () => {
      const messages: UIMessage[] = [
        // Old tool call (should be summarized)
        createUserMessage('Old search', 'user_1'),
        createAssistantMessage('Searching old...', 'assistant_1'),
        createToolMessage('old_call', 'search', { query: 'old' }),
        createToolMessage(
          'old_call',
          'search',
          { query: 'old' },
          'Old results',
        ),
        createAssistantMessage('Old response', 'assistant_2'),

        // Intermediate interaction
        createUserMessage('Intermediate', 'user_2'),
        createAssistantMessage('Intermediate response', 'assistant_3'),

        // Recent tool call (should be preserved - within last 2 user interactions)
        createUserMessage('Recent search', 'user_3'),
        createToolMessage('recent_call', 'search', { query: 'recent' }),
        createToolMessage(
          'recent_call',
          'search',
          { query: 'recent' },
          'Recent results',
        ),
        createAssistantMessage('Recent response', 'assistant_4'),

        createUserMessage('Follow up', 'user_4'),
        createAssistantMessage('Follow up response', 'assistant_5'),
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );

      // Recent tool calls should be preserved (within last 2 user interactions)
      const recentToolCalls = optimized.filter(
        (m) => hasToolCalls(m) && extractToolCallIds(m).includes('recent_call'),
      );
      expect(recentToolCalls.length).toBeGreaterThan(0); // Should be preserved      // Old tool calls should be replaced with summary or have results marked as summarized
      const oldToolCalls = optimized.filter(
        (m) =>
          hasToolCalls(m) &&
          m.toolInvocations?.some(
            (inv) =>
              inv.toolCallId === 'old_call' &&
              inv.state === 'result' &&
              !(
                'result' in inv &&
                typeof inv.result === 'string' &&
                inv.result.includes('[SUMMARIZED')
              ),
          ),
      );
      expect(oldToolCalls).toHaveLength(0); // Should be summarized/marked
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
          content: 'Hello',
          parts: [{ type: 'text', text: 'Hello' }],
          id: '1',
          createdAt: new Date(),
        },
        {
          role: 'assistant',
          content: 'Hi',
          parts: [{ type: 'text', text: 'Hi' }],
          id: '2',
          createdAt: new Date(),
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
        {
          role: 'user',
          content: 'Test',
          parts: [{ type: 'text', text: 'Test' }],
          id: '1',
          createdAt: new Date(),
        },
        {
          role: 'assistant',
          content: 'Processing',
          parts: [{ type: 'text', text: 'Processing' }],
          toolInvocations: [
            {
              state: 'call',
              toolName: 'search',
              args: {},
            } as never, // Missing toolCallId
          ],
          id: '2',
          createdAt: new Date(),
        },
      ];

      const optimized = await optimizeMessagesWithToolSummarization(
        messages,
        'gpt-4',
        'test_user',
      );

      // Should handle gracefully without errors
      expect(optimized).toBeDefined();
      expect(optimized.length).toBe(messages.length);
    });
  });

  describe('Performance and Metrics', () => {
    it('should log optimization metrics', async () => {
      const largeMessages: UIMessage[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          role: 'user' as const,
          content: `User message ${i} with lots of content that makes the message quite large and contributes to token usage`,
          parts: [
            {
              type: 'text' as const,
              text: `User message ${i} with lots of content that makes the message quite large and contributes to token usage`,
            },
          ],
          id: `user_${i}`,
          createdAt: new Date(),
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          role: 'assistant' as const,
          content: `Assistant response ${i} with detailed explanation and comprehensive information`,
          parts: [
            {
              type: 'text' as const,
              text: `Assistant response ${i} with detailed explanation and comprehensive information`,
            },
          ],
          id: `assistant_${i}`,
          createdAt: new Date(),
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
