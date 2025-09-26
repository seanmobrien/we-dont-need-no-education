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
import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { and, eq } from 'drizzle-orm';
import { log, logEvent } from '@/lib/logger';
import { getAppInsights } from '@/instrument/browser';
import { CredentialInput } from '@auth/core/providers';
import { AdapterUser } from '@auth/core/adapters';

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
const updateAccountTokens = async ({
  account,
}: {
  user: User | AdapterUser;
  account: Account | Record<string, unknown>;
}) => {
  const { accounts } = schema;
  const fields: Record<string, string> = {};
  if (account.id_token) {
    fields.idToken = String(account.id_token);
  }
  if (account.access_token) {
    fields.accessToken = String(account.access_token);
  }
  if (account.refresh_token) {
    fields.refreshToken = String(account.refresh_token);
  }
  if (Object.keys(fields).length === 0) {
    return;
  }
  await drizDbWithInit((db) =>
    db
      .update(accounts)
      .set(fields)
      .where(
        and(
          eq(accounts.provider, String(account.provider)),
          eq(accounts.providerAccountId, String(account.providerAccountId)),
        ),
      ),
  );
};

/**
 * NextAuth `signIn` callback implementation.
 *
 * This callback is intended to be used as the `callbacks.signIn` handler for
 * NextAuth. It performs two responsibilities:
 *  1. Persist new OAuth tokens for supported providers (currently `keycloak`)
 *     into the local `accounts` table via `updateAccountTokens`.
 *  2. Emit a lightweight telemetry event locally (`logEvent('signIn')`) and
 *     to Application Insights when available. The AppInsights event uses only
 *     minimal, non-sensitive properties (provider and a truncated
 *     providerAccountId).
 *
 * Success criteria / Return:
 * - Must return `true` (allow sign-in) or a redirect URL (string) in case
 *   the application wants to redirect the user. This implementation always
 *   returns `true` to allow sign-in to proceed.
 *
 * Edge cases:
 * - If `account` is missing or the provider is not one of the handled
 *   providers, no token persistence is attempted. AppInsights failures are
 *   caught and logged but do not block sign-in.
 *
 * @param params.user - The user object returned/created by the adapter or
 *                     OAuth provider.
 * @param params.account - Provider account object (may be null during some
 *                        flows). When present, used to persist tokens.
 * @param params.profile - Optional OAuth profile provided by the provider.
 * @param params.email - Optional email verification metadata for email
 *                      provider flows.
 *
 * @returns Awaitable<boolean|string> - `true` to allow sign-in, or a string
 *                                      URL to redirect to.
 */
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
        updateAccountTokens({ user, account });
        break;
      default:
        log((l) =>
          l.error(`Unhandled provider ${account?.provider} in signIn`),
        );
        break;
    }
  }

  // Log local telemetry and report a lightweight event to AppInsights when available
  logEvent('signIn');
  try {
    const appInsights = getAppInsights();
    if (appInsights && typeof appInsights.trackEvent === 'function') {
      // Use minimal properties – avoid logging tokens or sensitive data
      appInsights.trackEvent(
        { name: 'signIn' },
        {
          provider: account?.provider ?? 'unknown',
          providerAccountId: account?.providerAccountId
            ? String(account.providerAccountId).slice(0, 8)
            : undefined,
        },
      );
    }
  } catch (err) {
    // Keep sign-in resilient: log and continue
    log((l) => l.debug('signIn: AppInsights trackEvent failed', err));
  }
  return true;
};
