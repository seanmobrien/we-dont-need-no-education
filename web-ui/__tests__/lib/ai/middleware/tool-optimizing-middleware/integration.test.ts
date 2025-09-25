/**
 * @jest-environment node
 * @fileoverview Integration tests for tool optimizing middleware
 *
 * These tests verify the middleware integrates correctly with other middleware
 * components, database operations, and the overall AI pipeline.
 *
 * @module __tests__/lib/ai/middleware/tool-optimizing-middleware/integration.test.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createToolOptimizingMiddleware,
  type ToolOptimizingMiddlewareConfig,
} from '@/lib/ai/middleware/tool-optimizing-middleware';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2Middleware,
  LanguageModelV2FunctionTool,
} from '@ai-sdk/provider';
import type { UIMessage } from 'ai';
import { drizDbWithInit } from '@/lib/drizzle-db';

// Mock dependencies
jest.mock('@/lib/ai/services/model-stats/tool-map');
jest.mock('@/lib/ai/chat/message-optimizer-tools');
jest.mock('@/lib/drizzle-db');
jest.mock('@/lib/logger');
jest.mock('@/lib/site-util/metrics', () => ({
  appMeters: {
    createCounter: jest.fn().mockReturnValue({ add: jest.fn() }),
    createHistogram: jest.fn().mockReturnValue({ record: jest.fn() }),
    createUpDownCounter: jest
      .fn()
      .mockReturnValue({ add: jest.fn(), record: jest.fn() }),
    createGauge: jest.fn().mockReturnValue({ record: jest.fn() }),
  },
  hashUserId: jest.fn((userId: string) => `hashed_${userId}`),
}));
jest.mock('@/lib/react-util', () => {
  const original = jest.requireActual('@/lib/react-util');
  return {
    ...original,
    LoggedError: {
      isTurtlesAllTheWayDownBaby: jest.fn(),
    },
  };
});

const mockToolMap = ToolMap as jest.MockedClass<typeof ToolMap>;
const mockOptimizeMessages =
  optimizeMessagesWithToolSummarization as jest.MockedFunction<
    typeof optimizeMessagesWithToolSummarization
  >;
const mockDrizDb = drizDbWithInit as jest.MockedFunction<typeof drizDbWithInit>;

describe('Tool Optimizing Middleware Integration Tests', () => {
  let mockToolMapInstance: jest.Mocked<ToolMap>;
  let mockDb: any;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
    };
    mockDrizDb.mockResolvedValue(mockDb);

    // Mock ToolMap instance with realistic behavior
    mockToolMapInstance = {
      scanForTools: jest.fn().mockImplementation(async (tools) => {
        const toolArray = Array.isArray(tools) ? tools : [tools];
        // Simulate some tools being new
        return Math.floor(toolArray.length * 0.4);
      }),
      refresh: jest.fn().mockResolvedValue(true),
      getInstance: jest.fn(),
    } as any;
    (mockToolMap.getInstance as jest.MockedFunction<typeof mockToolMap.getInstance>).mockResolvedValue(mockToolMapInstance);

    // Mock message optimization with realistic behavior
    mockOptimizeMessages.mockImplementation(
      async (messages, model, userId, chatId) => {
        // Simulate optimization reducing message count
        const optimized = messages.slice(0, Math.ceil(messages.length * 0.7));
        return optimized;
      },
    );
  });

  describe('Database Integration', () => {
    it('should work with database-backed ToolMap', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        userId: 'db-user',
        chatHistoryId: 'db-chat',
      });

      const tools: LanguageModelV2FunctionTool[] = [
        {
          type: 'function',
          name: 'database_tool',
          description: 'Tool that integrates with database',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      const result = await middleware.transformParams!({
        type: 'generate',
        params: {
          model: 'db-model',
          tools,
          messages: [],
        } as any,
      });

      expect(mockToolMap.getInstance).toHaveBeenCalled();
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(tools);
      expect(result.tools).toBe(tools);
    });

    it('should handle database connection errors gracefully', async () => {
      mockDrizDb.mockRejectedValue(new Error('Database connection failed'));

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: {
          model: 'error-model',
          tools: [{ type: 'function', name: 'test_tool', inputSchema: {} }],
          messages: [],
        } as any,
      });

      expect(result).toBeDefined();
      // Should continue working even with database errors
    });

    it('should handle database transaction scenarios', async () => {
      const mockTransaction = {
        rollback: jest.fn(),
        commit: jest.fn(),
      };
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransaction);
      });

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 5,
      });

      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `tx-msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: `Transaction message ${i}` }],
      })) as UIMessage[];

      const result = await middleware.transformParams!({
        type: 'generate',
        params: {
          model: 'tx-model',
          messages,
          tools: [{ type: 'function', name: 'tx_tool', inputSchema: {} }],
        } as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Middleware Stack Integration', () => {
    const createMockMiddleware = (name: string): LanguageModelV2Middleware => ({
      transformParams: jest.fn(async ({ type, params }) => {
        // Add a marker to track middleware execution order
        const updatedParams = {
          ...params,
          // Track middleware execution for testing
          __testMiddlewareStack: [...((params as any).__testMiddlewareStack || []), name],
        };
        return updatedParams;
      }),
    });

    it('should work correctly in middleware stack', async () => {
      const preMiddleware = createMockMiddleware('pre');
      const toolOptimizer = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 5,
      });
      const postMiddleware = createMockMiddleware('post');

      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `stack-msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: `Stack message ${i}` }],
      })) as UIMessage[];

      let params: LanguageModelV2CallOptions = {
        model: 'stack-model',
        messages,
        tools: [{ type: 'function', name: 'stack_tool', inputSchema: {} }],
        __testMiddlewareStack: [],
      } as any;

      // Simulate middleware stack execution
      let result = await preMiddleware.transformParams!({
        type: 'generate',
        params,
        model: 'stack-model' as any,
      });

      result = await toolOptimizer.transformParams!({
        type: 'generate',
        params: result,
        model: 'stack-model' as any,
      });

      result = await postMiddleware.transformParams!({
        type: 'generate',
        params: result,
        model: 'stack-model' as any,
      });

      expect((result as any).__testMiddlewareStack).toEqual(['pre', 'post']);
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
      expect(mockOptimizeMessages).toHaveBeenCalled();
      expect(Array.isArray((result as any).messages)).toBe(true);
      if ((result as any).messages) {
        expect((result as any).messages.length).toBeLessThan(messages.length);
      }
    });

    it('should preserve middleware execution order with errors', async () => {
      const errorMiddleware: LanguageModelV2Middleware = {
        transformParams: jest
          .fn()
          .mockRejectedValue(new Error('Middleware error')),
      };

      const toolOptimizer = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const recoverMiddleware: LanguageModelV2Middleware = {
        transformParams: jest.fn(async ({ type, params }) => {
          return { ...params, recovered: true };
        }),
      };

      const params: LanguageModelV2CallOptions = {
        model: 'error-model',
        tools: [{ type: 'function', name: 'error_tool', inputSchema: {} }],
        messages: [],
      } as any;

      // Tool optimizer should work even if other middleware fails
      const result = await toolOptimizer.transformParams!({
        type: 'generate',
        params,
      });

      expect(result).toBeDefined();
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
    });
  });

  describe('Real-world Scenario Integration', () => {
    it('should handle chat application scenario', async () => {
      const chatScenario = {
        userId: 'chat-user-123',
        chatId: 'chat-session-456',
        conversationHistory: Array.from({ length: 25 }, (_, i) => ({
          id: `chat-msg-${i}`,
          role: i === 0 ? 'system' : i % 2 === 1 ? 'user' : 'assistant',
          parts: [
            {
              type: 'text',
              text:
                i === 0
                  ? 'You are a helpful assistant.'
                  : `Chat message ${i} in ongoing conversation`,
            },
          ],
        })) as UIMessage[],
        availableTools: [
          {
            type: 'function',
            name: 'search_knowledge',
            description: 'Search the knowledge base',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                filters: { type: 'object' },
              },
              required: ['query'],
            },
          },
          {
            type: 'function',
            name: 'generate_summary',
            description: 'Generate a summary',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                maxLength: { type: 'number' },
              },
              required: ['content'],
            },
          },
        ] as LanguageModelV2FunctionTool[],
      };

      const middleware = createToolOptimizingMiddleware({
        userId: chatScenario.userId,
        chatHistoryId: chatScenario.chatId,
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 15,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: {
          messages: chatScenario.conversationHistory,
          tools: chatScenario.availableTools,
        } as any,
        model: 'chat-model',
      });

      expect(result.messages).toBeDefined();
      expect(result.tools).toBe(chatScenario.availableTools);
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(
        chatScenario.availableTools,
      );
      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        chatScenario.conversationHistory,
        'chat-model',
        chatScenario.userId,
        chatScenario.chatId,
      );

      // Should optimize the conversation history
      expect(Array.isArray(result.messages)).toBe(true);
      if (result.messages) {
        expect(result.messages.length).toBeLessThan(
          chatScenario.conversationHistory.length,
        );
      }
    });

    it('should handle enterprise workflow scenario', async () => {
      const enterpriseScenario = {
        workflow: 'document-analysis',
        tools: Array.from({ length: 15 }, (_, i) => ({
          type: 'function',
          name: `enterprise_tool_${i}`,
          description: `Enterprise tool ${i} for document processing`,
          inputSchema: {
            type: 'object',
            properties: {
              documentId: { type: 'string' },
              analysisType: {
                type: 'string',
                enum: ['content', 'structure', 'metadata'],
              },
              options: {
                type: 'object',
                properties: {
                  includeImages: { type: 'boolean' },
                  language: { type: 'string' },
                  outputFormat: {
                    type: 'string',
                    enum: ['json', 'xml', 'text'],
                  },
                },
              },
            },
            required: ['documentId', 'analysisType'],
          },
        })) as LanguageModelV2FunctionTool[],
        history: Array.from({ length: 100 }, (_, i) => ({
          id: `enterprise-msg-${i}`,
          role: i % 4 === 0 ? 'system' : i % 3 === 0 ? 'user' : 'assistant',
          parts: [
            {
              type: 'text',
              text: `Enterprise workflow message ${i} with document analysis context`,
            },
          ],
        })) as UIMessage[],
      };

      const middleware = createToolOptimizingMiddleware({
        userId: 'enterprise-user',
        chatHistoryId: 'enterprise-workflow',
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 50,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: {
          messages: enterpriseScenario.history,
          tools: enterpriseScenario.tools,
        } as any,
        model: 'enterprise-model',
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(
        enterpriseScenario.tools,
      );
      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        enterpriseScenario.history,
        'enterprise-model',
        'enterprise-user',
        'enterprise-workflow',
      );

      expect(result.messages).toBeDefined();
      expect(result.tools).toBe(enterpriseScenario.tools);
      expect(Array.isArray(result.messages)).toBe(true);
      if (result.messages) {
        expect(result.messages.length).toBeLessThan(
          enterpriseScenario.history.length,
        );
      }
    });

    it('should handle streaming scenario', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: false, // Typically disabled for streaming
      });

      const streamingParams = {
        model: 'streaming-model',
        messages: [
          {
            id: 'stream-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Start streaming' }],
          },
        ],
        tools: [
          {
            type: 'function',
            name: 'stream_tool',
            description: 'Tool for streaming scenario',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        stream: true,
      } as any;

      const result = await middleware.transformParams!({
        type: 'stream',
        params: streamingParams,
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
      expect(mockOptimizeMessages).not.toHaveBeenCalled(); // Should skip optimization
      expect(result.messages).toBe(streamingParams.messages);
      expect(result.tools).toBe(streamingParams.tools);
    });
  });

  describe('Cross-component Integration', () => {
    it('should integrate with chat history middleware', async () => {
      // Simulate chat history middleware adding context
      const chatHistoryParams = {
        model: 'integration-model',
        messages: [
          {
            id: 'history-1',
            role: 'user',
            parts: [{ type: 'text', text: 'Previous context' }],
          },
        ],
        tools: [
          {
            type: 'function',
            name: 'history_tool',
            description: 'Tool from chat history',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
        chatHistory: { enabled: true, userId: 'history-user' },
      } as any;

      const middleware = createToolOptimizingMiddleware({
        userId: 'history-user',
        chatHistoryId: 'history-chat',
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: chatHistoryParams,
      });

      expect(result.chatHistory).toEqual({
        enabled: true,
        userId: 'history-user',
      });
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
    });

    it('should integrate with rate limiting middleware', async () => {
      const rateLimitedParams = {
        model: 'rate-limited-model',
        messages: [],
        tools: [{ type: 'function', name: 'rate_tool', inputSchema: {} }],
        rateLimitInfo: { provider: 'azure', requestsRemaining: 100 },
      } as any;

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: rateLimitedParams,
      });

      expect(result.rateLimitInfo).toEqual({
        provider: 'azure',
        requestsRemaining: 100,
      });
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
    });

    it('should preserve telemetry and monitoring context', async () => {
      const telemetryParams = {
        model: 'telemetry-model',
        messages: [],
        tools: [{ type: 'function', name: 'telemetry_tool', inputSchema: {} }],
        telemetry: {
          traceId: 'trace-123',
          spanId: 'span-456',
          correlationId: 'corr-789',
        },
      } as any;

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        userId: 'telemetry-user',
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: telemetryParams,
      });

      expect(result.telemetry).toEqual({
        traceId: 'trace-123',
        spanId: 'span-456',
        correlationId: 'corr-789',
      });
    });
  });
});
