/**
 * @fileoverview Provider-related MCP utilities and factories
 * @module providers
 */

import type {
  ToolProviderFactoryOptions,
  ToolProviderSet,
  ConnectableToolProvider,
} from '../types';
import type { NextRequest } from 'next/server';

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
 * const tools = provider.tools;
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
export declare function toolProviderFactory(
  options: ToolProviderFactoryOptions,
): Promise<ConnectableToolProvider>;
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
 * const allTools = providerSet.tools();
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
 * const availableTools = providerSet.tools();
 * console.log(`Connected to ${providerSet.providers.length} providers`);
 * ```
 *
 * @see {@link ToolProviderSet} For the returned provider set interface
 * @see {@link toolProviderFactory} For single provider connections
 * @see {@link getResolvedProvidersWithCleanup} For the internal connection management logic
 *
 * @since 1.0.0
 */
export declare function toolProviderSetFactory(
  providers: Array<ToolProviderFactoryOptions | ConnectableToolProvider>,
  timeoutMs?: number,
): Promise<ToolProviderSet>;
/**
 * Type guard to check if an object conforms to the ConnectableToolProvider interface.
 *
 * This function verifies that the provided object has all required methods of the
 * ConnectableToolProvider interface, ensuring type safety when working with dynamic
 * or unknown objects.
 *
 * @function isToolProvider
 * @param {unknown} check - The object to check
 * @returns {boolean} True if the object is a ConnectableToolProvider, false otherwise
 *
 * @example
 * ```typescript
 * const obj: unknown = getSomeObject();
 * if (isToolProvider(obj)) {
 *   // Now TypeScript knows obj is a ConnectableToolProvider
 *   const tools = obj.tools;
 * } else {
 *   console.error('Object is not a valid tool provider');
 * }
 * ```
 *
 * @see {@link ConnectableToolProvider} For the interface being checked
 *
 * @since 1.0.0
 */
export declare function isToolProvider(
  check: unknown,
): check is ConnectableToolProvider;
export declare function clientToolProviderFactory(): ConnectableToolProvider;
export declare function getMcpClientHeaders(params: {
  req: NextRequest;
  chatHistoryId?: string;
}): Record<string, string>;
export declare function setupDefaultTools(options: {
  writeEnabled?: boolean;
  req?: NextRequest;
  chatHistoryId?: string;
  memoryEnabled?: boolean;
}): Promise<ToolProviderSet>;
