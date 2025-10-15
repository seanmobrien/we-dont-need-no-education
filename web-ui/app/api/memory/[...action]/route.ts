import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSessionActive } from '@/lib/site-util/auth';
import { memoryClientFactory } from '@/lib/ai/mem0';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';

type RouteContext = {
  // Next's generated types sometimes make params a Promise (see .next types), so
  // reflect that here by allowing params to be a Promise or the raw object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Promise<any>;
};

export const dynamic = 'force-dynamic';

const HTTP_METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

const sanitizeSegments = (segments: string[] = []): string[] =>
  segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).filter(Boolean);

const resolveMem0Path = (params: RouteContext['params']): string => {
  // params may be a Promise when provided by Next's types; handle that by
  // accepting both Promise and direct object. The caller should await if
  // necessary before calling this helper.
  const rawParams = params as { action?: string[] } | undefined;
  const segments = Array.isArray(rawParams?.action)
    ? rawParams.action
    : rawParams?.action
      ? [rawParams.action as unknown as string]
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

  const rawParams =
    context.params instanceof Promise ? await context.params : context.params;
  const basePath = resolveMem0Path(rawParams ?? undefined);
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
