import { Account } from '@auth/core/types';
import { drizDbWithInit, schema, sql } from '../drizzle-db';
import { logEvent } from '../logger';

export const signIn =
  () =>
  async (
    { account }: { account?: Account | Record<string, unknown> } | undefined = {
      account: undefined,
    },
  ) => {
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
