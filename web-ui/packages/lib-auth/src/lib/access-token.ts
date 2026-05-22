import { NextResponse } from 'next/server';
import { auth } from '../auth.node';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { log } from '@compliance-theater/logger';
import { extractToken } from './utilities/extract-token';
import type { LikeNextRequest } from '@compliance-theater/types/lib/nextjs/types/like-nextrequest';
import type {
  NormalizedAccessToken,
  NormalizeAccessTokenOptions,
  RequestWithAccessTokenCache,
  RequestWithAccessTokenOverloads,
  AccessTokenOrRequestOverloadsExt,
} from './types';
import { LoggedError } from '@compliance-theater/logger';
import type { JWT } from '@compliance-theater/auth-compat';

const accessTokenOnRequest: unique symbol = Symbol();

type RequestWithAccessToken = LikeNextRequest & {
  [accessTokenOnRequest]?: RequestWithAccessTokenCache;
};

type AuthSessionLike = {
  user?: {
    id?: string | number | null;
    account_id?: string | number | null;
    accountId?: string | number | null;
    subject?: string | null;
  } | null;
} | null;

type ResolvedSessionIdentity = {
  userId: number;
  providerAccountId?: string;
};

const resolveSessionUserId = (session: AuthSessionLike): number => {
  const candidates = [
    session?.user?.account_id,
    session?.user?.accountId,
    session?.user?.id,
  ];

  for (const candidate of candidates) {
    const parsed =
      typeof candidate === 'number'
        ? candidate
        : parseInt(String(candidate ?? ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

const resolveSessionIdentity = (
  session: AuthSessionLike,
): ResolvedSessionIdentity => {
  const userId = resolveSessionUserId(session);
  const nonNumericId = session?.user?.id;
  const providerAccountIdCandidates = [
    session?.user?.subject,
    typeof nonNumericId === 'string' && nonNumericId.trim().length > 0
      ? nonNumericId
      : undefined,
  ];
  const providerAccountId = providerAccountIdCandidates.find(
    (candidate) =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  ) ?? undefined;

  return {
    userId,
    providerAccountId,
  };
};

const resolveTokenIdentity = (
  token: JWT | null | undefined,
): ResolvedSessionIdentity => {
  const accountIdCandidate = (token as { account_id?: unknown } | undefined)
    ?.account_id;
  const idCandidate = (token as { id?: unknown } | undefined)?.id;
  const userIdCandidates = [accountIdCandidate, idCandidate];

  let userId = 0;
  for (const candidate of userIdCandidates) {
    const parsed =
      typeof candidate === 'number'
        ? candidate
        : parseInt(String(candidate ?? ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      userId = parsed;
      break;
    }
  }

  const subFromToken =
    (token as { subject?: unknown } | undefined)?.subject ??
    (token as { sub?: unknown } | undefined)?.sub;
  const providerAccountId =
    typeof subFromToken === 'string' && subFromToken.trim().length > 0
      ? subFromToken
      : typeof idCandidate === 'string' && idCandidate.trim().length > 0
        ? idCandidate
        : undefined;

  return {
    userId,
    providerAccountId,
  };
};

const mapExtractedTokenToRequestTokens = (
  token: JWT | null | undefined,
): RequestWithAccessTokenCache | undefined => {
  const accessToken =
    typeof token?.access_token === 'string' && token.access_token.trim().length > 0
      ? token.access_token
      : undefined;
  if (!accessToken) {
    return undefined;
  }

  const { userId, providerAccountId } = resolveTokenIdentity(token);
  if (!providerAccountId) {
    return undefined;
  }

  const expiresAtCandidate =
    typeof token?.expires_at === 'number'
      ? token.expires_at
      : typeof token?.exp === 'number'
        ? token.exp
        : undefined;

  return {
    access_token: accessToken,
    refresh_token:
      typeof token?.refresh_token === 'string' ? token.refresh_token : undefined,
    id_token:
      typeof token?.idToken === 'string' ? token.idToken : undefined,
    expires_at: expiresAtCandidate,
    refresh_expires_at: undefined,
    providerAccountId,
    userId,
  };
};

const mapAccountRecordToRequestTokens = (
  accountRecord:
    | {
        accessToken: string | null;
        refreshToken: string | null;
        idToken: string | null;
        expiresAt: number | string | null;
        refreshExpiresAt: number | string | null;
        providerAccountId: string;
        userId?: number;
      }
    | undefined,
  fallbackUserId = 0,
): RequestWithAccessTokenCache | undefined => {
  if (
    !accountRecord ||
    !accountRecord.accessToken ||
    !accountRecord.providerAccountId
  ) {
    return undefined;
  }

  const resolvedUserId =
    typeof accountRecord.userId === 'number' &&
    isFinite(accountRecord.userId) &&
    accountRecord.userId > 0
      ? accountRecord.userId
      : fallbackUserId;
  if (!resolvedUserId || !isFinite(resolvedUserId) || resolvedUserId <= 0) {
    return undefined;
  }

  return {
    access_token: accountRecord.accessToken,
    refresh_token: accountRecord.refreshToken ?? undefined,
    id_token: accountRecord.idToken ?? undefined,
    expires_at: accountRecord.expiresAt
      ? Number(accountRecord.expiresAt)
      : Date.now(),
    refresh_expires_at: accountRecord.refreshExpiresAt
      ? Number(accountRecord.refreshExpiresAt)
      : Date.now(),
    providerAccountId: accountRecord.providerAccountId,
    userId: resolvedUserId,
  };
};

const getHeader = (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const lowerCaseName = name.toLowerCase();
  const matchedEntry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === lowerCaseName,
  );
  if (!matchedEntry) {
    return undefined;
  }

  const value = matchedEntry[1];
  return Array.isArray(value) ? value[0] : value;
};

const getAuthorizationBearerToken = (
  req: LikeNextRequest | undefined,
): string | undefined => {
  if (!req) {
    return undefined;
  }

  const authorizationHeader = getHeader(
    req.headers as Headers | Record<string, string | string[] | undefined>,
    'authorization',
  )?.trim();
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return undefined;
  }

  return token;
};

export const withRequestTokens = (
  req: LikeNextRequest | undefined,
  value?: RequestWithAccessTokenCache
): RequestWithAccessTokenCache | undefined => {
  if (!req) {
    return undefined;
  }
  const withToken = req as RequestWithAccessToken;
  if (value) {
    if (!value.providerAccountId) {
      throw new Error('providerAccountId is required');
    }
    if (!isFinite(value.userId) || value.userId < 0) {
      throw new Error('userId must be a non-negative finite number');
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
  return ret
    ? {
        access_token: ret.access_token,
        refresh_token: ret.refresh_token ?? undefined,
        id_token: ret.id_token ?? undefined,
        expires_at: ret.expires_at,
        refresh_expires_at: ret.refresh_expires_at,
        providerAccountId: ret.providerAccountId,
        userId: ret.userId,
      }
    : undefined;
};

export const withRequestAccessToken: RequestWithAccessTokenOverloads = (
  req: LikeNextRequest | undefined,
  value?: RequestWithAccessTokenCache
): // Any necessary to support the interface pattern
any => withRequestTokens(req, value)?.access_token;

export const withRequestProviderAccountId = (req: LikeNextRequest | undefined) =>
  withRequestTokens(req)?.providerAccountId;

export const getRequestTokens = async (req: LikeNextRequest | undefined) => {
  const ret = withRequestTokens(req);
  if (ret) {
    return ret;
  }
  let session: AuthSessionLike = null;
  try {
    session = req
      ? ((await auth(req as never)) as AuthSessionLike)
      : ((await auth()) as AuthSessionLike);
  } catch {
    try {
      session = (await auth()) as AuthSessionLike;
    } catch {
      session = null;
    }
  }
  const sessionIdentity = resolveSessionIdentity(session);
  let token: RequestWithAccessTokenCache | undefined;
  if (!isNaN(sessionIdentity.userId) && sessionIdentity.userId > 0) {
    const data = await drizDbWithInit(async (db) => {
      const accountRecord = await db.query.accounts.findFirst({
        where: (accounts, { eq, and }) =>
          and(
            eq(accounts.userId, sessionIdentity.userId),
            eq(accounts.provider, 'keycloak')
          ),
      });
      return mapAccountRecordToRequestTokens(
        accountRecord,
        sessionIdentity.userId,
      );
    });
    if (data) {
      // Save tokens and provider account id in request
      withRequestTokens(req, data);
      token = data;
    }
  }
  if (!token && sessionIdentity.providerAccountId) {
    const data = await drizDbWithInit(async (db) => {
      const accountRecord = await db.query.accounts.findFirst({
        where: (accounts, { eq, and }) =>
          and(
            eq(accounts.providerAccountId, sessionIdentity.providerAccountId!),
            eq(accounts.provider, 'keycloak')
          ),
      });
      return mapAccountRecordToRequestTokens(accountRecord);
    });
    if (data) {
      withRequestTokens(req, data);
      token = data;
    }
  }
  if (!token && req) {
    let extracted: JWT | null = null;
    try {
      extracted = await extractToken(req as unknown as Request);
    } catch {
      extracted = null;
    }

    const directExtractedToken = mapExtractedTokenToRequestTokens(extracted);
    if (directExtractedToken) {
      withRequestTokens(req, directExtractedToken);
      token = directExtractedToken;
    }

    const tokenIdentity = resolveTokenIdentity(extracted);
    if (!token && !isNaN(tokenIdentity.userId) && tokenIdentity.userId > 0) {
      const data = await drizDbWithInit(async (db) => {
        const accountRecord = await db.query.accounts.findFirst({
          where: (accounts, { eq, and }) =>
            and(
              eq(accounts.userId, tokenIdentity.userId),
              eq(accounts.provider, 'keycloak')
            ),
        });
        return mapAccountRecordToRequestTokens(
          accountRecord,
          tokenIdentity.userId,
        );
      });
      if (data) {
        withRequestTokens(req, data);
        token = data;
      }
    }

    if (!token && tokenIdentity.providerAccountId) {
      const data = await drizDbWithInit(async (db) => {
        const accountRecord = await db.query.accounts.findFirst({
          where: (accounts, { eq, and }) =>
            and(
              eq(accounts.providerAccountId, tokenIdentity.providerAccountId!),
              eq(accounts.provider, 'keycloak')
            ),
        });
        return mapAccountRecordToRequestTokens(accountRecord);
      });
      if (data) {
        withRequestTokens(req, data);
        token = data;
      }
    }
  }
  return token;
};

export const getAccessToken = async (req: LikeNextRequest | undefined) =>
  getAuthorizationBearerToken(req) ?? (await getRequestTokens(req))?.access_token;

export const getProviderAccountId = async (req: LikeNextRequest | undefined) =>
  (await getRequestTokens(req))?.providerAccountId;

export const getValidatedAccessToken = async ({
  req,
  source,
}: {
  req: LikeNextRequest | undefined;
  source?: string;
}): Promise<{ token: string } | { error: NextResponse }> => {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    log((l) =>
      l.warn(`${source ?? 'access-token'}: No access token found in request.`)
    );
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - No access token' },
        { status: 401 }
      ),
    };
  }
  return { token: accessToken };
};
export const normalizedAccessToken: AccessTokenOrRequestOverloadsExt = async (
  userAccessToken: string | LikeNextRequest | undefined,
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
          let userIdFromSession: number = 0;
          try {
            const fromSession = (await auth()) as AuthSessionLike;
            userIdFromSession = resolveSessionUserId(fromSession);
          } catch {
            userIdFromSession = 0;
          }
          thisUserId = !isNaN(userIdFromSession) && isFinite(userIdFromSession)
            ? userIdFromSession
            : 0;
        }
        return {
          accessToken: userAccessToken,
          userId: thisUserId,
        };
      }
      // Otherwise pull token and user id from request with database fallback
      const bearerTokenFromRequest = getAuthorizationBearerToken(userAccessToken);
      if (bearerTokenFromRequest) {
        return {
          accessToken: bearerTokenFromRequest,
          userId: 0,
        };
      }
      const { access_token, userId: userIdFromRequest } =
        (await getRequestTokens(userAccessToken)) ?? {};
      return access_token
        ? {
            accessToken: access_token,
            userId: userIdFromRequest ?? 0,
          }
        : undefined;
    }
    const { access_token, userId: userIdFromRequest } =
      (await getRequestTokens(undefined)) ?? {};
    return access_token
      ? {
          accessToken: access_token,
          userId: userIdFromRequest ?? 0,
        }
      : undefined;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'normalizedAccessToken',
      msg: 'Failed to normalize access token',
    });
  }
};
