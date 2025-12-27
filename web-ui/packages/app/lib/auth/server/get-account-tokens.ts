import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { eq, and } from 'drizzle-orm';
import { log } from '@repo/lib-logger';

/**
 * Retrieves the user's account tokens from the database.
 * This MUST ONLY be called from a Node.js environment (Server).
 * 
 * @param userId The User ID.
 * @returns Object containing current tokens and expiry.
 */
export const getAccountTokens = async (
  userId: string | number,
) => {
  const normalizedUserId = Number(userId);
  if (isNaN(normalizedUserId) || !isFinite(normalizedUserId)) {
    throw new TypeError('Invalid user ID [' + userId + ']');
  }

  try {
    const account = await drizDbWithInit(async (db) => {
      return await db.query.accounts.findFirst({
        where: and(
          eq(schema.accounts.provider, 'keycloak'),
          eq(schema.accounts.userId, normalizedUserId)
        ),
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

  } catch (error) {
    log((l) => l.error('Failed to get account tokens from DB', error));
    return null;
  }
};
