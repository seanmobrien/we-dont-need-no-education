/**
 * @jest-environment node
 * @fileoverview Comprehensive unit tests for tool optimizing middleware
 *
 * These tests verify tool scanning, message optimization, error handling,
 * metrics collection, and middleware integration functionality.
 *
 * @module __tests__/lib/ai/middleware/tool-optimizing-middleware/index.test.ts
 */



import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import {
  createToolOptimizingMiddleware,
  type ToolOptimizingMiddlewareConfig,
  getToolOptimizingMiddlewareMetrics,
  ExtendedCallOptions,
} from '@/lib/ai/middleware/tool-optimizing-middleware';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2Middleware,
  LanguageModelV2FunctionTool,
  LanguageModelV2ProviderDefinedTool,
} from '@ai-sdk/provider';
import type { UIMessage } from 'ai';
import { LoggedError } from '@compliance-theater/logger';

// Mock dependencies
jest.mock('@/lib/react-util/errors/logged-error', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('@/lib/ai/services/model-stats/tool-map');
jest.mock('@/lib/ai/chat/message-optimizer-tools');
jest.mock('@compliance-theater/logger');
jest.mock('@/lib/site-util/metrics', () => ({
  appMeters: {
    createCounter: jest.fn().mockReturnValue({
      add: jest.fn(),
    }),
    createHistogram: jest.fn().mockReturnValue({
      record: jest.fn(),
    }),
    createUpDownCounter: jest.fn().mockReturnValue({
      add: jest.fn(),
      record: jest.fn(),
    }),
    createGauge: jest.fn().mockReturnValue({
      record: jest.fn(),
    }),
  },
  hashUserId: jest.fn((userId: string) => `hashed_${userId}`),
}));

type MiddlewareType = 'generateText' | 'generate' | 'stream' | 'streamText';

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

const mockToolMap = ToolMap as jest.MockedClass<typeof ToolMap>;
const mockOptimizeMessages =
  optimizeMessagesWithToolSummarization as jest.MockedFunction<
    typeof optimizeMessagesWithToolSummarization
  >;

describe('Tool Optimizing Middleware', () => {
  let mockToolMapInstance: jest.Mocked<ToolMap>;
  let mockParams: LanguageModelV2CallOptions;
  let sampleMessages: UIMessage[];
  let sampleTools: LanguageModelV2FunctionTool[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ToolMap instance
    mockToolMapInstance = {
      scanForTools: jest.fn().mockResolvedValue(2),
      getInstance: jest.fn(),
    } as any;
    (ToolMap.getInstance as jest.Mock).mockResolvedValue(mockToolMapInstance);

    // Mock optimizeMessages function
    mockOptimizeMessages.mockImplementation(async (messages) => {
      // Return half the messages to simulate optimization
      return messages.slice(0, Math.ceil(messages.length / 2));
    });

    // Sample test data
    sampleMessages = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      parts: [{ type: 'text', text: `Message ${i}` }],
    })) as UIMessage[];

    sampleTools = [
      {
        type: 'function',
        name: 'test_tool_1',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'test_tool_2',
        description: 'Another test tool',
        inputSchema: { type: 'object', properties: {} },
      },
    ];

    mockParams = {
      inputFormat: 'prompt' as const,
      mode: { type: 'regular' as const },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello world' }],
        },
        ...sampleMessages,
      ],
      model: { modelId: 'gpt-4.1', provider: 'azure' },
      tools: sampleTools,
    } as any;
  });

  describe('Middleware Creation', () => {
    it('should create middleware with default configuration', () => {
      const middleware = createToolOptimizingMiddleware();
      expect(middleware).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
    });

    it('should create middleware with custom configuration', () => {
      const config: ToolOptimizingMiddlewareConfig = {
        userId: 'user-123',
        chatHistoryId: 'chat-456',
        enableMessageOptimization: false,
        optimizationThreshold: 20,
        enableToolScanning: false,
      };

      const middleware = createToolOptimizingMiddleware(config);
      expect(middleware).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
    });
  });

  describe('Tool Scanning Functionality', () => {
    it('should scan tools when tool scanning is enabled', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockToolMap.getInstance).toHaveBeenCalled();
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(
        sampleTools,
      );
      expect(result.tools).toBe(sampleTools);
    });

    it('should skip tool scanning when disabled', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: false,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockToolMapInstance.scanForTools).not.toHaveBeenCalled();
      expect(result.tools).toBe(sampleTools);
    });

    it('should handle tool scanning errors gracefully', async () => {
      mockToolMapInstance.scanForTools.mockRejectedValue(
        new Error('Database error'),
      );

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      // expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should scan single tool correctly', async () => {
      const singleTool = sampleTools[0];
      const paramsWithSingleTool = { ...mockParams, tools: [singleTool] };

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      await middleware.transformParams!({
        type: 'generate',
        params: paramsWithSingleTool,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith([
        singleTool,
      ]);
    });

    it('should handle provider-defined tools', async () => {
      const providerTool: LanguageModelV2ProviderDefinedTool = {
        type: 'provider-defined',
        id: 'azure.provider-tool-1',
        name: 'provider_tool',
        args: { type: 'object' },
      };

      const paramsWithProviderTool = { ...mockParams, tools: [providerTool] };
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      await middleware.transformParams!({
        type: 'generate',
        params: paramsWithProviderTool,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith([
        providerTool,
      ]);
    });
  });

  describe('Message Optimization Functionality', () => {
    it('should optimize messages when conditions are met', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
        userId: 'user-123',
        chatHistoryId: 'chat-456',
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        mockParams.prompt,
        'gpt-4.1',
        'user-123',
        'chat-456',
      );
      expect(result.prompt).toHaveLength(8); // Half of 15 messages
    });

    it('should skip optimization when message count is below threshold', async () => {
      const shortMessages = sampleMessages.slice(0, 5);
      const paramsWithShortMessages = {
        ...mockParams,
        messages: shortMessages,
      };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: paramsWithShortMessages,
      });

      expect(mockOptimizeMessages).not.toHaveBeenCalled();
      expect(result.prompt).toBe(shortMessages);
    });

    it('should skip optimization when disabled', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: false,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockOptimizeMessages).not.toHaveBeenCalled();
      expect(result.prompt.length).toBe(16);
    });

    it('should handle message optimization errors gracefully', async () => {
      mockOptimizeMessages.mockRejectedValue(new Error('Optimization failed'));

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalled();
      expect(result.prompt.length).toBe(sampleMessages.length + 1); // Falls back to original
    });

    it('should extract model ID from string model parameter', async () => {
      const paramsWithStringModel = { ...mockParams, model: 'string-model-id' };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
        userId: 'user-123',
      });

      await middleware.transformParams!({
        type: 'generate',
        params: paramsWithStringModel,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        sampleMessages,
        'gpt-4.1',
        'user-123',
        undefined,
      );
    });

    it('should handle missing model gracefully', async () => {
      const paramsWithoutModel = { ...mockParams, model: undefined };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      await middleware.transformParams!({
        type: 'generate',
        params: paramsWithoutModel,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        sampleMessages,
        'gpt-4.1',
        undefined,
        undefined,
      );
    });
  });

  describe('Type-specific Behavior', () => {
    it('should only optimize for generateText operations', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      // Test with generateText - should optimize
      await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });
      expect(mockOptimizeMessages).toHaveBeenCalled();

      // jest.clearAllMocks();
      mockOptimizeMessages.mockClear();

      // Test with stream - should not optimize
      await middleware.transformParams!({
        type: 'stream',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });
      expect(mockOptimizeMessages).not.toHaveBeenCalled();
    });

    it('should handle different operation types', async () => {
      const middleware = createToolOptimizingMiddleware();
      const types = [
        'generateText',
        'streamText',
        'generateObject',
        'streamObject',
      ];

      for (const type of types) {
        const result = await middleware.transformParams!({
          type: type as any,
          params: mockParams,
          model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        });

        expect(result).toBeDefined();
      }
    });
  });

  describe('Combined Operations', () => {
    it('should perform both tool scanning and message optimization', async () => {
      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 10,
        userId: 'user-123',
        chatHistoryId: 'chat-456',
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        params: mockParams,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(
        sampleTools,
      );
      expect(mockOptimizeMessages).toHaveBeenCalledWith(
        sampleMessages,
        'gpt-4.1',
        'user-123',
        'chat-456',
      );
      expect(result.prompt).toHaveLength(8); // Optimized messages
      expect(result.tools).toBe(sampleTools);
    });

    it('should handle partial failures gracefully', async () => {
      mockToolMapInstance.scanForTools.mockRejectedValue(
        new Error('Tool scan failed'),
      );
      // Leave message optimization working

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: mockParams,
      });

      // Tool scanning failed but message optimization should still work
      expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          source: 'ToolOptimizingMiddleware.toolScanning',
        }),
      );
      expect(mockOptimizeMessages).toHaveBeenCalled();
      expect(result.prompt).toHaveLength(8); // Still optimized
    });
  });

  describe('Error Handling', () => {
    it('should handle complete middleware failure gracefully', async () => {
      // Mock ToolMap.getInstance to fail
      (mockToolMap.getInstance as jest.Mock).mockRejectedValue(
        new Error('Critical failure'),
      );

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
        enableMessageOptimization: true,
      });

      const p = {
        type: 'generate' as MiddlewareType,
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: mockParams,
      };
      Object.defineProperty(p, 'tools', {
        get() {
          throw new Error('Cannot access tools');
        },
      });
      const result = await middleware.transformParams!(p);

      expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          source: 'ToolOptimizingMiddleware.transformParams',
        }),
      );
      // Should return original parameters on complete failure
      expect(Object.is(result, p.params)).toBe(true);
    });

    it('should preserve parameter structure on errors', async () => {
      mockOptimizeMessages.mockRejectedValue(new Error('Optimization error'));

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        type: 'generate',
        params: mockParams,
      });

      expect(result).toEqual(mockParams);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle undefined configuration', () => {
      const middleware = createToolOptimizingMiddleware(undefined);
      expect(middleware).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
    });

    it('should handle empty configuration object', () => {
      const middleware = createToolOptimizingMiddleware({});
      expect(middleware).toBeDefined();
      expect(middleware.transformParams).toBeDefined();
    });

    it('should use default values for missing config properties', async () => {
      const middleware = createToolOptimizingMiddleware({
        userId: 'user-123',
        // Other properties use defaults
      });

      const result = await middleware.transformParams!({
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        type: 'generate',
        params: mockParams,
      });

      // Should use defaults: optimization enabled, threshold 10, scanning enabled
      expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
      expect(mockOptimizeMessages).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages array', async () => {
      const paramsWithEmptyMessages = { ...mockParams, prompt: [] };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: paramsWithEmptyMessages,
      });

      expect(mockOptimizeMessages).not.toHaveBeenCalled();
      expect(result.prompt).toEqual([]);
    });

    it('should handle undefined messages', async () => {
      const paramsWithoutMessages = { ...mockParams, prompt: undefined };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: paramsWithoutMessages as unknown as ExtendedCallOptions,
      });

      expect(mockOptimizeMessages).not.toHaveBeenCalled();
      expect(result.prompt).toBeUndefined();
    });

    it('should handle undefined tools', async () => {
      const paramsWithoutTools = { ...mockParams, tools: undefined };

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        type: 'generate',
        params: paramsWithoutTools,
      });

      expect(mockToolMapInstance.scanForTools).not.toHaveBeenCalled();
      expect(result.tools).toBeUndefined();
    });

    it('should handle empty tools array', async () => {
      const paramsWithEmptyTools = { ...mockParams, tools: [] };

      const middleware = createToolOptimizingMiddleware({
        enableToolScanning: true,
      });

      const result = await middleware.transformParams!({
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        type: 'generate',
        params: paramsWithEmptyTools,
      });

      expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith([]);
      expect(result.tools).toEqual([]);
    });

    it('should handle non-array messages', async () => {
      const paramsWithNonArrayMessages = {
        ...mockParams,
        prompt: 'not-an-array' as any,
      };

      const middleware = createToolOptimizingMiddleware({
        enableMessageOptimization: true,
        optimizationThreshold: 10,
      });

      const result = await middleware.transformParams!({
        type: 'generate',
        model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
        params: paramsWithNonArrayMessages,
      });

      expect(mockOptimizeMessages).not.toHaveBeenCalled();
      expect(result.prompt).toBe('not-an-array');
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics configuration', () => {
      const metrics = getToolOptimizingMiddlewareMetrics();

      expect(metrics).toEqual({
        counters: {
          tool_optimization_middleware_total:
            'ai_tool_optimization_middleware_total',
          tool_scanning_total: 'ai_tool_scanning_total',
          message_optimization_enabled_total:
            'ai_message_optimization_enabled_total',
        },
        histograms: {
          tool_optimization_middleware_duration_ms:
            'ai_tool_optimization_middleware_duration_ms',
          new_tools_found_count: 'ai_new_tools_found_count',
        },
      });
    });
  });
});

