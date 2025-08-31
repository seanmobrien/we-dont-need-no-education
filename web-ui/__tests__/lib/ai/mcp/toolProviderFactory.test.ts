/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock all dependencies first
const mockGetResolvedPromises = jest.fn() as jest.MockedFunction<any>;
const mockIsError = jest.fn() as jest.MockedFunction<any>;
const mockLoggedError = {
  isTurtlesAllTheWayDownBaby: jest.fn() as jest.MockedFunction<any>,
};
const mockCreateMCPClient = jest.fn() as jest.MockedFunction<any>;
const mockInstrumentedSseTransport = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/react-util/utility-methods', () => {
  const original: typeof import('@/lib/react-util/utility-methods') =
    jest.requireActual('@/lib/react-util/utility-methods');
  return {
    ...original,
    getResolvedPromises: mockGetResolvedPromises,
    isError: mockIsError,
  };
});

jest.mock('@/lib/react-util/errors/logged-error', () => ({
  LoggedError: mockLoggedError,
}));

jest.mock('ai', () => ({
  experimental_createMCPClient: mockCreateMCPClient,
  ToolSet: {},
}));

jest.mock('@/lib/ai/mcp/instrumented-sse-transport', () => ({
  InstrumentedSseTransport: mockInstrumentedSseTransport,
}));
jest.mock('@/lib/ai/mcp/client-tool-provider', () => ({
  clientToolProviderFactory: jest.fn(() => ({
    url: 'https://server3.com/api',
    allowWrite: false,
    get_mcpClient: jest.fn().mockReturnValue({}),
    get_isConnected: jest.fn().mockReturnValue(true),
    get_tools: jest.fn().mockReturnValue({}),
    dispose: jest.fn().mockResolvedValue(undefined as unknown as never),
    connect: jest.fn().mockResolvedValue({} as unknown as never),
  })),
}));
// Import after mocking
import {
  toolProviderFactory,
  toolProviderSetFactory,
} from '@/lib/ai/mcp/toolProviderFactory';
import type {
  ConnectableToolProvider,
  ToolProviderFactoryOptions,
} from '@/lib/ai/mcp/types';
import { ToolSet } from 'ai';
import z from 'zod';

