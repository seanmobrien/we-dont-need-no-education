import { AsyncLocalStorage } from 'async_hooks';
import type { NextRequest } from 'next/server';

type McpToolRequestContext = {
  req?: NextRequest;
};

const mcpToolRequestContext = new AsyncLocalStorage<McpToolRequestContext>();

export const runWithMcpToolRequestContext = <T>(
  req: NextRequest | undefined,
  callback: () => T,
): T =>
  req
    ? mcpToolRequestContext.run({ req }, callback)
    : callback();

export const getCurrentMcpToolRequest = (): NextRequest | undefined =>
  mcpToolRequestContext.getStore()?.req;
