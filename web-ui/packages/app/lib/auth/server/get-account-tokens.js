import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { eq, and } from 'drizzle-orm';
import { log } from '@compliance-theater/logger';
export const getAccountTokens = async (userId) => {
    const normalizedUserId = Number(userId);
    if (isNaN(normalizedUserId) || !isFinite(normalizedUserId)) {
        throw new TypeError('Invalid user ID [' + userId + ']');
    }
    try {
        const account = await drizDbWithInit(async (db) => {
            return await db.query.accounts.findFirst({
                where: and(eq(schema.accounts.provider, 'keycloak'), eq(schema.accounts.userId, normalizedUserId)),
            });
        });
        if (!account) {
            return null;
        }
        return {
            accessToken: account.accessToken,
            refreshToken: account.refreshToken,
            expiresAt: Number(account.expiresAt),
            idToken: account.idToken,
        };
    }
    catch (error) {
        log((l) => l.error('Failed to get account tokens from DB', error));
        return null;
    }
};
//# sourceMappingURL=get-account-tokens.js.map