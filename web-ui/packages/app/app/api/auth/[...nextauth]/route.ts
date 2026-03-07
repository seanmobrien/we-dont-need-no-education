import { NextRequest } from 'next/server';
import { handlers } from '@compliance-theater/auth';
import { LikeNextResponse } from '@compliance-theater/types';

type AuthRouteHandler = (req: NextRequest) => Promise<LikeNextResponse>;

export const GET: AuthRouteHandler = (req) =>
    handlers.GET(req);
export const POST: AuthRouteHandler = (req) =>
    handlers.POST(req);
export const dynamic = 'force-dynamic';