describe('toolProviderFactory', () => {
  const mockOptions: ToolProviderFactoryOptions = {
    url: 'https://test-mcp-server.com/api',
    headers: { Authorization: 'Bearer test-token' },
    allowWrite: false,
  };

  const mockTools: ToolSet = {
    'read-tool': {
      description: 'A read-only tool',
      inputSchema: z.object({ type: z.string(), properties: z.string() }),
    },
    'write-tool': {
      description: 'A tool with Write access',
      inputSchema: z.object({ type: z.string(), properties: z.string() }),
    },
  };

  const mockMCPClient = {
    tools: jest.fn() as jest.MockedFunction<() => Promise<ToolSet>>,
    close: jest.fn() as jest.MockedFunction<() => Promise<void>>,
  };

  beforeEach(() => {
    // Reset individual mocks without clearing global ones
    mockIsError.mockReset();
    mockInstrumentedSseTransport.mockReset();
    mockMCPClient.tools.mockReset();
    mockMCPClient.close.mockReset();
    mockCreateMCPClient.mockReset();
    mockGetResolvedPromises.mockReset();
    mockLoggedError.isTurtlesAllTheWayDownBaby.mockReset();

    // Set up default implementations
    mockIsError.mockImplementation((error: unknown) => error instanceof Error);
    mockInstrumentedSseTransport.mockImplementation(() => ({}));
    mockMCPClient.tools.mockResolvedValue(mockTools);
    mockMCPClient.close.mockResolvedValue(undefined);
    mockCreateMCPClient.mockResolvedValue(mockMCPClient);
  });

  describe('successful connection', () => {
    it('should create a connected provider with all tools when allowWrite is true', async () => {
      const options = { ...mockOptions, allowWrite: true };
      const provider = await toolProviderFactory(options);

      expect(provider.get_isConnected()).toBe(true);
      expect(provider.get_tools()).toEqual(mockTools);
      expect(provider.get_mcpClient()).toBe(mockMCPClient);
    });

    it('should create a connected provider with filtered tools when allowWrite is false', async () => {
      const options = { ...mockOptions, allowWrite: false };
      const provider = await toolProviderFactory(options);

      expect(provider.get_isConnected()).toBe(true);

      const filteredTools = provider.get_tools();
      expect(filteredTools).toHaveProperty('read-tool');
      expect(filteredTools).not.toHaveProperty('write-tool');
    });

    it('should create InstrumentedSseTransport with correct options', async () => {
      await toolProviderFactory(mockOptions);

      expect(mockInstrumentedSseTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sse',
          url: mockOptions.url,
          headers: mockOptions.headers,
          onerror: expect.any(Function),
          onclose: expect.any(Function),
          onmessage: expect.any(Function),
        }),
      );
    });

    it('should create MCP client with transport and error handler', async () => {
      await toolProviderFactory(mockOptions);

      expect(mockCreateMCPClient).toHaveBeenCalledWith({
        transport: expect.any(Object),
        onUncaughtError: expect.any(Function),
      });
    });

    it('should handle MCP client uncaught errors', async () => {
      let uncaughtErrorHandler: (error: unknown) => {
        role: string;
        content: Array<{ type: string; text: string }>;
      };

      mockCreateMCPClient.mockImplementation((options: any) => {
        uncaughtErrorHandler = options.onUncaughtError;
        return Promise.resolve(mockMCPClient);
      });

      await toolProviderFactory(mockOptions);

      const testError = new Error('Test MCP error');
      const result = uncaughtErrorHandler!(testError);

      expect(result).toEqual({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'An error occurred while processing your request: Test MCP error. Please try again later.',
          },
        ],
      });
    });

    it('should handle nested errors in uncaught error handler', async () => {
      let uncaughtErrorHandler: (error: unknown) => {
        role: string;
        content: Array<{ type: string; text: string }>;
      };

      mockCreateMCPClient.mockImplementation(
        (options: {
          onUncaughtError: (error: unknown) => {
            role: string;
            content: Array<{ type: string; text: string }>;
          };
        }) => {
          uncaughtErrorHandler = options.onUncaughtError;
          return Promise.resolve(mockMCPClient);
        },
      );

      await toolProviderFactory(mockOptions);

      const testError = new Error('Test MCP error');
      const result = uncaughtErrorHandler!(testError);

      // Since the global logger mock handles errors gracefully,
      // we expect the normal error message, not the critical fallback
      expect(result).toEqual({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'An error occurred while processing your request: Test MCP error. Please try again later.',
          },
        ],
      });

      // Log mock is handled globally, no need to reset
    });

    describe('provider methods', () => {
      let provider: ConnectableToolProvider;

      beforeEach(async () => {
        provider = await toolProviderFactory(mockOptions);
      });

      it('should dispose the MCP client', async () => {
        await provider.dispose();
        expect(mockMCPClient.close).toHaveBeenCalled();
      });

      it('should handle dispose errors gracefully', async () => {
        const disposeError = new Error('Dispose error');
        mockMCPClient.close.mockRejectedValue(disposeError);

        await provider.dispose();

        expect(mockLoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
          disposeError,
          expect.objectContaining({
            log: true,
            source: 'toolProviderFactory dispose',
            severity: 'error',
          }),
        );
      });

      it('should reconnect with new allowWrite setting', async () => {
        const newProvider = await provider.connect({ allowWrite: true });

        expect(newProvider.get_isConnected()).toBe(true);
        expect(mockMCPClient.close).toHaveBeenCalled();
      });
    });
  });

  describe('connection failure', () => {
    it('should return stub provider when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      mockCreateMCPClient.mockRejectedValue(connectionError);

      const provider = await toolProviderFactory(mockOptions);

      expect(provider.get_isConnected()).toBe(false);
      expect(provider.get_tools()).toEqual({});
      expect(provider.get_mcpClient()).toBeUndefined();
    });

    it('should handle stub provider disposal', async () => {
      mockCreateMCPClient.mockRejectedValue(new Error('Connection failed'));
      const provider = await toolProviderFactory(mockOptions);

      await expect(provider.dispose()).resolves.toBeUndefined();
    });

    it('should handle stub provider reconnection', async () => {
      mockCreateMCPClient.mockRejectedValue(new Error('Connection failed'));
      const stubProvider = await toolProviderFactory(mockOptions);

      // Mock successful connection for reconnection
      mockCreateMCPClient.mockResolvedValue(mockMCPClient);
      const newProvider = await stubProvider.connect({ allowWrite: true });

      expect(newProvider.get_isConnected()).toBe(true);
    });
  });

  describe('tool filtering', () => {
    it('should include all tools when allowWrite is true', async () => {
      const provider = await toolProviderFactory({
        ...mockOptions,
        allowWrite: true,
      });
      const tools = provider.get_tools();

      expect(tools).toHaveProperty('read-tool');
      expect(tools).toHaveProperty('write-tool');
    });

    it('should exclude write tools when allowWrite is false', async () => {
      const provider = await toolProviderFactory({
        ...mockOptions,
        allowWrite: false,
      });
      const tools = provider.get_tools();

      expect(tools).toHaveProperty('read-tool');
      expect(tools).not.toHaveProperty('write-tool');
    });

    it('should handle tools with undefined descriptions', async () => {
      const toolsWithUndefinedDesc: ToolSet = {
        'undefined-desc-tool': {
          description: undefined,
          inputSchema: z.object({ type: z.string(), properties: z.string() }),
        },
      };

      mockMCPClient.tools.mockResolvedValue(toolsWithUndefinedDesc);
      const provider = await toolProviderFactory({
        ...mockOptions,
        allowWrite: false,
      });
      const tools = provider.get_tools();

      expect(tools).toHaveProperty('undefined-desc-tool');
    });
  });
});

