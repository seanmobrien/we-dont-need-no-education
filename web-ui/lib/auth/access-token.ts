import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { log } from '../logger/core';
import type {
  NormalizedAccessToken,
  NormalizeAccessTokenOptions,
  RequestWithAccessTokenCache,
  RequestWithAccessTokenOverloads,
  AccessTokenOrRequestOverloadsExt
} from './types';
import { LoggedError } from '../react-util/errors/logged-error';

const accessTokenOnRequest: unique symbol = Symbol();

type RequestWithAccessToken = NextRequest & {
  [accessTokenOnRequest]?: RequestWithAccessTokenCache;
};

export const withRequestTokens = (
  req: NextRequest | undefined,
  value?: RequestWithAccessTokenCache,
): RequestWithAccessTokenCache | undefined => {
  if (!req) { return undefined; }
  const withToken = req as RequestWithAccessToken;
  if (value) {
    if (!value.providerAccountId) {
      throw new Error('providerAccountId is required');
    }
    if (!value.userId) {
      throw new Error('userId is required');
    }
    if (!value.access_token) {
      throw new Error('token is required');
    }
    withToken[accessTokenOnRequest] = {
      ...(withToken[accessTokenOnRequest] ?? {}),
      ...value,
    };
  }
  const ret = withToken[accessTokenOnRequest];
  return ret ? {
    access_token: ret.access_token,
    refresh_token: ret.refresh_token ?? undefined,
    id_token: ret.id_token ?? undefined,
    expires_at: ret.expires_at,
    refresh_expires_at: ret.refresh_expires_at,
    providerAccountId: ret.providerAccountId,
    userId: ret.userId,
  } : undefined;
};


export const withRequestAccessToken: RequestWithAccessTokenOverloads = (
  req: NextRequest | undefined,
  value?: RequestWithAccessTokenCache,
)
  // Any necessary to support the interface pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : any => withRequestTokens(req, value)?.access_token;


export const withRequestProviderAccountId = (req: NextRequest | undefined) =>
  withRequestTokens(req)?.providerAccountId;


export const getRequestTokens = async (req: NextRequest | undefined) => {
  const ret = withRequestTokens(req);
  if (!!ret) {
    return ret;
  }
  const session = await auth();
  const sessionUserId = parseInt(session?.user?.id ?? '0', 10);
  let token: RequestWithAccessTokenCache | undefined;
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
        ? {
          access_token: accountRecord.accessToken,
          refresh_token: accountRecord.refreshToken ?? undefined,
          id_token: accountRecord.idToken ?? undefined,
          expires_at: accountRecord.expiresAt ? Number(accountRecord.expiresAt) : Date.now(),
          refresh_expires_at: accountRecord.refreshExpiresAt ? Number(accountRecord.refreshExpiresAt) : Date.now(),
          providerAccountId: accountRecord.providerAccountId,
          userId: sessionUserId,
        }
        : undefined;
    });
    if (data) {
      // Save tokens and provider account id in request
      withRequestTokens(req, data);
      token = data;
    }
  }
  return token;
};

export const getAccessToken = async (req: NextRequest | undefined) =>
  (await getRequestTokens(req))?.access_token;

export const getProviderAccountId = async (req: NextRequest | undefined) =>
  (await getRequestTokens(req))?.providerAccountId;

export const getValidatedAccessToken = async (
  { req, source }: {
    req: NextRequest | undefined;
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
export const normalizedAccessToken: AccessTokenOrRequestOverloadsExt = async (
  userAccessToken: string | NextRequest | undefined,
  options?: NormalizeAccessTokenOptions
): Promise<NormalizedAccessToken | undefined> => {
  const { skipUserId = false } = options ?? {};
  try {
    if (userAccessToken) {
      // Handle incoming access tokens
      if (typeof userAccessToken === 'string') {
        // This gets tricky - the user id in the token is the keycloak id, not the user_id...so we'll
        // need to pull it out of session, while allowing the caller to skip this step if they don't
        // need the user_id.
        let thisUserId: number;
        if (skipUserId === true) {
          thisUserId = 0;
        } else {
          const { user: { id: userIdFromSession } = { id: null } } = await auth() ?? { user: { id: null } };
          const parsedUserId = parseInt(userIdFromSession ?? '', 10);
          if (!isNaN(parsedUserId) && isFinite(parsedUserId)) {
            thisUserId = parsedUserId;
          } else {
            thisUserId = 0;
          }
        }
        return {
          accessToken: userAccessToken,
          userId: thisUserId,
        };
      }
      // Otherwise pull token and user id from request with database fallback
      const { access_token, userId: userIdFromRequest } = await getRequestTokens(userAccessToken) ?? {};
      return access_token ? {
        accessToken: access_token,
        userId: userIdFromRequest ?? 0,
      } : undefined;
    }
    const { access_token, userId: userIdFromRequest } = await getRequestTokens(undefined) ?? {};
    return access_token ? {
      accessToken: access_token,
      userId: userIdFromRequest ?? 0,
    } : undefined;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'normalizedAccessToken',
      msg: 'Failed to normalize access token',
    });
  }
};
