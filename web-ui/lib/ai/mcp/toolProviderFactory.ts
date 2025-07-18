/**
 * @fileoverview Tool Provider Factory for Model Context Protocol (MCP) client connections.
 * Handles connection timeouts, error recovery, and resource cleanup for MCP servers.
 *
 * @module toolProviderFactory
 * @version 1.0.0
 * @author NoEducation Team
 */

import { log } from '@/lib/logger';
import type {
  ConnectableToolProvider,
  ToolProviderSet,
  ToolProviderFactoryOptions,
  MCPClient,
} from './types';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { ToolSet } from 'ai';
import { getResolvedPromises, isError, LoggedError } from '@/lib/react-util';
import { InstrumentedSseTransport } from './traceable-transport-client';
import { FirstParameter } from '@/lib/typescript';

/**
 * Creates a single Model Context Protocol (MCP) client connection.
 *
 * This factory function establishes a connection to an MCP server with comprehensive
 * error handling, resource cleanup, and tool filtering capabilities. It implements
 * graceful degradation by returning a stub provider if connection fails.
 *
 * @async
 * @function toolProviderFactory
 * @param {ToolProviderFactoryOptions} options - Configuration options for the MCP connection
 * @param {string} options.url - The MCP server URL to connect to
 * @param {Record<string, string>} [options.headers] - Optional HTTP headers for authentication
 * @param {boolean} [options.allowWrite=false] - Whether to include write-access tools in the tool set
 * @returns {Promise<ConnectableToolProvider>} A promise that resolves to a connected tool provider
 *
 * @example
 * ```typescript
 * // Create a read-only connection
 * const provider = await toolProviderFactory({
 *   url: 'https://mcp-server.example.com/api',
 *   headers: { 'Authorization': 'Bearer token' },
 *   allowWrite: false
 * });
 *
 * // Use the provider
 * const tools = provider.get_tools();
 * const isConnected = provider.get_isConnected();
 *
 * // Clean up when done
 * await provider.dispose();
 * ```
 *
 * @example
 * ```typescript
 * // Create a read-write connection
 * const provider = await toolProviderFactory({
 *   url: 'https://mcp-server.example.com/api',
 *   allowWrite: true
 * });
 * ```
 *
 * @throws {never} Never throws - implements graceful degradation with stub provider
 *
 * @see {@link ConnectableToolProvider} For the returned provider interface
 * @see {@link ToolProviderFactoryOptions} For configuration options
 * @see {@link toolProviderSetFactory} For managing multiple providers
 *
 * @since 1.0.0
 */
