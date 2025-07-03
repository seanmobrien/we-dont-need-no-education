import type {
  ConnectableToolProvider,
  ToolProviderSet,
  ToolProviderFactoryOptions,
} from './types';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { ToolSet } from 'ai';

export const toolProviderFactory = async (
  options: ToolProviderFactoryOptions,
): Promise<ConnectableToolProvider> => {
  let mcpClient = await createMCPClient({
    transport: {
      type: 'sse',
      url: options.url,
      headers: options.headers,
      onerror: (error) => {
        console.error('MCP Client SSE Error:', error);
        // Handle reconnection logic or other error handling as needed
      },
      onclose: () => {
        console.warn('MCP Client SSE Connection Closed');
        // Handle connection closed logic if needed
      },
      onmessage(message) {
        // Handle incoming messages if needed
        console.log('MCP Client SSE Message:', message);
      },
    },
    onUncaughtError: (error) => {
      console.error('MCP Client Uncaught Error:', error);
      // Handle uncaught errors in the MCP client
    },
  });

  const allTools = await mcpClient.tools();
  const tools: ToolSet = options.allowWrite
    ? allTools
    : Object.entries(allTools).reduce((acc, [toolName, tool]) => {
        if ((tool.description?.indexOf('Write access') ?? -1) === -1) {
          acc[toolName] = tool;
        }
        return acc;
      }, {} as ToolSet);
  let isConnected = true;

  return {
    get_mcpClient: () => mcpClient,
    get_isConnected: () => isConnected,
    get_tools: () => tools,
    dispose: async () => {
      await mcpClient.close();
    },
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
    },
  };
};

export const toolProviderSetFactory = async (
  providers: Array<ToolProviderFactoryOptions>,
): Promise<ToolProviderSet> => {
  const resolvedProviders = await Promise.all(
    providers.map((options) => toolProviderFactory(options)),
  );

  return {
    providers: resolvedProviders,
    get_tools: () => {
      return resolvedProviders.reduce((acc, provider) => {
        return { ...acc, ...provider.get_tools() };
      }, {} as ToolSet);
    },
    dispose: async () => {
      await Promise.all(
        resolvedProviders.map((provider) => provider.dispose()),
      );
    },
  };
};
