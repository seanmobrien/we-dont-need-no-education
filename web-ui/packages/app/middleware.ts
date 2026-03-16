import type { NextRequest } from 'next/server';

import { auth } from '@compliance-theater/auth/server';

import { ensureEdgeDiBootstrap } from '@/lib/bootstrap/di/browser';

export const config = {
  matcher: [
    '/((?!api/auth/|api/health(?!/tools)|\\.well-known/|api/chat/rate-retry|_next/static|_next/image|static|auth(?:/|$)|privacy|terms|favicon\\.ico|(?:4|5)\\d{2}).*)',
  ],
};

export const middleware = async (...args: [NextRequest, ...unknown[]]) => {
  ensureEdgeDiBootstrap();
  return await (auth as unknown as (...innerArgs: [NextRequest, ...unknown[]]) => Promise<Response | undefined> | Response | undefined)(...args);
};

