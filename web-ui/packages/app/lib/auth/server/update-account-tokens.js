import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { eq, and } from 'drizzle-orm';
import { log } from '@compliance-theater/logger';
import { decodeToken } from '../utilities';
const getExpiresAt = (value) => {
    const expiresAt = Number(value ?? 0);
    if (!isNaN(expiresAt) && isFinite(expiresAt) && expiresAt !== 0) {
        return expiresAt;
    }
    return undefined;
};
const getExpiresAtFromToken = async (token) => {
    if (!token) {
        return undefined;
    }
    const decoded = typeof token === 'string' ? await decodeToken(token) : token;
    return decoded ? decoded.exp : undefined;
};
export const updateAccountTokens = async (userId, tokens) => {
    const normalizedUserId = Number(userId);
    if (isNaN(normalizedUserId) || !isFinite(normalizedUserId)) {
        throw new TypeError('Invalid user ID [' + userId + ']');
    }
    try {
        const expiresAt = getExpiresAt(tokens.expiresAt) ??
            getExpiresAt(tokens.exp) ??
            getExpiresAt(tokens.expires_at) ??
            (await getExpiresAtFromToken(tokens.accessToken)) ??
            Date.now();
        const refreshExpiresAt = tokens.refreshToken
            ? getExpiresAt(tokens.refreshExpiresAt) ??
                (await getExpiresAtFromToken(tokens.refreshToken)) ??
                expiresAt
            : undefined;
        const fields = {
            ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
            ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
            ...(tokens.idToken ? { idToken: tokens.idToken } : {}),
            ...(expiresAt ? { expiresAt } : {}),
            ...(refreshExpiresAt ? { refreshExpiresAt } : {}),
        };
        if (Object.keys(fields).length === 0) {
            return;
        }
        log((l) => l.info(`Updating tokens for account ${normalizedUserId}`));
        const updated = await drizDbWithInit((db) => db
            .update(schema.accounts)
            .set(fields)
            .where(and(eq(schema.accounts.provider, 'keycloak'), eq(schema.accounts.userId, normalizedUserId))));
        log((l) => l.debug(`Successfully updated tokens for ${normalizedUserId} ${updated}`));
    }
    catch (error) {
        log((l) => l.error('Failed to update account tokens in DB', error));
    }
};
//# sourceMappingURL=update-account-tokens.js.map