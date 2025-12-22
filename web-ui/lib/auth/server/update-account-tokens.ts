import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { eq, and } from 'drizzle-orm';
import { log } from '@/lib/logger';

const getExpiresAt = (value: unknown) => {
  const expiresAt = Number(value);
  if (!isNaN(expiresAt) && isFinite(expiresAt)) {
    return expiresAt;
  }
  return undefined;
};

/**
 * Updates the user's account record in the database with new tokens.
 * This MUST ONLY be called from a Node.js environment (Server).
 * 
 * @param providerAccountId The external account ID (sub) from Keycloak.
 * @param tokens Object containing new tokens and expiry.
 */
export const updateAccountTokens = async (
  userId: string | number,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    exp?: number;
    expires_at?: number;
    idToken?: string;
  }
) => {
  const normalizedUserId = Number(userId);
  if (isNaN(normalizedUserId) || !isFinite(normalizedUserId)) {
    throw new TypeError('Invalid user ID [' + userId + ']');
  }
  try {
    const expiresAt = getExpiresAt(tokens.expiresAt) ??
      getExpiresAt(tokens.exp) ??
      getExpiresAt(tokens.expires_at);
    const fields = {
      ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
      ...(tokens.refreshToken ? { refreshToken: tokens.refreshToken } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      ...(tokens.idToken ? { idToken: tokens.idToken } : {}),
    };
    if (Object.keys(fields).length === 0) {
      return;
    }
    log((l) => l.info(`Updating tokens for account ${normalizedUserId}`));
    const updated = await drizDbWithInit(db => db.update(schema.accounts)
      .set(fields)
      .where(
        and(
          eq(schema.accounts.provider, 'keycloak'),
          eq(schema.accounts.userId, normalizedUserId)
        )
      ));
    log((l) => l.debug(`Successfully updated tokens for ${normalizedUserId} ${updated}`));
  } catch (error) {
    log((l) => l.error('Failed to update account tokens in DB', error));
  }
};
