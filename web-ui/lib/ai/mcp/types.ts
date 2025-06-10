import { UnwrapPromise } from '@/lib/typescript';
import type {
  experimental_createMCPClient as createMCPClient,
  ToolSet,
} from 'ai';

export type MCPClient = UnwrapPromise<ReturnType<typeof createMCPClient>>;

/**
 * Options for configuring a ToolProviderFactory instance.
 *
 * @property url - The base URL for the tool provider.
 * @property headers - Optional HTTP headers to include with requests.
 * @property allowWrite - Optional flag indicating if the provider should filter write-enabled tools from it's response.
 */
export type ToolProviderFactoryOptions = {
  url: string;
  headers?: Record<string, string>;
  allowWrite?: boolean;
};

/**
 * Represents a provider that can connect to and manage a set of tools via an MCP client.
 *
 * @property get_mcpClient - Returns the current MCPClient instance.
 * @property get_isConnected - Returns a boolean indicating if the provider is currently connected.
 * @property get_tools - Returns the current set of available tools.
 * @property dispose - Cleans up resources and disconnects the provider.
 * @property connect - Establishes a connection, optionally allowing write access.
 *   @param allowWrite - Optional flag to allow write operations during connection.
 */
export type ConnectableToolProvider = {
  get_mcpClient: () => MCPClient;
  get_isConnected: () => boolean;
  get_tools: () => ToolSet;
  dispose: () => Promise<void>;
  connect: ({}: { allowWrite?: boolean }) => Promise<void>;
};

/**
 * Represents a set of tool providers along with a method to retrieve their tools.
 *
 * @property providers - An array of `ConnectableToolProvider` instances that supply tools.
 * @property get_tools - A function that returns a `ToolSet` containing the available tools from all of the providers.
 */
export type ToolProviderSet = {
  providers: Array<ConnectableToolProvider>;
  get_tools: () => ToolSet;
  dispose: () => Promise<void>;
};
