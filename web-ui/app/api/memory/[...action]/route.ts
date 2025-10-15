import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSessionActive } from '@/lib/site-util/auth';
import { memoryClientFactory } from '@/lib/ai/mem0';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';

type RouteContext = {
  params: {
    action?: string[]; // Rest segments that determine the downstream Mem0 endpoint
  };
};

export const dynamic = 'force-dynamic';

const HTTP_METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

const sanitizeSegments = (segments: string[] = []): string[] =>
  segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).filter(Boolean);

const resolveMem0Path = (params: RouteContext['params']): string => {
  const segments = Array.isArray(params?.action)
    ? params?.action
    : params?.action
      ? [params.action]
      : [];
  const normalized = sanitizeSegments(segments);
  const suffix = normalized.join('/');
  return suffix ? `api/v1/${suffix}` : 'api/v1/';
};

const proxyRequestToMem0 = async (
  method: string,
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> => {
  const sessionWrapper = { session: await auth() };
  if (!isSessionActive(sessionWrapper)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Active session required.' },
      { status: 401 },
    );
  }

  const session = sessionWrapper.session;

  const userId = session.user?.id;
  const normalizedUserId =
    typeof userId === 'string'
      ? userId
      : typeof userId === 'number'
        ? String(userId)
        : undefined;

  const client = await memoryClientFactory({
    ...(normalizedUserId ? { defaults: { user_id: normalizedUserId } } : {}),
  });

  const basePath = resolveMem0Path(context.params ?? {});
  const queryString = request.nextUrl.search;
  const targetPath = queryString ? `${basePath}${queryString}` : basePath;

  const headersToForward = ['content-type', 'accept', 'accept-language'];
  const forwardHeaders = headersToForward.reduce<Record<string, string>>(
    (acc, headerName) => {
      const value = request.headers.get(headerName);
      if (value) {
        acc[headerName] = value;
      }
      return acc;
    },
    {},
  );

  let body: string | undefined;
  if (!HTTP_METHODS_WITHOUT_BODY.has(method.toUpperCase())) {
    const hasBody =
      request.headers.get('content-length') !== null ||
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

  return NextResponse.json(result);
};

const createHandler = (method: string) =>
  wrapRouteRequest(
    async (
      request: NextRequest,
      context: RouteContext,
    ): Promise<NextResponse> => proxyRequestToMem0(method, request, context),
  );

export const GET = createHandler('GET');
export const POST = createHandler('POST');
export const PUT = createHandler('PUT');
export const PATCH = createHandler('PATCH');
export const DELETE = createHandler('DELETE');

export const PUSH = createHandler('PATCH');