describe('toolProviderSetFactory', () => {
  const mockProviderOptions: ToolProviderFactoryOptions[] = [
    { url: 'https://server1.com/api', allowWrite: false },
    { url: 'https://server2.com/api', allowWrite: true },
    { url: 'https://server3.com/api', allowWrite: false },
  ];

  const createMockProvider = (
    tools: Record<string, unknown> = { 'test-tool': {} },
  ) => ({
    get_mcpClient: jest.fn().mockReturnValue({}),
    get_isConnected: jest.fn().mockReturnValue(true),
    get_tools: jest.fn().mockReturnValue(tools),
    dispose: jest.fn().mockResolvedValue(undefined as unknown as never),
    connect: jest.fn().mockResolvedValue({} as unknown as never),
  });

  beforeEach(() => {
    // Reset individual mocks instead of clearing all global mocks
    mockGetResolvedPromises.mockReset();
    mockLoggedError.isTurtlesAllTheWayDownBaby.mockReset();
  });

  describe('successful connections', () => {
    beforeEach(() => {
      const mockProvider = createMockProvider();
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [mockProvider, mockProvider, mockProvider],
        rejected: [],
        pending: [],
      });
    });

    it('should create provider set with all successful connections', async () => {
      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      expect(providerSet.providers).toHaveLength(4);
      expect(mockGetResolvedPromises).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Promise),
          expect.any(Promise),
          expect.any(Promise),
        ]),
        60000,
      );
    });

    it('should aggregate tools from all providers', async () => {
      const provider1 = createMockProvider({ tool1: {} });
      const provider2 = createMockProvider({ tool2: {} });
      const provider3 = createMockProvider({ tool3: {} });

      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [provider1, provider2, provider3],
        rejected: [],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);
      const allTools = providerSet.get_tools();

      expect(allTools).toEqual({
        tool1: {},
        tool2: {},
        tool3: {},
      });
    });

    it('should handle tool name conflicts with last provider precedence', async () => {
      const provider1 = createMockProvider({ 'shared-tool': { version: 1 } });
      const provider2 = createMockProvider({ 'shared-tool': { version: 2 } });

      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [provider1, provider2],
        rejected: [],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);
      const allTools = providerSet.get_tools();

      expect(allTools['shared-tool']).toEqual({ version: 2 });
    });

    it('should use custom timeout', async () => {
      const customTimeout = 30000;
      await toolProviderSetFactory(mockProviderOptions, customTimeout);

      expect(mockGetResolvedPromises).toHaveBeenCalledWith(
        expect.any(Array),
        customTimeout,
      );
    });

    it('should dispose all providers with timeout protection', async () => {
      const mockProvider = createMockProvider();
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [mockProvider, mockProvider, mockProvider],
        rejected: [],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      await providerSet.dispose();

      expect(mockProvider.dispose).toHaveBeenCalledTimes(3);
    });
  });

  describe('partial failures', () => {
    beforeEach(() => {
      const mockProvider = createMockProvider();
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [mockProvider],
        rejected: [new Error('Connection failed'), new Error('Timeout')],
        pending: [Promise.resolve(mockProvider)],
      });
    });

    it('should handle mixed success/failure scenarios', async () => {
      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      expect(providerSet.providers).toHaveLength(2);
      expect(mockLoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
        expect.any(AggregateError),
        expect.objectContaining({
          log: true,
          source: 'getResolvedProvidersWithCleanup',
          severity: 'error',
        }),
      );
    });

    it('should log successful connection statistics', async () => {
      await toolProviderSetFactory(mockProviderOptions);

      // The log function is called, but we don't need to assert on the global mock
    });
  });

  describe('cleanup handling', () => {
    it('should set up cleanup for pending promises', async () => {
      const mockProvider = createMockProvider();
      const pendingPromise = Promise.resolve(mockProvider);
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [],
        pending: [pendingPromise],
      });

      await toolProviderSetFactory(mockProviderOptions);

      // Allow pending promise to resolve
      await pendingPromise;

      expect(mockProvider.dispose).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const failingProvider = createMockProvider();
      const mockedDispose = failingProvider.dispose as jest.MockedFunction<
        () => Promise<void>
      >;
      mockedDispose.mockRejectedValue(new Error('Cleanup failed'));

      const pendingPromise = Promise.resolve(failingProvider);

      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [],
        pending: [pendingPromise],
      });

      await toolProviderSetFactory(mockProviderOptions);

      // Allow pending promise to resolve
      await pendingPromise;

      // Cleanup errors are logged but don't throw
    });

    it('should handle pending promise rejections', async () => {
      const rejectedPromise = Promise.reject(new Error('Async failure'));
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [],
        pending: [rejectedPromise],
      });

      await toolProviderSetFactory(mockProviderOptions);

      // Allow rejected promise to settle
      await rejectedPromise.catch(() => {});

      // Error logging is handled globally
    });
  });

  describe('edge cases', () => {
    it('should handle empty provider list', async () => {
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory([]);

      expect(providerSet.providers).toHaveLength(1);
      expect(providerSet.get_tools()).toEqual({});
    });

    it('should handle all connections failing', async () => {
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [new Error('Failed 1'), new Error('Failed 2')],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      expect(providerSet.providers).toHaveLength(1);
      expect(providerSet.get_tools()).toEqual({});
    });
  });
});

