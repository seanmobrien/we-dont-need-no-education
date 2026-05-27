import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { eq, and, or } from '@compliance-theater/database/drizzle-orm';
import { log } from '@compliance-theater/logger';

type AccountTokenIdentity = {
  userId?: string | number;
  providerAccountId?: string;
};

const resolveAccountTokenIdentity = (
  value: string | number | AccountTokenIdentity,
): { userId?: number; providerAccountId?: string } => {
  const identity =
    typeof value === 'object' && value !== null ? value : { userId: value };
  const parsedUserId = Number(identity.userId);
  const userId =
    !isNaN(parsedUserId) && isFinite(parsedUserId) && parsedUserId > 0
      ? parsedUserId
      : undefined;
  const providerAccountId =
    typeof identity.providerAccountId === 'string' &&
    identity.providerAccountId.trim().length > 0
      ? identity.providerAccountId.trim()
      : undefined;

  return {
    userId,
    providerAccountId,
  };
};

/**
 * Retrieves the user's account tokens from the database.
 * This MUST ONLY be called from a Node.js environment (Server).
 *
 * @param userOrIdentity The local user id and/or external Keycloak provider account id.
 * @returns Object containing current tokens and expiry.
 */
export const getAccountTokens = async (
  userOrIdentity: string | number | AccountTokenIdentity,
) => {
  const { userId, providerAccountId } = resolveAccountTokenIdentity(
    userOrIdentity,
  );
  if (!userId && !providerAccountId) {
    throw new TypeError('Invalid account identity [' + String(userOrIdentity) + ']');
  }

  try {
    const account = await drizDbWithInit(async (db) => {
      return await db.query.accounts.findFirst({
        where:
          userId && providerAccountId
            ? and(
              eq(schema.accounts.provider, 'keycloak'),
              or(
                eq(schema.accounts.userId, userId),
                eq(schema.accounts.providerAccountId, providerAccountId)
              )
            )
            : userId
              ? and(
                eq(schema.accounts.provider, 'keycloak'),
                eq(schema.accounts.userId, userId)
              )
              : and(
                eq(schema.accounts.provider, 'keycloak'),
                eq(schema.accounts.providerAccountId, providerAccountId!)
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
    log((l) =>
      l.error(
        `Failed to get account tokens from DB for ${
          userId ?? providerAccountId ?? 'unknown-account'
        }`,
        error,
      )
    );
    return null;
  }
};