export const toolProviderFactory = async ({
  traceable = true,
  ...options
}: ToolProviderFactoryOptions): Promise<ConnectableToolProvider> => {

  const onerror = ((error: unknown) => {
    log((l) => l.error('MCP Client SSE Error:', error));

    return {
      role: 'assistant',
      content: `An error occurred while connecting to the MCP server: ${isError(error) ? error.message : String(error)}. Please try again later.`,
    }
  }) as unknown as ((error:unknown) => void);

  try {
    type MCPClientConfig = FirstParameter<typeof createMCPClient>;
    const tx: MCPClientConfig['transport'] = {
      type: 'sse',
      url: options.url,
      headers: options.headers,
      /**
       * Handles SSE connection errors and returns user-friendly error messages.
       * @param {unknown} error - The error that occurred during SSE connection
       * @returns {object} Assistant message with error information
       */
      onerror: (error: unknown) => {
        log((l) => l.error('MCP Client SSE Error:', error));

        return {
          role: 'assistant',
          content: `An error occurred while connecting to the MCP server: ${isError(error) ? error.message : String(error)}. Please try again later.`,
        };
      },
      /**
       * Handles SSE connection close events with error recovery.
       */
      onclose: () => {
        try {
          log((l) => l.warn('MCP Client SSE Connection Closed'));
        } catch (e) {          
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
             log: true,
             source: 'MCPClientMessageHandler',
             message: 'MCP Client SSE Close Error',
            critical: true,
           });
        }
      },
      /**
       * Handles incoming SSE messages with error protection.
       * @param {unknown} message - The received SSE message
       */
      onmessage(message: unknown) {
        try {
          // Handle incoming messages if needed for debugging/monitoring
          log((l) => l.info('MCP Client SSE Message:', message));
        } catch (e) {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
             log: true,
             source: 'MCPClientMessageHandler',
             message: 'MCP Client SSE Message Error',
             critical: true,
             data: {
               message
             },
           });          
        }
      },
    };

    // Create instrumented SSE transport with comprehensive error handling
    const transport = traceable
      ? new InstrumentedSseTransport({
          url: options.url,
          onerror,
          ...tx,
        })
      : tx;

    // Create MCP client with transport and error handling
    let mcpClient = await createMCPClient({
      transport,
      /**
       * Handles uncaught errors from the MCP client with nested error protection.
       * @param {unknown} error - The uncaught error from the MCP client
       * @returns {object} Assistant message with error information
       */
      onUncaughtError: (error) => {
        try {
           LoggedError.isTurtlesAllTheWayDownBaby(e, {
             log: true,
             source: 'MCPClientMessageHandler',
             message: 'MCP Client SSE Uncaught Error',
             critical: true,             
           });          
          return {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: `An error occurred while processing your request: ${isError(error) ? error.message : String(error)}. Please try again later.`,
              },
            ],
          };
        } catch (e) {
          // Fallback error handling if logging itself fails
          log((l) => l.error('MCP Client Uncaught Error Handler Error:', e));
          return {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: `A critical error occurred while processing your request. Please try again later.`,
              },
            ],
          };
        }
      },
    });

    // Retrieve and filter tools based on access permissions
    const allTools = await mcpClient.tools();
    const tools: ToolSet = options.allowWrite
      ? allTools
      : Object.entries(allTools).reduce((acc, [toolName, tool]) => {
          // Filter out tools that require write access when in read-only mode
          if ((tool.description?.indexOf('Write access') ?? -1) === -1) {
            acc[toolName] = tool;
          }
          return acc;
        }, {} as ToolSet);

    let isConnected = true;

    // Return the connected tool provider interface
    return {
      /**
       * Gets the underlying MCP client instance.
       * @returns {MCPClient} The MCP client instance
       */
      get_mcpClient: () => mcpClient,

      /**
       * Checks if the provider is currently connected.
       * @returns {boolean} True if connected, false otherwise
       */
      get_isConnected: () => isConnected,

      /**
       * Gets the filtered tool set based on access permissions.
       * @returns {ToolSet} The available tools for this provider
       */
      get_tools: () => tools,

      /**
       * Disposes of the MCP client and cleans up resources.
       * @async
       * @returns {Promise<void>} Promise that resolves when disposal is complete
       */
      dispose: async () => {
        try {
          await mcpClient.close();
        } catch (e) {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            log: true,
            source: 'toolProviderFactory dispose',
            severity: 'error',
            data: {
              message: 'Error disposing MCP client',
              options,
            },
          });
        }
      },

      /**
       * Reconnects the provider with new access permissions.
       * @async
       * @param {object} options - Reconnection options
       * @param {boolean} [options.allowWrite=false] - Whether to allow write access
       * @returns {Promise<ConnectableToolProvider>} New provider instance with updated permissions
       */
      connect: async ({ allowWrite = false }: { allowWrite?: boolean }) => {
        const disconnect = isConnected
          ? await mcpClient.close()
          : Promise.resolve();
        const newTool = await toolProviderFactory({
          ...options,
          allowWrite,
        });
        mcpClient = newTool.get_mcpClient();
        await disconnect;
        isConnected = true;
        return newTool;
      },
    };
  } catch (error) {
    // Graceful degradation: return stub provider on connection failure
    log((l) =>
      l.error(
        `A critical failure occurred connecting to MCP server at [${options?.url}] - tools from this resource will not be available.`,
        error,
      ),
    );
    return {
      /**
       * Stub implementation - returns undefined as no client is available.
       * @returns {MCPClient} Undefined cast to MCPClient type
       */
      get_mcpClient: () => undefined as unknown as MCPClient,

      /**
       * Stub implementation - always returns false for failed connections.
       * @returns {boolean} Always false
       */
      get_isConnected: () => false as boolean,

      /**
       * Stub implementation - returns empty tool set for failed connections.
       * @returns {ToolSet} Empty tool set
       */
      get_tools: () => ({}) as ToolSet,

      /**
       * Stub implementation - no-op disposal for failed connections.
       * @async
       * @returns {Promise<void>} Resolved promise
       */
      dispose: async () => {},

      /**
       * Stub implementation - attempts to reconnect by creating a new provider.
       * @async
       * @param {object} options - Reconnection options
       * @param {boolean} [options.allowWrite=false] - Whether to allow write access
       * @returns {Promise<ConnectableToolProvider>} New provider instance
       */
      connect: async ({ allowWrite = false }: { allowWrite?: boolean }) => {
        const newTool = await toolProviderFactory({
          ...options,
          allowWrite,
        });
        return newTool;
      },
    } as ConnectableToolProvider;
  }
};

