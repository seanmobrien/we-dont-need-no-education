import { Account, Awaitable, Profile, User } from '@auth/core/types';
import { drizDbWithInit, schema, sql } from '../drizzle-db';
import { logEvent } from '../logger';
import { CredentialInput } from '@auth/core/providers';
import { AdapterUser } from '@auth/core/adapters';

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
    account,
  }: { account?: Account | Record<string, unknown> | null } | undefined = {
    account: undefined,
  },
): Promise<boolean | string> => {
  // Ensure account is not null or undefined before accessing its properties
  if (
    account &&
    account.provider === 'google' &&
    account.refresh_token &&
    account.access_token &&
    account.providerAccountId
  ) {
    await drizDbWithInit((db) =>
      db
        .update(schema.accounts)
        .set({
          accessToken: String(account.access_token),
          refreshToken: String(account.refresh_token),
        })
        .where(
          sql`provider='google' AND "provider_account_id" = ${account.providerAccountId}`,
        ),
    );
  }
  logEvent('signIn');
  return true;
};
