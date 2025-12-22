import type { JWT } from '@auth/core/jwt';
import type { Account } from '@auth/core/types';
import type { NextAuthUserWithAccountId } from './types';
import type { AdapterUser } from '@auth/core/adapters';
import { decodeToken } from './utilities';
import { log } from '../logger';
import { refreshAccessToken } from './refresh-token';
import { isRunningOnEdge, isRunningOnServer } from '@/lib/site-util/env';

/**
 * JWT callback used by NextAuth to shape the JWT sent to the client and stored
 * in cookies. This module contains a single exported `jwt` function which acts
 * as the NextAuth `jwt` callback. It is responsible for ensuring our custom
 * application fields (notably `account_id`) are copied from the authenticated
 * user object into the JWT so they are available in subsequent requests.
 *
 * Rationale:
 * - NextAuth executes this callback whenever a session is created or updated.
 * - The `token` parameter is the current JWT payload and will be returned
 *   (possibly mutated) to be serialized into the cookie.
 * - The `user` parameter is provided only on sign-in (or when the provider
 *   returns a user object). We use it to copy app-specific fields into `token`.
 *
 * Security: Only copy values that are safe to send to the client. `account_id`
 * is considered safe application metadata (non-secret numeric id) but avoid
 * copying sensitive information into the JWT.
 */
export const jwt = async ({
  token,
  user,
  account,
}: {
  /**
   * The JWT payload (mutable). Fields added here are serialized and sent to
   * the client. Use `token` to read or write values persisted in the session
   * cookie.
   */
  token: JWT;
  /**
   * The user object returned by the authentication provider during sign-in.
   * - When present, it can be an application-extended `NextAuthUserWithAccountId`
   *   (our credentials provider sets `account_id`) or a generic `AdapterUser`.
   * - It is `undefined` for subsequent callback invocations where only the
   *   token is being refreshed/read.
   */
  user?: NextAuthUserWithAccountId | AdapterUser | null;
  /**
   * The account object associated with the user sign-in. Typically
   * used to access provider-specific tokens.
   */
  account?: Account | null;
}) => {
  // 1. Initial Sign-In: Update token with account data
  if (account && user) {
    const expiresIn = typeof account.expires_in === 'number' ? account.expires_in : 0;
    // Store tokens and expiry
    token.access_token = account.access_token;
    token.refresh_token = account.refresh_token;
    token.expires_at = Math.floor(Date.now() / 1000) + expiresIn;
    token.idToken = account.id_token;
  }

  // When a user is present (typically during sign-in), copy canonical ids
  // and any application-specific metadata we want available in the JWT.
  if (user) {
    // Canonical NextAuth id - always copy this so token consumers can identify
    // the authenticated principal without needing to fetch user records.
    token.id = user.id;

    // Our CredentialsProvider sets `account_id` on the user when available.
    // We only copy it when the property exists and is truthy to avoid
    // introducing `undefined`/`null` values into the token shape.
    //
    // Note: `account_id` is treated as non-sensitive application metadata.
    if ('account_id' in user && !!user.account_id) {
      token.account_id = user.account_id;
    }

    if (account?.access_token) {
      try {
        // Decode JWT payload using jose library via utility function
        // Note: verify=false means no signature validation (decode only)
        // For signature validation, set verify=true
        const accessTokenPayload = (await decodeToken({
          token: account.access_token,
          verify: true,
        })) as {
          account_id?: number;
          resource_access?: { [key: string]: string[] };
        };

        if (accessTokenPayload?.account_id) {
          if (!token.account_id) {
            token.account_id = accessTokenPayload.account_id;
          }
        }
        if (accessTokenPayload.resource_access) {
          token.resource_access = {
            ...accessTokenPayload.resource_access,
            ...token.resource_access,
          };
        }
      } catch (decodeError) {
        // Log but don't throw - gracefully handle invalid JWT format
        log((l) =>
          l.warn('Failed to decode access_token JWT payload:', decodeError),
        );
      }
    }
  }

  // 2. Token Rotation Logic
  // If token has expired (and we have specific expiry set), try to refresh
  if (token.expires_at && Date.now() > (Number(token.expires_at) * 1000)) {
    if (!token.refresh_token) {
      log(l => l.warn('Token expired but no refresh_token available'));
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    try {
      const refreshedToken = await refreshAccessToken(token);

      if (refreshedToken.error) {
      }

      // Sync to Database if on Server (Node.js)
      if (isRunningOnServer() && !isRunningOnEdge()) {
        // Fire and forget - update valid logic
        (async () => {
          try {
            // Dynamic import to avoid bundling server code in Edge
            const { updateAccountTokens } = await import('./server/update-account-tokens');
            // token.id is mapped to user.id which is the internal user ID
            const userId = Number(token.id);
            if (userId) {
              await updateAccountTokens(userId, {
                accessToken: refreshedToken.access_token,
                refreshToken: refreshedToken.refresh_token,
                expiresAt: Number(refreshedToken.expires_at ?? refreshedToken.exp),
                idToken: refreshedToken.idToken
              });
            }
          } catch (e) {
            log(l => l.error('Failed to sync refreshed tokens to DB', e));
          }
        })();
      }

      return refreshedToken;
    } catch (refreshErr) {
      log(l => l.error('Unexpected error refreshing token', refreshErr));
      return { ...token, error: 'RefreshAccessTokenError' };
    }
  }

  // Always return the (possibly mutated) token. NextAuth will serialize this
  // value and include it in the session cookie / client-side JWT.
  return token;
};
