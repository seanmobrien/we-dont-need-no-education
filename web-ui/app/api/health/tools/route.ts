import { auth } from '@/auth';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import type { User } from '@auth/core/types';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import type { NextRequest } from 'next/server';

const EXPECTED_PROVIDERS = 3;

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

  const tools = Array.from(new Set<string>(Object.keys(toolProviders.tools)));
  // do we have client-hosted tools?
  if (!toolProviders.isHealthy) {
    return Response.json(
      { status: 'error', message: 'No tools available' },
      { status: 200 },
    );
  }
  let status, message;
  const totalProviders = toolProviders.providers.length;
  if (totalProviders < EXPECTED_PROVIDERS) {
    status = 'warning';
    message = `Only ${totalProviders} of ${EXPECTED_PROVIDERS} expected providers available`;
  } else if (tools.length <= 5) {
    status = 'warning';
    message = `Limited toolset available.`;
  } else {
    status = 'ok';
    message = 'All systems operational';
  }
  return Response.json({ status, message, tools }, { status: 200 });
});
