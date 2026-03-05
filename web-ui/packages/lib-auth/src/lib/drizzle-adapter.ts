import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { log } from '@compliance-theater/logger';
import { schema, drizDbWithInit } from '@compliance-theater/database/orm';
import { Adapter, AdapterAccount } from '@compliance-theater/types/auth-core/adapters';
import { and, sql } from '@compliance-theater/database/drizzle-orm';

export const setupDrizzleAdapter = (): Promise<Adapter> =>
  drizDbWithInit((db) => {
    const ret = (DrizzleAdapter as any)(db, {
      usersTable: schema.users as any,
      accountsTable: schema.accounts as any,
      sessionsTable: schema.sessions as any,
      verificationTokensTable: schema.verificationTokens as any,
    });

    ret.linkAccount = async function (data: AdapterAccount) {
      // base impl:
      // await client.insert(accountsTable).values(data)
      log((l) => l.debug('linkAccount', JSON.stringify(data)));
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
            sql`${schema.accounts.provider} = ${data.provider}`
          ),
        });
    };

    return ret as Adapter;
  });
