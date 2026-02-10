import { JSONValue, Tool, ToolCallOptions, ToolExecuteFunction } from 'ai';
import { LanguageModelV2ToolResultPart } from '@ai-sdk/provider';
import type { MCPClient } from '../types';
import { LoggedError } from '@compliance-theater/logger';

type TArg = JSONValue | unknown | never;

const ProxiedToolMethodNames = [
  'execute',
  'toModelOutput',
  'onInputStart',
  'onInputDelta',
] as const;

const ATTACH_TO_TOOL: unique symbol = Symbol('attachToTool');

type ProxiedToolVTable<INPUT, OUTPUT> = {
  execute?: ToolExecuteFunction<INPUT, OUTPUT>;
  toModelOutput?: (output: OUTPUT) => LanguageModelV2ToolResultPart['output'];
  onInputStart?: (options: ToolCallOptions) => void | PromiseLike<void>;
  onInputDelta?: (
    options: { inputTextDelta: string } & ToolCallOptions,
  ) => void | PromiseLike<void>;
};

export const attachProxyToTool = <INPUT extends TArg, OUTPUT extends TArg>(
  tool: Tool<INPUT, OUTPUT>,
) => {
  const toolAttacher = (
    tool as unknown as {
      [ATTACH_TO_TOOL]: (
        t: Tool<INPUT, OUTPUT> | undefined,
      ) => ProxiedToolVTable<INPUT, OUTPUT>;
    }
  )[ATTACH_TO_TOOL];
  if (typeof toolAttacher === 'function') {
    toolAttacher(tool);
    return true;
  }
  return false;
};

export const toolProxyFactory = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  INPUT extends TArg = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OUTPUT extends TArg = any,
>({
  mcpClient,
  name,
  tool,
}: {
  mcpClient:
    | MCPClient
    | ((name: string) => Promise<Tool<INPUT, OUTPUT> | undefined>);
  name: string;
  tool: Tool<INPUT, OUTPUT>;
}): Tool<INPUT, OUTPUT> => {
  let vTable: ProxiedToolVTable<INPUT, OUTPUT> | undefined = undefined;
  let vTablePromise:
    | Promise<ProxiedToolVTable<INPUT, OUTPUT> | undefined>
    | undefined = undefined;
  const loadTheTool =
    typeof mcpClient === 'function'
      ? mcpClient
      : async (n: string): Promise<Tool<INPUT, OUTPUT> | undefined> =>
          mcpClient
            .tools({ schemas: 'automatic' })
            .then((tools) => tools?.[n] as Tool<INPUT, OUTPUT>);
  const attachTheTool = (tool: Tool<INPUT, OUTPUT> | undefined) => {
    // Attach the tool's methods to the vTable
    vTable = {
      execute: tool?.execute?.bind(tool),
      toModelOutput: tool?.toModelOutput?.bind(tool),
      onInputStart: tool?.onInputStart?.bind(tool),
      onInputDelta: tool?.onInputDelta?.bind(tool),
    };
    return vTable;
  };
  const proxied = new Proxy(tool, {
    get: (target, prop, receiver) => {
      // Special magic 'hidden' accessor providing external tool binding support
      // Can be used to eagerly load and bind the proxied tool if another tool
      // has loaded the map
      if (prop === ATTACH_TO_TOOL) {
        return attachTheTool;
      }
      // If it's not one of the proxied methods, return the original right away
      if (
        !(ProxiedToolMethodNames as readonly (string | symbol)[]).includes(prop)
      ) {
        return Reflect.get(target, prop, receiver);
      }
      // If we already have a vTable, use it.
      if (vTable) {
        return vTable[prop as keyof ProxiedToolVTable<INPUT, OUTPUT>];
      }
      // Otherwise, return a lazy-load function that will load the tool on first use
      return async (...args: unknown[]) => {
        // If we arent't already loading the tool, start loading it
        if (!vTablePromise) {
          vTablePromise = loadTheTool(name)
            .then(attachTheTool)
            .catch((error) => {
              LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: `Failed to load tools for proxy ${name}`,
                source: 'MCP Tool Proxy',
              });
              vTablePromise = undefined;
              return Promise.resolve(undefined);
            });
        }
        // Await the vTable
        const table = await vTablePromise;
        // Call the requested method if we have it
        const fn = table?.[prop as keyof ProxiedToolVTable<INPUT, OUTPUT>];
        return fn
          ? (fn as (...args_1: unknown[]) => unknown)(...args)
          : undefined;
      };
    },
  });
  return proxied;
};
