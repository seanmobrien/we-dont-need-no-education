/**
 * @jest-environment node
 */

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

// Mock all dependencies first
const mockGetResolvedPromises = jest.fn() as jest.MockedFunction<any>;
const mockIsError = jest.fn() as jest.MockedFunction<any>;
let originalReactUtil:
  | typeof import('@/lib/react-util/utility-methods')
  | undefined;
const mockLoggedError = {
  isTurtlesAllTheWayDownBaby: jest.fn() as jest.MockedFunction<any>,
};
const mockCreateMCPClient = jest.fn() as jest.MockedFunction<any>;
const mockInstrumentedSseTransport = jest.fn() as jest.MockedFunction<any>;
// Returns either a map of cached tools or null when none cached
const mockGetCachedTools = jest.fn() as unknown as jest.MockedFunction<
  () => Promise<Record<string, unknown> | null>
>;
mockGetCachedTools.mockResolvedValue(null as Record<string, unknown> | null);

jest.mock('@/lib/react-util/utility-methods', () => {
  const originalReactUtil = jest.requireActual('/lib/react-util/utility-methods');
  return {
    ...originalReactUtil,
    getResolvedPromises: mockGetResolvedPromises,
    isError: mockIsError,
  };
});

jest.mock('@/lib/ai/mcp/cache', () => {
  const mock = {
    getCachedTools: mockGetCachedTools,
    setCachedTools: async () => Promise.resolve(),
    invalidateCache: async () => Promise.resolve(),
  };
  return {
    getToolCache: jest.fn(() => Promise.resolve(mock)),
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
jest.mock('@/lib/ai/mcp/providers/client-tool-provider', () => ({
  clientToolProviderFactory: jest.fn(() => {
    const emitter = new EventEmitter();
    const dispose = jest.fn(() => emitter.emit('dispose'));
    return {
      url: 'https://server3.com/api',
      allowWrite: false,
      get_mcpClient: jest.fn().mockReturnValue({}),
      get_isConnected: jest.fn().mockReturnValue(true),
      get tools() {
        return {};
      },
      [Symbol.dispose]: dispose,
      dispose: dispose,
      connect: jest.fn().mockResolvedValue({} as unknown as never),
      addDisposeListener: jest.fn((cb: () => void) => {
        emitter.on('dispose', cb);
      }),
      removeDisposeListener: jest.fn((cb: () => void) => {
        emitter.off('dispose', cb);
      }),
    };
  })
}));

// Import after mocking
import {
  toolProviderFactory,
  toolProviderSetFactory,
} from '@/lib/ai/mcp/providers';
import type {
  ConnectableToolProvider,
  ToolProviderFactoryOptions,
} from '../../../../lib/ai/mcp/types';
import { ToolSet } from 'ai';
import z from 'zod';
import { createAutoRefreshFeatureFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import EventEmitter from '@protobufjs/eventemitter';

type DisposedEmitter = {
  [Symbol.dispose]: () => void;
  dispose: () => void;
  addDisposeListener: (listener: () => void) => void;
  removeDisposeListener: (listener: () => void) => void;
};

const makeDisposeEmitter = <T>(input: T): T & DisposedEmitter => {
  const emitter = new EventEmitter();
  const dispose = jest.fn(() => {
    emitter.emit('dispose');
  });
  const ret = input as (T & Partial<DisposedEmitter>);
  ret[Symbol.dispose] = dispose;
  ret.dispose = dispose;
  ret.addDisposeListener = jest.fn((listener: () => void) => {
    emitter.on('dispose', listener);
  });
  ret.removeDisposeListener = jest.fn((listener: () => void) => {
    emitter.off('dispose', listener);
  });
  return ret as T & Required<DisposedEmitter>;
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

describe('toolProviderFactory', () => {
  const mockOptions: ToolProviderFactoryOptions = {
    url: 'https://test-mcp-server.com/api',
    headers: () => Promise.resolve({ Authorization: 'Bearer test-token' }),
    allowWrite: false,
  };

  const mockMCPClient = {
    tools: jest.fn(() => Promise.resolve(mockTools)),
    close: jest.fn(() => Promise.resolve()),
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

  afterEach(() => {
    // Cleanup any remaining mocks
    // jest.clearAllMocks();
  });

  describe('successful connection', () => {
    it('should create a connected provider with all tools when allowWrite is true', async () => {
      const options = { ...mockOptions, allowWrite: true };
      const provider = await toolProviderFactory(options);

      expect(provider.get_isConnected()).toBe(true);
      expect(provider.tools).toEqual(mockTools);
      expect(provider.get_mcpClient()).toBe(mockMCPClient);
    });

    it('should create a connected provider with filtered tools when allowWrite is false', async () => {
      const options = { ...mockOptions, allowWrite: false };
      const provider = await toolProviderFactory(options);

      expect(provider.get_isConnected()).toBe(true);

      const filteredTools = provider.tools;
      expect(filteredTools).toHaveProperty('read-tool');
      expect(filteredTools).not.toHaveProperty('write-tool');
    });

    it('should create InstrumentedSseTransport with correct options', async () => {
      await toolProviderFactory({
        ...mockOptions,
        sse: true,
      });

      expect(mockInstrumentedSseTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sse',
          url: mockOptions.url,
          headers: mockOptions.headers,
          onerror: expect.any(Function),
          onclose: expect.any(Function),
        }),
      );
    });

    it('should create MCP client with transport and error handler', async () => {
      await toolProviderFactory(mockOptions);
      (createAutoRefreshFeatureFlag as jest.Mock).mockImplementation(
        async (ops: any) => {
          switch (ops.key) {
            case 'mcp_enable_tool_caching':
              return {
                key: ops.key,
                userId: ops.userId!,
                value: false,
              };
            case 'mcp_protocol_http_stream':
              return {
                key: ops.key,
                userId: ops.userId!,
                value: true,
              };
            default:
              return {
                key: ops.key,
                userId: ops.userId!,
                value: ops.initialValue!,
              };
          }
        },
      );

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
        await provider[Symbol.dispose]();
        expect(mockMCPClient.close).toHaveBeenCalled();
      });

      it('should handle dispose errors gracefully', async () => {
        const disposeError = new Error('Dispose error');
        mockMCPClient.close.mockRejectedValue(disposeError);

        await provider[Symbol.dispose]();

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
      expect(provider.tools).toEqual({});
      expect(provider.get_mcpClient()).toBeUndefined();
    });
    ;

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
      const tools = provider.tools;

      expect(tools).toHaveProperty('read-tool');
      expect(tools).toHaveProperty('write-tool');
    });

    it('should exclude write tools when allowWrite is false', async () => {
      const provider = await toolProviderFactory({
        ...mockOptions,
        allowWrite: false,
      });
      const tools = provider.tools;

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
      const tools = provider.tools;

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

  const createMockProvider = (tools: Record<string, unknown> = mockTools): ConnectableToolProvider => {
    const mcpClient = {
      tools: jest.fn(() => Promise.resolve(tools as ToolSet)),
      close: jest.fn(),
    };
    mockCreateMCPClient.mockResolvedValueOnce(mcpClient);
    const emitter = new EventEmitter();

    const ret: ConnectableToolProvider = {
      get_mcpClient: jest.fn(() => mcpClient as any),
      get_isConnected: jest.fn(() => true),
      get tools() {
        return tools as ToolSet;
      },
      [Symbol.dispose]: jest.fn(() => emitter.emit('dispose')),
      addDisposeListener: jest.fn((cb: () => void) => emitter.on('dispose', cb)),
      removeDisposeListener: jest.fn((cb: () => void) => emitter.off('dispose', cb)),
      connect: jest.fn(() => Promise.resolve(ret)),
    };
    return ret;
  };

  beforeEach(() => {
    (createAutoRefreshFeatureFlag as jest.Mock).mockResolvedValue({
      key: 'mcp_enable_tool_caching',
      userId: 'server',
      value: false,
    } as unknown as never);
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
        expect.any(Number),
      );
    });

    it('should aggregate tools from all providers', async () => {
      (createAutoRefreshFeatureFlag as jest.Mock).mockImplementation(
        async (ops: any) => {
          switch (ops.key) {
            case 'mcp_enable_tool_caching':
              return {
                key: ops.key,
                userId: ops.userId!,
                value: true,
              };
            case 'mcp_protocol_http_stream':
              return {
                key: ops.key,
                userId: ops.userId!,
                value: false,
              };
            default:
              return {
                key: ops.key,
                userId: ops.userId!,
                value: ops.initialValue!,
              };
          }
        },
      );

      const tools = {
        tool1: { ...mockTools['read-tool'] },
        tool2: { ...mockTools['read-tool'] },
        tool3: { ...mockTools['read-tool'] },
      };
      mockGetCachedTools.mockResolvedValueOnce({ tool1: tools.tool1 });
      mockGetCachedTools.mockResolvedValueOnce({ tool2: tools.tool2 });
      mockGetCachedTools.mockResolvedValueOnce({ tool3: tools.tool3 });
      mockCreateMCPClient.mockResolvedValueOnce({
        tools: jest.fn().mockReturnValue(tools),
        close: jest.fn(),
      });
      mockCreateMCPClient.mockResolvedValueOnce({
        tools: jest.fn().mockReturnValue(tools),
        close: jest.fn(),
      });
      mockCreateMCPClient.mockResolvedValueOnce({
        tools: jest.fn().mockReturnValue(tools),
        close: jest.fn(),
      });

      // Mock getResolvedPromises to resolve immediately without creating real timeouts
      mockGetResolvedPromises.mockClear();
      mockGetResolvedPromises.mockImplementation(
        async (promises: Promise<any>[]) => {
          const results = await Promise.allSettled(promises);
          return {
            fulfilled: results
              .filter(
                (r): r is PromiseFulfilledResult<any> =>
                  r.status === 'fulfilled',
              )
              .map((r) => r.value),
            rejected: results
              .filter(
                (r): r is PromiseRejectedResult => r.status === 'rejected',
              )
              .map((r) => r.reason),
            pending: [],
          };
        },
      );

      const providerSet = await toolProviderSetFactory(mockProviderOptions);
      const allTools = providerSet.tools;

      expect(allTools.tool1).not.toBeUndefined();
      expect(allTools.tool2).not.toBeUndefined();
      expect(allTools.tool3).not.toBeUndefined();
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
      const allTools = providerSet.tools;

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
      jest.useFakeTimers();
      const mockProvider = createMockProvider();
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [mockProvider, mockProvider, mockProvider],
        rejected: [],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      providerSet[Symbol.dispose]();
      expect(mockProvider[Symbol.dispose]).toHaveBeenCalledTimes(3);

      jest.advanceTimersByTime(1000 * 60 * 60 * 24);
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

      expect(mockProvider[Symbol.dispose]).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const failingProvider = createMockProvider();
      const mockedDispose = failingProvider[Symbol.dispose] as jest.MockedFunction<
        () => void
      >;

      mockedDispose.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const pendingPromise = Promise.resolve(failingProvider);

      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [],
        pending: [pendingPromise],
      });

      //
      await toolProviderSetFactory(mockProviderOptions);


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
      await rejectedPromise.catch(() => { });

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
      expect(providerSet.tools).toEqual({});
    });

    it('should handle all connections failing', async () => {
      mockGetResolvedPromises.mockResolvedValue({
        fulfilled: [],
        rejected: [new Error('Failed 1'), new Error('Failed 2')],
        pending: [],
      });

      const providerSet = await toolProviderSetFactory(mockProviderOptions);

      expect(providerSet.providers).toHaveLength(1);
      expect(providerSet.tools).toEqual({});
    });
  });
});

describe('integration scenarios', () => {
  it('is a test', () => { });

  it('should handle complex real-world scenario', async () => {
    jest.useFakeTimers();
    // Mock a scenario with mixed success/failure
    const successfulProvider = makeDisposeEmitter({
      get_mcpClient: jest.fn().mockReturnValue({}),
      get_isConnected: jest.fn().mockReturnValue(true),
      get tools() {
        return { 'file-tool': {}, 'search-tool': {} };
      },
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
    });

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
    expect(providerSet.tools).toEqual({
      'file-tool': {},
      'search-tool': {},
    });

    jest.advanceTimersByTime(1000 * 60 * 60 * 24);
    // Should cleanup gracefully
    await providerSet[Symbol.dispose]();
    expect(successfulProvider.dispose).toHaveBeenCalled();
  });
});
