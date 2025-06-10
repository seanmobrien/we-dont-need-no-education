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
