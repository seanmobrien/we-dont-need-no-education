/**
 * NodeJS-compatible Session management strategy;
 * full server-side session is pulled from database
 * @module @compliance-theater/auth/session-nodejs
 */

import type { JWT, Session } from '@compliance-theater/auth-compat';
import { setupSession } from './shared';
import { log } from '@compliance-theater/logger/core';
import { decodeToken } from '../utilities';
import { getAccountTokens } from '../server/get-account-tokens';
import { createHash } from 'crypto';
import { LoggedError } from '@compliance-theater/logger';
import { createCachedModuleLoader } from '../runtime-loader';

type SessionIdentityLike = Session & {
  user?: Session['user'] & {
    accountId?: string | number | null;
    account_id?: string | number | null;
    subject?: string | null;
  };
};

type AccountTokenIdentity = {
  userId?: number;
  providerAccountId?: string;
};

const resolveSessionAccountTokenIdentity = (
  session: SessionIdentityLike,
): AccountTokenIdentity => {
  const user = session.user;
  const userIdCandidates = [user?.account_id, user?.accountId, user?.id];

  let userId: number | undefined;
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

  const providerAccountId =
    [
      user?.subject,
      typeof user?.id === 'string' && user.id.trim().length > 0
        ? user.id
        : undefined,
    ].find(
      (candidate) =>
        typeof candidate === 'string' && candidate.trim().length > 0,
    ) ?? undefined;

  return {
    ...(userId ? { userId } : {}),
    ...(providerAccountId ? { providerAccountId } : {}),
  };
};

const hashFromServer = async (input: string): Promise<string> =>
  createHash('sha256').update(input).digest('hex');

const loadRefreshTokenModule = createCachedModuleLoader(() =>
  import('../refresh-token')
);
const loadUpdateAccountTokensModule = createCachedModuleLoader(() =>
  import('../server/update-account-tokens')
);

export const session = async ({
  session: sessionFromProps,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  const session = (await setupSession({
    session: sessionFromProps,
    token,
    hash: hashFromServer,
  })) as SessionIdentityLike;
  const accountTokenIdentity = resolveSessionAccountTokenIdentity(session);
  if (!accountTokenIdentity.userId && !accountTokenIdentity.providerAccountId) {
    return session;
  }
  try {
    const dbTokens = await getAccountTokens(accountTokenIdentity);

    if (dbTokens?.accessToken) {
      // Check for expiry
      const expiresAt = dbTokens.expiresAt;
      if (expiresAt && Date.now() > expiresAt * 1000 && dbTokens.refreshToken) {
        // Token expired, refresh it!
        log((l) =>
          l.info('Session callback: Token expired in DB, refreshing...')
        );
        const { refreshAccessToken } = await loadRefreshTokenModule();
        const { updateAccountTokens } = await loadUpdateAccountTokensModule();

        // Construct a temporary token object for refresh
        // Construct a temporary token object for refresh
        const tempToken = {
          access_token: dbTokens.accessToken,
          refresh_token: dbTokens.refreshToken,
          expires_at: expiresAt,
        } as JWT;

        const refreshed = await refreshAccessToken(tempToken);

        if (refreshed.error) {
          session.error = String(refreshed.error);
        } else {
          // Save new tokens to DB
          await updateAccountTokens(accountTokenIdentity, {
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            expiresAt: Number(refreshed.expires_at ?? 0),
            idToken: refreshed.idToken,
          });

          // Use new access token
          const decodedNew = await decodeToken({
            token: refreshed.access_token!,
            verify: false,
          });
          if (decodedNew?.resource_access) {
            session.resource_access = {
              ...decodedNew.resource_access,
              ...session.resource_access,
            };
          }
        }
      } else {
        // Valid token from DB. Ensure resource_access is up to date if not in JWT
        if (!session.resource_access) {
          const decoded = await decodeToken({
            token: dbTokens.accessToken,
            verify: false,
          });
          if (decoded?.resource_access) {
            session.resource_access =
              decoded.resource_access as Session['resource_access'];
          }
        }
      }
    }
  } catch (dbError) {
    LoggedError.isTurtlesAllTheWayDownBaby(dbError, {
      log: true,
      source: 'authjs:session.sync-db-tokens',
    });
  }
  return session;
};
