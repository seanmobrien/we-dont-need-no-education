import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { log } from '../logger/core';

const accessTokenOnRequest: unique symbol = Symbol();

interface RequestWithAccessTokenOverloads {
  (req: NextRequest): string | undefined;
  (req: NextRequest, value: { token: string; providerAccountId: string; }): NextRequest;
}

type RequestWithAccessToken = NextRequest & {
  [accessTokenOnRequest]?: { token: string; providerAccountId: string; };
};

export const withRequestAccessToken: RequestWithAccessTokenOverloads = (
  req: NextRequest,
  value?: { token: string; providerAccountId: string; },
): // any used to support the interface pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any => {
  const withToken = req as RequestWithAccessToken;
  if (value) {
    if (!value.providerAccountId) {
      throw new Error('providerAccountId is required');
    }
    if (!value.token) {
      throw new Error('token is required');
    }
    withToken[accessTokenOnRequest] = value;
    return req;
  }
  return withToken[accessTokenOnRequest]?.token;
};

export const withRequestProviderAccountId = (
  req: NextRequest,
): string | undefined => {
  const withProviderAccountId = req as RequestWithAccessToken;
  return withProviderAccountId[accessTokenOnRequest]?.providerAccountId;
};


export const getAccessToken = async (req: NextRequest) => {
  const ret = withRequestAccessToken(req);
  if (typeof ret === 'string') {
    return ret;
  }
  const session = await auth();
  const sessionUserId = parseInt(session?.user?.id ?? '0', 10);
  let token: string | undefined;
  if (!isNaN(sessionUserId) && sessionUserId > 0) {
    const data = await drizDbWithInit(async (db) => {
      const accountRecord = await db.query.accounts.findFirst({
        where: (accounts, { eq, and }) =>
          and(
            eq(accounts.userId, sessionUserId),
            eq(accounts.provider, 'keycloak'),
          ),
      });
      return accountRecord && accountRecord.accessToken && accountRecord.providerAccountId
        ? { token: accountRecord.accessToken, providerAccountId: accountRecord.providerAccountId }
        : undefined;
    });
    if (data) {
      // Save token and provider account id in request
      withRequestAccessToken(req, data);
      token = data.token;
    }
  }
  return token;
};

export const getProviderAccountId = async (req: NextRequest) => {
  // Try to get as-is
  const ret = withRequestProviderAccountId(req);
  if (typeof ret === 'string') {
    return ret;
  }
  // If not found, calling getAccessToken will populate it
  await getAccessToken(req);
  // Return the provider account id or undefined if getAccessToken found nothing
  return withRequestProviderAccountId(req);
};


export const getValidatedAccessToken = async (
  { req, source }: {
    req: NextRequest;
    source?: string;
  }
): Promise<{ token: string } | { error: NextResponse }> => {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    log((l) =>
      l.warn(`${source ?? 'access-token'}: No access token found in request.`),
    );
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No access token' },
        { status: 401 },
      ),
    };
  }
  return { token: accessToken };
}
