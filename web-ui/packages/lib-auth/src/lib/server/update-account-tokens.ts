import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { eq, and, or } from '@compliance-theater/database/drizzle-orm';
import { log } from '@compliance-theater/logger';
import { decodeToken } from '../utilities';
import type { JWT } from '@compliance-theater/auth-compat';

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

const getExpiresAt = (value: unknown) => {
  const expiresAt = Number(value ?? 0);
  if (!isNaN(expiresAt) && isFinite(expiresAt) && expiresAt !== 0) {
    return expiresAt;
  }
  return undefined;
};

const getExpiresAtFromToken = async (token: string | JWT | undefined) => {
  if (!token) {
    return undefined;
  }
  const decoded = typeof token === 'string' ? await decodeToken(token) : token;
  return decoded ? decoded.exp : undefined;
};

/**
 * Updates the user's account record in the database with new tokens.
 * This MUST ONLY be called from a Node.js environment (Server).
 *
 * @param userOrIdentity The local user id and/or external Keycloak provider account id.
 * @param tokens Object containing new tokens and expiry.
 */
export const updateAccountTokens = async (
  userOrIdentity: string | number | AccountTokenIdentity,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    refreshExpiresAt?: number;
    exp?: number;
    expires_at?: number;
    idToken?: string;
  }
) => {
  const { userId, providerAccountId } = resolveAccountTokenIdentity(
    userOrIdentity,
  );
  if (!userId && !providerAccountId) {
    throw new TypeError('Invalid account identity [' + String(userOrIdentity) + ']');
  }
  try {
    const expiresAt =
      getExpiresAt(tokens.expiresAt) ??
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
    log((l) =>
      l.info(
        `Updating tokens for account ${
          userId ?? providerAccountId ?? 'unknown-account'
        }`
      )
    );
    const updated = await drizDbWithInit((db) =>
      db
        .update(schema.accounts)
        .set(fields)
        .where(
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
              )
        )
    );
    log((l) =>
      l.debug(
        `Successfully updated tokens for ${
          userId ?? providerAccountId ?? 'unknown-account'
        } ${updated}`
      )
    );
  } catch (error) {
    log((l) => l.error('Failed to update account tokens in DB', error));
  }
};
