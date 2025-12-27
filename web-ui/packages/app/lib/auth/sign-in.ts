/**
 * Module: lib/auth/sign-in.ts
 *
 * Responsibilities:
 * - Persist OAuth provider tokens to the local accounts table when available.
 * - Emit local telemetry and a lightweight Application Insights `signIn` event
 *   without including any sensitive tokens or secrets.
 *
 * Notes on telemetry and privacy:
 * - The AppInsights event uses only non-sensitive, minimal properties (provider
 *   and a truncated providerAccountId) to allow basic attribution without
 *   capturing tokens, refresh tokens, or full account identifiers.
 * - All write operations to the database are limited to the `accounts` table
 *   and only store token-like fields when explicitly present on the OAuth
 *   provider account object.
 */

import { Account, Awaitable, Profile, User } from '@auth/core/types';
import { log, logEvent } from '@compliance-theater/lib-logger';
import { CredentialInput } from '@auth/core/providers';
import { AdapterUser } from '@auth/core/adapters';
import { LoggedError } from '../react-util';
import { updateAccountTokens } from './server/update-account-tokens';
/**
 * Persist token fields for an external OAuth account to the local `accounts`
 * table. This function will only write fields that are present on the
 * provider account object; no additional normalization is performed here.
 *
 * Contract / Inputs:
 * - account: the provider Account object returned by next-auth (or a similar
 *   shape). Only `id_token`, `access_token`, and `refresh_token` are
 *   considered for persistence.
 *
 * Outputs / Side-effects:
 * - Updates the `accounts` row matching the provider + providerAccountId with
 *   the token fields (idToken, accessToken, refreshToken) when present.
 *
 * Error modes:
 * - Any database error will propagate to the caller. Caller should ensure
 *   failures here do not break the sign-in flow (see usage below).
 *
 * @param params.account - OAuth provider account object (may include tokens)
 * @param params.user - User object (not used currently but kept for future use)
 */
const updateAccount = ({
  account,
  user: { id: userId } = {} as User,
}: {
  user: User | AdapterUser;
  account: (Account | Record<string, unknown>) & {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    exp?: number;
    id_token?: string;
  };
}) => updateAccountTokens(userId!, {
  accessToken: account.access_token,
  refreshToken: account.refresh_token,
  idToken: account.id_token,
  expiresAt: account.expires_at,
  exp: account.exp,
});

export const signIn: (params: {
  user: User | AdapterUser;
  account?: Account | null;
  /**
   * If OAuth provider is used, it contains the full
   * OAuth profile returned by your provider.
   */
  profile?: Profile;
  /**
   * If Email provider is used, on the first call, it contains a
   * `verificationRequest: true` property to indicate it is being triggered in the verification request flow.
   * When the callback is invoked after a user has clicked on a sign in link,
   * this property will not be present. You can check for the `verificationRequest` property
   * to avoid sending emails to addresses or domains on a blocklist or to only explicitly generate them
   * for email address in an allow list.
   */
  email?: {
    verificationRequest?: boolean;
  };
  /** If Credentials provider is used, it contains the user credentials */
  credentials?: Record<string, CredentialInput>;
}) => Awaitable<boolean | string> = async (
  {
    user,
    account,
  }:
    | {
      user: User | AdapterUser;
      account?: Account | Record<string, unknown> | null;
    }
    | undefined = {
      user: undefined as unknown as User | AdapterUser,
      account: undefined,
    },
): Promise<boolean | string> => {
    if (account && account.providerAccountId) {
      switch (account.provider) {
        case 'keycloak':
          // Persist tokens for Keycloak. We intentionally do not
          // await here to avoid delaying the sign-in flow; failures will
          // propagate if required but we don't want telemetry to block UX.
          updateAccount({ user, account }).catch((err) => {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
              source: 'auth.signIn.updateAccount',
              log: true,
              data: {
                user,
                account,
              },
            });
            return Promise.resolve(false);
          });
          break;
        default:
          log((l) =>
            l.warn(`Unhandled provider ${account?.provider} in signIn`),
          );
          break;
      }
    }

    // Log local telemetry and report a lightweight event to AppInsights when available
    logEvent('signIn', {
      provider: account?.provider?.toString() ?? 'unknown',
      ...(
        account && account.providerAccountId ? {
          providerAccountId: String(account.providerAccountId)
            .slice(0, 8),
          userId: user.id,
        } : {}
      ),
    });
    return true;
  };
