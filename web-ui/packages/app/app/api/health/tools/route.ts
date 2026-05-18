import { auth } from '@compliance-theater/auth/auth.node';
import { checkChatHealth } from '@/lib/api/health/chat';
import { wrapRouteRequest } from '@compliance-theater/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Returns a structured snapshot of subsystem statuses.
 * Wrapped for unified logging / error semantics.
 */
export const GET = wrapRouteRequest(async () => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { status: 401, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  const chatHealth = await checkChatHealth();

  return NextResponse.json(
    {
      status: chatHealth.status,
      cache: chatHealth.cache,
      queue: chatHealth.queue,
      tools: chatHealth.tools,
    },
    { status: 200 },
  );
});
