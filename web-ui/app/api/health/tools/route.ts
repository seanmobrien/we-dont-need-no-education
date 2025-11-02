import { auth } from '@/auth';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import type { User } from '@auth/core/types';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import type { NextRequest } from 'next/server';

const toolProviderFactory = async ({
  req,
  user,
}: {
  req: NextRequest;
  chatHistoryId: string;
  writeEnabled?: boolean;
  memoryDisabled?: boolean;
  user: User;
  sessionId: string;
}) =>
  setupDefaultTools({
    user,
    writeEnabled: false,
    req,
    chatHistoryId: 'health-check',
    memoryEnabled: true,
  });

/**
 * GET /api/health
 * Returns a structured snapshot of subsystem statuses.
 * Wrapped for unified logging / error semantics.
 */
export const GET = wrapRouteRequest(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { status: 401, message: 'Unauthorized' },
      { status: 401 },
    );
  }
  const toolProviders = await toolProviderFactory({
    req,
    chatHistoryId: 'health-check',
    user: session.user,
    sessionId: 'test-session',
  });
  const tools = Object.keys(toolProviders.tools);
  return Response.json({ status: 200, message: 'OK', tools }, { status: 200 });
});
