import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { log } from '../logger/core';

const accessTokenOnRequest: unique symbol = Symbol();

interface RequestWithAccessTokenOverloads {
  (req: NextRequest): string | undefined;
  (req: NextRequest, value: string): NextRequest;
}

export const withRequestAccessToken: RequestWithAccessTokenOverloads = (
  req: NextRequest,
  value?: string,
): // any used to support the interface pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any => {
  type RequestWithAccessToken = NextRequest & {
    [accessTokenOnRequest]?: string;
  };
  const withToken = req as RequestWithAccessToken;
  if (value) {
    withToken[accessTokenOnRequest] = value;
    return req;
  }
  return withToken[accessTokenOnRequest];
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
    token = await drizDbWithInit(async (db) => {
      const accountRecord = await db.query.accounts.findFirst({
        where: (accounts, { eq, and }) =>
          and(
            eq(accounts.userId, sessionUserId),
            eq(accounts.provider, 'keycloak'),
          ),
      });
      return accountRecord?.accessToken ?? undefined;
    });
    if (token) {
      withRequestAccessToken(req, token);
    }
  }
  return token;
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
