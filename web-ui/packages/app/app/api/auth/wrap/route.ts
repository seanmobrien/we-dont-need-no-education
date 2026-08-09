import { encodeJwt } from '@compliance-theater/auth-compat/runtime';
import type { JWT } from '@compliance-theater/auth-compat';
import { env } from '@compliance-theater/env';
import {
  extractTokenDetails,
  SessionTokenKey,
} from '@compliance-theater/auth/lib/utilities';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AUTH_SESSION_MAX_AGE_SECONDS = 30 * 60;
const WRAPPED_ACCESS_TOKEN_CLAIM = 'ct_token_wrapper';
const WRAPPED_ACCESS_TOKEN_CLAIM_VALUE = 'keycloak-access-token';

const toEpochSeconds = (epochTimeSecondsOrMilliseconds: number): number => {
  return epochTimeSecondsOrMilliseconds > 1_000_000_000_000
    ? Math.floor(epochTimeSecondsOrMilliseconds / 1000)
    : Math.floor(epochTimeSecondsOrMilliseconds);
};

const getSubject = (token: JWT | null | undefined): string | undefined => {
  const subjectCandidate =
    (token as { subject?: unknown } | undefined)?.subject ?? token?.sub;
  return typeof subjectCandidate === 'string' && subjectCandidate.trim().length > 0
    ? subjectCandidate
    : undefined;
};

const getNumericAccountId = (token: JWT | null | undefined): number | undefined => {
  const candidate =
    (token as { account_id?: unknown; user_id?: unknown } | undefined)?.account_id ??
    (token as { user_id?: unknown } | undefined)?.user_id;
  const parsed =
    typeof candidate === 'number' ? candidate : parseInt(String(candidate ?? ''), 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
};

const resolveExpiryWindow = (token: JWT, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const sourceTokenExpiresAt =
    typeof token.exp === 'number' ? toEpochSeconds(token.exp) : undefined;
  const sessionExpiresAt = nowSeconds + AUTH_SESSION_MAX_AGE_SECONDS;
  const wrappedExpiresAt = sourceTokenExpiresAt
    ? Math.min(sourceTokenExpiresAt, sessionExpiresAt)
    : sessionExpiresAt;

  return {
    sourceTokenExpiresAt,
    sessionExpiresAt,
    wrappedExpiresAt,
  };
};

const buildWrappedToken = ({
  sourceToken,
  bearerToken,
  wrappedExpiresAt,
}: {
  sourceToken: JWT;
  bearerToken: string;
  wrappedExpiresAt: number;
}): JWT => {
  const subject = getSubject(sourceToken);
  const numericAccountId = getNumericAccountId(sourceToken);
  const idCandidate = numericAccountId ?? sourceToken.id ?? subject ?? sourceToken.email;
  const preferredUsername = (sourceToken as { preferred_username?: unknown }).preferred_username;

  return {
    id: typeof idCandidate === 'string' || typeof idCandidate === 'number'
      ? idCandidate
      : subject,
    sub: subject,
    subject,
    email: typeof sourceToken.email === 'string' ? sourceToken.email : undefined,
    name:
      typeof sourceToken.name === 'string'
        ? sourceToken.name
        : typeof preferredUsername === 'string'
          ? preferredUsername
          : typeof sourceToken.email === 'string'
            ? sourceToken.email
            : subject,
    account_id: numericAccountId,
    user_id: numericAccountId,
    resource_access: sourceToken.resource_access,
    authorization: sourceToken.authorization,
    [WRAPPED_ACCESS_TOKEN_CLAIM]: WRAPPED_ACCESS_TOKEN_CLAIM_VALUE,
    access_token: bearerToken,
    expires_at: wrappedExpiresAt,
    exp: wrappedExpiresAt,
  } as JWT;
};

const unauthorized = (error: string, status = 401): NextResponse => {
  return NextResponse.json({ success: false, error }, { status });
};

const getSessionCookieNames = (cookieName: string): string[] => {
  const alternateName = cookieName.startsWith('__Secure-')
    ? cookieName.replace('__Secure-', '')
    : `__Secure-${cookieName}`;
  return Array.from(new Set([cookieName, alternateName]));
};

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const tokenDetails = await extractTokenDetails(req);
  if (tokenDetails.source !== 'verified-bearer' || !tokenDetails.token || !tokenDetails.verifiedBearerToken) {
    return unauthorized('A verified external Keycloak bearer token is required.');
  }

  const { sourceTokenExpiresAt, sessionExpiresAt, wrappedExpiresAt } =
    resolveExpiryWindow(tokenDetails.token);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (wrappedExpiresAt <= nowSeconds) {
    return unauthorized('The source token is expired.');
  }

  const wrappedToken = buildWrappedToken({
    sourceToken: tokenDetails.token,
    bearerToken: tokenDetails.verifiedBearerToken,
    wrappedExpiresAt,
  });
  const cookieName = SessionTokenKey();
  const authSecret = process.env.AUTH_SECRET || env('AUTH_SECRET');
  const wrappedJwt = await encodeJwt({
    token: wrappedToken,
    secret: authSecret,
    salt: cookieName,
    maxAge: Math.max(1, wrappedExpiresAt - nowSeconds),
  });
  const expiresAtIso = new Date(wrappedExpiresAt * 1000).toISOString();
  const sourceTokenExpiresAtIso = sourceTokenExpiresAt
    ? new Date(sourceTokenExpiresAt * 1000).toISOString()
    : null;
  const sessionExpiresAtIso = new Date(sessionExpiresAt * 1000).toISOString();

  const response = NextResponse.json({
    success: true,
    token: wrappedJwt,
    cookieName,
    expiresAt: expiresAtIso,
    sourceTokenExpiresAt: sourceTokenExpiresAtIso,
    sessionExpiresAt: sessionExpiresAtIso,
    session: {
      cookieName,
      cookieNames: getSessionCookieNames(cookieName),
      expiresAt: expiresAtIso,
      sourceTokenExpiresAt: sourceTokenExpiresAtIso,
      sessionExpiresAt: sessionExpiresAtIso,
    },
  });
  response.cookies.set({
    name: cookieName,
    value: wrappedJwt,
    httpOnly: true,
    secure: cookieName.startsWith('__Secure-'),
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAtIso),
  });

  return response;
};