/**
 * Internal helper function that categorizes promise results and handles cleanup.
 *
 * This function uses the `getResolvedPromises` utility to separate fulfilled, rejected,
 * and pending promises, then sets up cleanup hooks for pending connections and logs
 * any rejected connections for monitoring purposes.
 *
 * @async
 * @function getResolvedProvidersWithCleanup
 * @param {Promise<ConnectableToolProvider>[]} promises - Array of provider promises to categorize
 * @param {number} [timeoutMs=60000] - Timeout in milliseconds for promise resolution
 * @returns {Promise<ConnectableToolProvider[]>} Array of successfully connected providers
 *
 * @description
 * **Behavior:**
 * 1. **Categorizes Results**: Uses `getResolvedPromises` to separate fulfilled, rejected, and pending promises
 * 2. **Cleanup Pending**: Sets up cleanup hooks for promises that are still pending after timeout
 * 3. **Error Logging**: Logs rejected connections using `LoggedError.isTurtlesAllTheWayDownBaby`
 * 4. **Resource Management**: Ensures proper disposal of timed-out connections
 *
 * @example
 * ```typescript
 * const promises = [
 *   toolProviderFactory({ url: 'server1.com' }),
 *   toolProviderFactory({ url: 'server2.com' }),
 *   toolProviderFactory({ url: 'server3.com' })
 * ];
 *
 * const connectedProviders = await getResolvedProvidersWithCleanup(promises, 30000);
 * console.log(`${connectedProviders.length} providers connected successfully`);
 * ```
 *
 * @internal
 * @since 1.0.0
 */
const getResolvedProvidersWithCleanup = async (
  promises: Promise<ConnectableToolProvider>[],
  timeoutMs: number = 60 * 1000,
): Promise<ConnectableToolProvider[]> => {
  const categorized = await getResolvedPromises(promises, timeoutMs);

  // Setup cleanup hooks for any MCP clients that are still pending after timeout
  categorized.pending.forEach((p) => {
    p.then((provider) => {
      // Dispose of providers that resolve after timeout to prevent resource leaks
      if (provider && typeof provider.dispose === 'function') {
        provider.dispose().catch((e) => {
          log((l) => l.error('Error disposing provider after rejection:', e));
        });
      }
    }).catch((e) => {
      // Log cleanup errors but continue execution
      log((l) => l.error('Error during provider cleanup:', e));
      return Promise.resolve();
    });
  });

  // Log aggregate error information for rejected promises
  if (categorized.rejected.length > 0) {
    LoggedError.isTurtlesAllTheWayDownBaby(
      new AggregateError(
        categorized.rejected,
        'Some MCP clients failed to connect or returned errors',
      ),
      {
        log: true,
        source: 'getResolvedProvidersWithCleanup',
        severity: 'error',
        data: {
          numberOfFailures: categorized.rejected.length,
          timeoutMs,
        },
      },
    );
  }

  // Log successful connection statistics for monitoring
  log((l) =>
    l.debug(
      `MCP toolProviderFactory resolved; ${categorized.fulfilled.length} connections established.`,
    ),
  );
  return categorized.fulfilled;
};

