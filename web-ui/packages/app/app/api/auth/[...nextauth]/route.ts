import { handlers } from '@compliance-theater/auth';

type AuthRouteHandler = (req: Request) => Promise<Response>;

export const GET: AuthRouteHandler = (req) =>
    handlers.GET(req as Parameters<typeof handlers.GET>[0]);
export const POST: AuthRouteHandler = (req) =>
    handlers.POST(req as Parameters<typeof handlers.POST>[0]);
export const dynamic = 'force-dynamic';
