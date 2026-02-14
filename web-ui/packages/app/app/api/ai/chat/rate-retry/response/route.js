import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { auth } from '@/auth';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { LoggedError, log } from '@compliance-theater/logger';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req) => {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const requestId = searchParams.get('requestId');
        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }
        log((l) => l.info(`Checking retry response for request ${requestId}`));
        const requestExists = await rateLimitQueueManager.checkIfRequestExists(requestId);
        if (!requestExists) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }
        const response = await rateLimitQueueManager.getResponse(requestId);
        if (!response) {
            return NextResponse.json({
                status: 'pending',
                message: 'Request is still being processed, try again later',
                requestId,
            }, { status: 202 });
        }
        await rateLimitQueueManager.removeResponse(requestId);
        if (response.error) {
            return NextResponse.json({
                status: 'error',
                requestId,
                error: response.error,
                processedAt: response.processedAt,
            }, {
                status: response.error.type === 'will_not_retry' ? 410 : 400,
            });
        }
        return NextResponse.json({
            status: 'success',
            requestId,
            response: response.response,
            processedAt: response.processedAt,
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}, {
    buildFallback: {
        status: 'pending',
        message: 'Request is still being processed, try again later',
    },
});
export const POST = wrapRouteRequest(async (req) => {
    try {
        const session = await auth();
        if (!session) {
            return unauthorizedServiceResponse({ req, scopes: ['case-file:read'] });
        }
        const body = await req.json();
        const { requestId } = body;
        if (!requestId) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }
        log((l) => l.info(`Checking retry response for request ${requestId} (POST)`));
        const requestExists = await rateLimitQueueManager.checkIfRequestExists(requestId);
        if (!requestExists) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }
        const response = await rateLimitQueueManager.getResponse(requestId);
        if (!response) {
            return NextResponse.json({
                status: 'pending',
                message: 'Request is still being processed, try again later',
                requestId,
            }, { status: 202 });
        }
        await rateLimitQueueManager.removeResponse(requestId);
        if (response.error) {
            return NextResponse.json({
                status: 'error',
                requestId,
                error: response.error,
                processedAt: response.processedAt,
            }, {
                status: response.error.type === 'will_not_retry' ? 410 : 400,
            });
        }
        return NextResponse.json({
            status: 'success',
            requestId,
            response: response.response,
            processedAt: response.processedAt,
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Error in retry-response API (POST):',
        });
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}, { buildFallback: { status: 'success' } });
//# sourceMappingURL=route.js.map