describe('Tool Optimizing Middleware Integration', () => {
  let middleware: LanguageModelV2Middleware;
  let mockParams: LanguageModelV2CallOptions;

  beforeEach(() => {
    // jest.clearAllMocks();

    middleware = createToolOptimizingMiddleware({
      userId: 'integration-user',
      chatHistoryId: 'integration-chat',
      enableToolScanning: true,
      enableMessageOptimization: true,
      optimizationThreshold: 5,
    });

    mockParams = {
      inputFormat: 'prompt' as const,
      mode: { type: 'regular' as const },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Integration test message' }],
        },
      ],
      model: 'integration-model',
      messages: Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: `Integration message ${i}` }],
      })) as UIMessage[],
      tools: [
        {
          type: 'function',
          name: 'integration_tool',
          description: 'Integration test tool',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    } as any;
  });

  it('should integrate with middleware pipeline correctly', async () => {
    const result = await middleware.transformParams!({
      type: 'generate',
      model: { modelId: 'gpt-4.1', provider: 'azure' } as any,

      params: mockParams,
    });

    expect(result).toBeDefined();
    expect(result).toBeDefined();
    expect(result.prompt).toBeDefined();
    expect(result.tools).toBeDefined();
  });

  it('should maintain parameter types through transformation', async () => {
    const result = await middleware.transformParams!({
      model: { modelId: 'gpt-4.1', provider: 'azure' } as any,
      type: 'generate',
      params: mockParams,
    });

    expect(Array.isArray(result.prompt)).toBe(true);
    expect(Array.isArray(result.tools)).toBe(true);
  });
});
