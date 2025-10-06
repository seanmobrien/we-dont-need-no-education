/**
 * @fileoverview TypeScript type definitions for Model Context Protocol (MCP) integration
 *
 * This module defines the core TypeScript interfaces and types used throughout the MCP
 * (Model Context Protocol) system for AI tool integration. It provides type-safe abstractions
 * for MCP clients, tool providers, and tool management within the application.
 *
 * The MCP system enables AI models to interact with external tools and services through
 * a standardized protocol, allowing for dynamic tool discovery, execution, and management.
 *
 * Key components:
 * - MCPClient: Type-safe wrapper for MCP client instances
 * - ToolProviderFactoryOptions: Configuration for tool provider factories
 * - ConnectableToolProvider: Interface for providers that can connect to MCP servers
 * - ToolProviderSet: Collection of tool providers with aggregated tool access
 *
 * @example
 * ```typescript
 * import type {
 *   MCPClient,
 *   ConnectableToolProvider,
 *   ToolProviderFactoryOptions
 * } from '/lib/ai/mcp/types';
 *
 * // Configure a tool provider factory
 * const options: ToolProviderFactoryOptions = {
 *   url: 'https://api.example.com/mcp',
 *   headers: { 'Authorization': 'Bearer token' },
 *   allowWrite: true,
 *   traceable: true
 * };
 *
 * // Create and connect a tool provider
 * const provider = await toolProviderFactory.create(options);
 * const connectedProvider = await provider.connect({ allowWrite: true });
 *
 * // Access available tools
 * const tools = connectedProvider.tools;
 * const isConnected = connectedProvider.get_isConnected();
 *
 * // Clean up resources
 * await connectedProvider.dispose();
 * ```
 */

import { UnwrapPromise } from '/lib/typescript';
import type {
  experimental_createMCPClient as createMCPClient,
  ToolSet,
} from 'ai';
import type { ImpersonationService } from '/lib/auth/impersonation';

/**
 * Type alias for an MCP (Model Context Protocol) client instance.
 *
 * This type represents the unwrapped promise result of creating an MCP client using
 * the experimental_createMCPClient function from the 'ai' library. It provides
 * type-safe access to MCP client functionality for tool discovery and execution.
 *
 * @typedef {UnwrapPromise<ReturnType<typeof createMCPClient>>} MCPClient
 *
 * @example
 * ```typescript
 * // The MCPClient type is automatically inferred from the createMCPClient call
 * const client: MCPClient = await createMCPClient({
 *   transport: new SSETransport({ url: 'https://api.example.com/mcp' })
 * });
 *
 * // Use the client to interact with MCP servers
 * const tools = await client.listTools();
 * ```
 */
export type MCPClient = UnwrapPromise<ReturnType<typeof createMCPClient>>;

/**
 * Configuration options for creating and configuring tool provider factory instances.
 *
 * This interface defines the parameters needed to set up a tool provider that can
 * connect to MCP servers and manage tool discovery and execution. It supports
 * authentication, write permissions, tracing, and impersonation for secure tool access.
 *
 * @typedef {Object} ToolProviderFactoryOptions
 *
 * @property {string} url - The base URL of the MCP server to connect to. This should be
 *   a fully qualified URL including protocol (http/https) and port if non-standard.
 * @property {Record<string, string>} [headers] - Optional HTTP headers to include with
 *   all requests to the MCP server. Commonly used for authentication tokens or API keys.
 * @property {boolean} [allowWrite] - Optional flag controlling whether write-enabled tools
 *   should be included in the tool set. When false, only read-only tools are exposed.
 *   Defaults to false for security.
 * @property {Request} [req] - Optional Request object representing the incoming HTTP request.
 *   This can be used to propagate request-specific context such as headers or user info.
 * @property {ImpersonationService} [impersonation] - Optional impersonation service instance
 *   for making authenticated requests on behalf of users. Enables secure delegation of
 *   tool execution permissions.
 *
 * @example
 * ```typescript
 * // Basic configuration for a read-only tool provider
 * const basicOptions: ToolProviderFactoryOptions = {
 *   url: 'https://api.example.com/mcp'
 * };
 *
 * // Advanced configuration with authentication and write access
 * const advancedOptions: ToolProviderFactoryOptions = {
 *   url: 'https://secure-api.example.com/mcp',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     'X-API-Version': 'v2'
 *   },
 *   allowWrite: true,
 *   traceable: true,
 *   impersonation: impersonationService
 * };
 * ```
 */