/**
 * Creates and manages multiple Model Context Protocol (MCP) client connections concurrently.
 *
 * This factory function establishes connections to multiple MCP servers simultaneously,
 * handling timeouts, failures, and resource cleanup automatically. It provides a unified
 * interface for working with tools from multiple providers.
 *
 * @async
 * @function toolProviderSetFactory
 * @param {ToolProviderFactoryOptions[]} providers - Array of provider configurations
 * @param {number} [timeoutMs=60000] - Timeout in milliseconds for each connection attempt
 * @returns {Promise<ToolProviderSet>} A promise that resolves to a collection of connected providers
 *
 * @description
 * **Features:**
 * - **Concurrent Connections**: All providers connect simultaneously for optimal performance
 * - **Fault Tolerance**: Failed connections don't prevent successful ones from working
 * - **Resource Management**: Automatic cleanup of failed or timed-out connections
 * - **Unified Tool Access**: Aggregates tools from all successful providers
 * - **Graceful Disposal**: Coordinated cleanup with timeout protection
 *
 * @example
 * ```typescript
 * // Connect to multiple MCP servers
 * const providerSet = await toolProviderSetFactory([
 *   {
 *     url: 'https://file-server.example.com/api',
 *     allowWrite: false,
 *     headers: { 'Authorization': 'Bearer token1' }
 *   },
 *   {
 *     url: 'https://email-server.example.com/api',
 *     allowWrite: true,
 *     headers: { 'Authorization': 'Bearer token2' }
 *   },
 *   {
 *     url: 'https://calendar-server.example.com/api',
 *     allowWrite: false
 *   }
 * ], 30000); // 30 second timeout per connection
 *
 * // Get all available tools from all connected providers
 * const allTools = providerSet.get_tools();
 * console.log(`Total tools available: ${Object.keys(allTools).length}`);
 *
 * // Clean up all providers when done
 * await providerSet.dispose();
 * ```
 *
 * @example
 * ```typescript
 * // Handle partial connection failures gracefully
 * const providerSet = await toolProviderSetFactory([
 *   { url: 'https://working-server.com/api' },
 *   { url: 'https://broken-server.com/api' },  // This may fail
 *   { url: 'https://slow-server.com/api' }     // This may timeout
 * ]);
 *
 * // Still get tools from successful connections
 * const availableTools = providerSet.get_tools();
 * console.log(`Connected to ${providerSet.providers.length} providers`);
 * ```
 *
 * @see {@link ToolProviderSet} For the returned provider set interface
 * @see {@link toolProviderFactory} For single provider connections
 * @see {@link getResolvedProvidersWithCleanup} For the internal connection management logic
 *
 * @since 1.0.0
 */
export const toolProviderSetFactory = async (
  providers: Array<ToolProviderFactoryOptions>,
  timeoutMs: number = 60 * 1000,
): Promise<ToolProviderSet> => {
  // Create provider promises and wait for resolution with cleanup
  const resolvedProviders = await getResolvedProvidersWithCleanup(
    providers.map((options) => toolProviderFactory(options)),
    timeoutMs,
  );

  return {
    /** @type {ConnectableToolProvider[]} Array of successfully connected providers */
    providers: resolvedProviders,

    /**
     * Aggregates tools from all connected providers into a single ToolSet.
     *
     * @returns {ToolSet} Combined tool set from all providers
     * @description
     * Merges tools from all successful provider connections. If multiple providers
     * offer tools with the same name, the last provider's tool will take precedence.
     */
    get_tools: () => {
      return resolvedProviders.reduce((acc, provider) => {
        return { ...acc, ...provider.get_tools() };
      }, {} as ToolSet);
    },

    /**
     * Disposes of all providers with timeout protection.
     *
     * @async
     * @returns {Promise<void>} Promise that resolves when disposal is complete or times out
     * @description
     * Attempts to dispose all providers gracefully within a 15-second timeout.
     * Uses `Promise.any` to ensure the function doesn't hang indefinitely if
     * some providers fail to dispose properly.
     */
    dispose: async () => {
      await Promise.any([
        Promise.all(resolvedProviders.map((provider) => provider.dispose())),
        new Promise((resolve) => setTimeout(resolve, 15 * 1000)), // Wait 15 seconds max for disposal
      ]);
    },
  };
};
