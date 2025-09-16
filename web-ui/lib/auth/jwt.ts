import { JWT } from 'next-auth/jwt';
import { NextAuthUserWithAccountId } from './types';
import { AdapterUser } from '@auth/core/adapters';

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
}) => {
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
  }

  // Always return the (possibly mutated) token. NextAuth will serialize this
  // value and include it in the session cookie / client-side JWT.
  return token;
};
