import { toolProviderSetFactory } from './toolProviderFactory';
import { env } from '@/lib/site-util/env';
import { ToolProviderFactoryOptions } from './types';
import { NextRequest } from 'next/server';

export const getMcpClientHeaders = ({
  req,
  chatHistoryId,
}: {
  req: NextRequest;
  chatHistoryId?: string;
}): Record<string, string> => {
  const ret: { [key: string]: string } = {
    ...(chatHistoryId ? { 'x-chat-history-id': chatHistoryId } : {}),
  };
  const sessionCookie = req.cookies?.get('authjs.session-token')?.value ?? '';
  if (sessionCookie.length > 0) {
    ret.Cookie = `authjs.session-token=${sessionCookie}`;
  }
  return ret;
};

export const setupDefaultTools = async ({
  writeEnabled,
  req,
  chatHistoryId,
  memoryEnabled = true,
}: {
  writeEnabled?: boolean;
  req?: NextRequest;
  chatHistoryId?: string;
  memoryEnabled?: boolean;
}) => {
  const options: Array<ToolProviderFactoryOptions> = [];
  if (req) {
    options.push({
      allowWrite: writeEnabled,
      url: new URL('/api/ai/tools/sse', env('NEXT_PUBLIC_HOSTNAME')).toString(),
      headers: getMcpClientHeaders({ req, chatHistoryId }),
    });
  }
  if (memoryEnabled) {
    options.push({
      allowWrite: true,
      headers: {
        'cache-control': 'no-cache, no-transform',
        'content-encoding': 'none',
      },
      url: `${env('MEM0_API_HOST')}/mcp/openmemory/sse/${env('MEM0_USERNAME')}/`,
    });
  }
  return await toolProviderSetFactory(options);
};
