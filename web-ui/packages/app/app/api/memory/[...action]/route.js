import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSessionActive } from '@/lib/site-util/auth';
import { memoryClientFactory } from '@/lib/ai/mem0';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
export const dynamic = 'force-dynamic';
const HTTP_METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);
const sanitizeSegments = (segments = []) => segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).filter(Boolean);
const resolveMem0Path = (params) => {
    const rawParams = params;
    const segments = Array.isArray(rawParams?.action)
        ? rawParams.action
        : rawParams?.action
            ? [rawParams.action]
            : [];
    const normalized = sanitizeSegments(segments);
    const suffix = normalized.join('/');
    if (!suffix) {
        return `api/v1/`;
    }
    if (suffix === 'docs') {
        return 'docs';
    }
    return `api/v1/${suffix}`;
};
const proxyRequestToMem0 = async (method, request, context) => {
    const sessionWrapper = { session: await auth() };
    if (!isSessionActive(sessionWrapper)) {
        return NextResponse.json({ error: 'Unauthorized', message: 'Active session required.' }, { status: 401 });
    }
    const session = sessionWrapper.session;
    const userId = session.user?.id;
    const normalizedUserId = typeof userId === 'string'
        ? userId
        : typeof userId === 'number'
            ? String(userId)
            : undefined;
    const client = await memoryClientFactory({
        ...(normalizedUserId ? { defaults: { user_id: normalizedUserId } } : {}),
    });
    const rawParams = context.params instanceof Promise ? await context.params : context.params;
    const basePath = resolveMem0Path(rawParams ?? undefined);
    const queryString = request.nextUrl.search;
    const targetPath = queryString ? `${basePath}${queryString}` : basePath;
    const headersToForward = ['content-type', 'accept', 'accept-language'];
    const forwardHeaders = headersToForward.reduce((acc, headerName) => {
        const value = request.headers.get(headerName);
        if (value) {
            acc[headerName] = value;
        }
        return acc;
    }, {});
    let body;
    if (!HTTP_METHODS_WITHOUT_BODY.has(method.toUpperCase())) {
        const hasBody = request.headers.get('content-length') !== null ||
            request.headers.get('transfer-encoding') !== null;
        if (hasBody) {
            const raw = await request.text();
            body = raw.length > 0 ? raw : undefined;
        }
    }
    const result = await client._fetchWithErrorHandling(targetPath, {
        method,
        headers: forwardHeaders,
        ...(body ? { body } : {}),
    });
    return targetPath === 'docs'
        ? new NextResponse(result, {
            headers: { 'Content-Type': 'text/html' },
        })
        : NextResponse.json(result);
};
const createHandler = (method) => wrapRouteRequest(async (request, context) => proxyRequestToMem0(method, request, context));
export const GET = createHandler('GET');
export const POST = createHandler('POST');
export const PUT = createHandler('PUT');
export const PATCH = createHandler('PATCH');
export const DELETE = createHandler('DELETE');
//# sourceMappingURL=route.js.map