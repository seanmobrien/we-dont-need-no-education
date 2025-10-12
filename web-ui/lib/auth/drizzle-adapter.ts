import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { schema, drizDbWithInit } from '@/lib/drizzle-db';
import { AdapterAccount } from '@auth/core/adapters';
import { and, sql } from 'drizzle-orm';

export const setupDrizzleAdapter = () =>
  drizDbWithInit((db) => {
    const ret = DrizzleAdapter(db, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersTable: schema.users as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accountsTable: schema.accounts as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionsTable: schema.sessions as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verificationTokensTable: schema.verificationTokens as any,
    });

    ret.linkAccount = async function (data: AdapterAccount) {
      // base impl:
      // await client.insert(accountsTable).values(data)
      console.log('linkAccount', JSON.stringify(data));
      await db
        .insert(schema.accounts)
        .values({ ...data, userId: Number(data.userId) })
        .onConflictDoUpdate({
          target: [schema.accounts.userId],
          set: {
            expiresAt: data.expires_at,
            ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
            ...(data.access_token ? { accessToken: data.access_token } : {}),
            ...(data.id_token ? { idToken: data.id_token } : {}),
            ...(data.token_type ? { tokenType: data.token_type } : {}),
            ...(data.scope ? { scope: data.scope } : {}),
          },
          setWhere: and(
            sql`${schema.accounts.providerAccountId} = ${data.providerAccountId}`,
            sql`${schema.accounts.provider} = ${data.provider}`,
          ),
        });
    };

    return ret;
  });
