import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { log } from '@compliance-theater/logger';
import { schema, drizDbWithInit } from '@compliance-theater/database/orm';
import { and, sql } from 'drizzle-orm';
export const setupDrizzleAdapter = () => drizDbWithInit((db) => {
    const ret = DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
    });
    ret.linkAccount = async function (data) {
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
            setWhere: and(sql `${schema.accounts.providerAccountId} = ${data.providerAccountId}`, sql `${schema.accounts.provider} = ${data.provider}`),
        });
    };
    return ret;
});
//# sourceMappingURL=drizzle-adapter.js.map