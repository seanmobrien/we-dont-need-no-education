/**
 * NodeJS-compatible Session management strategy;
 * full server-side session is pulled from database
 * @module @/lib/auth/session-nodejs
 */

import type { JWT } from '@auth/core/jwt';
import type { Session } from '@auth/core/types';
import { setupSession } from './shared';
import { log } from '@repo/lib-logger/core';
import { decodeToken } from '../utilities';
import { getAccountTokens } from '../server/get-account-tokens';
import { createHash } from 'crypto';
import { LoggedError } from '@/lib/react-util';

const hashFromServer = async (input: string): Promise<string> =>
  createHash('sha256').update(input).digest('hex');

export const session = async ({
  session: sessionFromProps,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> => {
  const session = await setupSession({
    session: sessionFromProps,
    token,
    hash: hashFromServer,
  });
  if (!session?.user?.id) {
    return session;
  }
  try {
    const dbTokens = await getAccountTokens(session.user.id);

    if (dbTokens?.accessToken) {
      // Check for expiry
      const expiresAt = dbTokens.expiresAt;
      if (expiresAt && Date.now() > expiresAt * 1000 && dbTokens.refreshToken) {
        // Token expired, refresh it!
        log((l) =>
          l.info('Session callback: Token expired in DB, refreshing...'),
        );
        const { refreshAccessToken } = await import('../refresh-token');
        const { updateAccountTokens } = await import(
          '../server/update-account-tokens'
        );

        // Construct a temporary token object for refresh
        // Construct a temporary token object for refresh
        const tempToken = {
          access_token: dbTokens.accessToken,
          refresh_token: dbTokens.refreshToken,
          expires_at: expiresAt,
        } as JWT;

        const refreshed = await refreshAccessToken(tempToken);

        if (refreshed.error) {
          session.error = refreshed.error;
        } else {
          // Save new tokens to DB
          await updateAccountTokens(session.user.id, {
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
