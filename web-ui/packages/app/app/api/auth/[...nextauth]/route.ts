import { handlers } from '@compliance-theater/auth';
import type { AuthNextRequest } from '@compliance-theater/types/next-auth';

type AuthRouteHandler = (req: AuthNextRequest) => Promise<Response>;

export const GET: AuthRouteHandler = (req) =>
    handlers.GET(req);
export const POST: AuthRouteHandler = (req) =>
    handlers.POST(req);

export const dynamic = 'force-dynamic';