export type ToolProviderFactoryOptions = {
  url: string;
  headers?: () => Promise<Record<string, string>>;
  allowWrite?: boolean;
  req?: Request;
  impersonation?: ImpersonationService;
};

/**
 * Interface representing a tool provider that can connect to and manage MCP tools.
 *
 * This interface defines the contract for providers that establish connections to MCP
 * servers and provide access to their available tools. It supports connection management,
 * tool discovery, and resource cleanup operations.
 *
 * @typedef {Object} ConnectableToolProvider
 *
 * @property {() => MCPClient} get_mcpClient - Returns the underlying MCP client instance
 *   used for communication with the MCP server. The client handles the low-level protocol
 *   communication and tool execution.
 * @property {() => boolean} get_isConnected - Returns a boolean indicating whether the
 *   provider is currently connected to the MCP server. Connection status affects tool
 *   availability and execution capabilities.
 * @property {() => ToolSet} tools - Returns the current set of available tools from
 *   the connected MCP server. The tool set is dynamically updated based on server
 *   capabilities and connection permissions.
 * @property {() => Promise<void>} dispose - Asynchronously cleans up resources and
 *   disconnects from the MCP server. This method should be called when the provider
 *   is no longer needed to prevent resource leaks.
 * @property {(options: { allowWrite?: boolean }) => Promise<ConnectableToolProvider>} connect -
 *   Establishes a connection to the MCP server with optional write permissions.
 *   Returns a promise that resolves to the connected provider instance.
 *
 * @example
 * ```typescript
 * // Create and connect a tool provider
 * const provider: ConnectableToolProvider = await factory.create(options);
 *
 * // Check connection status
 * if (!provider.get_isConnected()) {
 *   // Establish connection with write permissions
 *   const connectedProvider = await provider.connect({ allowWrite: true });
 *
 *   // Access available tools
 *   const tools = connectedProvider.tools;
 *   console.log('Available tools:', Object.keys(tools));
 *
 *   // Use tools for AI interactions...
 *
 *   // Clean up when done
 *   await connectedProvider.dispose();
 * }
 * ```
 */
export type ConnectableToolProvider = {
  get_mcpClient: () => MCPClient;
  get_isConnected: () => boolean;
  readonly tools: ToolSet;
  dispose: () => Promise<void>;
  connect: ({}: { allowWrite?: boolean }) => Promise<ConnectableToolProvider>;
};

/**
 * Interface representing a collection of tool providers with aggregated tool access.
 *
 * This interface defines a set of tool providers that work together to provide a unified
 * view of available tools from multiple MCP servers. It enables load balancing, failover,
 * and centralized tool management across distributed tool providers.
 *
 * @typedef {Object} ToolProviderSet
 *
 * @property {boolean} isHealthy - Indicates whether all requested tool providers were
 *   successfully connected and are operational.
 * @property {Array<ConnectableToolProvider>} providers - Array of individual tool provider
 *   instances that supply tools. Each provider may connect to different MCP servers or
 *   provide different tool sets based on their configuration.
 * @property {() => ToolSet} tools - Returns a unified ToolSet containing all available
 *   tools from all connected providers. Tool names are deduplicated, with provider-specific
 *   tools accessible through the aggregated interface.
 * @property {() => Promise<void>} dispose - Asynchronously disposes of all providers in
 *   the set, cleaning up resources and disconnecting from all MCP servers. This ensures
 *   proper cleanup of the entire provider collection.
 *
 * @example
 * ```typescript
 * // Create a set of tool providers
 * const providerSet: ToolProviderSet = await factory.createSet([
 *   { url: 'https://api1.example.com/mcp', allowWrite: false },
 *   { url: 'https://api2.example.com/mcp', allowWrite: true }
 * ]);
 *
 * // Get all available tools from all providers
 * const allTools = providerSet.tools;
 * console.log('Total tools available:', Object.keys(allTools).length);
 *
 * // Access provider information
 * providerSet.providers.forEach((provider, index) => {
 *   console.log(`Provider ${index} connected:`, provider.get_isConnected());
 * });
 *
 * // Clean up all providers
 * await providerSet.dispose();
 * ```
 */
export type ToolProviderSet = {
  readonly isHealthy: boolean;
  readonly tools: ToolSet;
  providers: Array<ConnectableToolProvider>;
  dispose: () => Promise<void>;
};
