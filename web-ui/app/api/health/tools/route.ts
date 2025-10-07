import { auth } from '/auth';
import { setupDefaultTools } from '/lib/ai/mcp/setup-default-tools';
import { wrapRouteRequest } from '/lib/nextjs-util/server';
import { NextRequest } from 'next/server';

const toolProviderFactory = async ({
  req,
}: {
  req: NextRequest;
  chatHistoryId: string;
  writeEnabled?: boolean;
  memoryDisabled?: boolean;
  userId: string;
  sessionId: string;
}) =>
  setupDefaultTools({
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
    userId: session.user.id!,
    sessionId: 'test-session',
  });
  const tools = Object.keys(toolProviders.tools);
  return Response.json({ status: 200, message: 'OK', tools }, { status: 200 });
});
