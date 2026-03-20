import { handlers } from '@compliance-theater/auth/server';
import type { NextRequest } from 'next/server';

type AuthRouteHandler = (req: NextRequest) => Promise<Response>;

export const GET: AuthRouteHandler = (req) =>
    handlers.GET(req);
export const POST: AuthRouteHandler = (req) =>
    handlers.POST(req);

export const dynamic = 'force-dynamic';
