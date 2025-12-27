import { drizDbWithInit, schema } from '@/lib/drizzle-db';
import { eq, and } from 'drizzle-orm';
import { log } from '@compliance-theater/lib-logger';
import { decodeToken } from '../utilities';
import type { JWT } from '@auth/core/jwt';

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
 * @param providerAccountId The external account ID (sub) from Keycloak.
 * @param tokens Object containing new tokens and expiry.
 */
export const updateAccountTokens = async (
  userId: string | number,
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
  const normalizedUserId = Number(userId);
  if (isNaN(normalizedUserId) || !isFinite(normalizedUserId)) {
    throw new TypeError('Invalid user ID [' + userId + ']');
  }
  try {
    const expiresAt = getExpiresAt(tokens.expiresAt) ??
      getExpiresAt(tokens.exp) ??
      getExpiresAt(tokens.expires_at) ??
      await getExpiresAtFromToken(tokens.accessToken) ??
      Date.now();

    const refreshExpiresAt = tokens.refreshToken
      ? getExpiresAt(tokens.refreshExpiresAt)
      ?? await getExpiresAtFromToken(tokens.refreshToken)
      ?? expiresAt
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