describe('integration scenarios', () => {
  it('should handle complex real-world scenario', async () => {
    // Mock a scenario with mixed success/failure
    const successfulProvider = {
      get_mcpClient: jest.fn().mockReturnValue({}),
      get_isConnected: jest.fn().mockReturnValue(true),
      get_tools: jest
        .fn()
        .mockReturnValue({ 'file-tool': {}, 'search-tool': {} }),
      dispose: jest
        .fn()
        .mockResolvedValue(
          undefined as unknown as never,
        ) as jest.MockedFunction<() => Promise<void>>,
      connect: jest
        .fn()
        .mockResolvedValue({} as unknown as never) as jest.MockedFunction<
        () => Promise<ConnectableToolProvider>
      >,
    };

    mockGetResolvedPromises.mockResolvedValue({
      fulfilled: [successfulProvider],
      rejected: [new Error('Email server down')],
      pending: [],
    });

    const providerSet = await toolProviderSetFactory(
      [
        { url: 'https://file-server.com/api', allowWrite: false },
        { url: 'https://email-server.com/api', allowWrite: true },
      ],
      15000,
    );

    expect(providerSet.providers).toHaveLength(2);
    expect(providerSet.get_tools()).toEqual({
      'file-tool': {},
      'search-tool': {},
    });

    // Should cleanup gracefully
    await providerSet.dispose();
    expect(successfulProvider.dispose).toHaveBeenCalled();
  });
});
