import { eq, lte, gte, and, or, isNull } from 'drizzle-orm';
import {
  DatabaseType,
  schema,
  type UserPublicKeysType,
  drizDbWithInit,
} from '/lib/drizzle-db';
import { auth } from '/auth';

/**
 * Returns all public keys for a user that were active at a given date.
 * @param userId - The user's id (number)
 * @param effectiveDate - ISO string or Date for the point in time
 * @param db - Drizzle database instance (must be provided by caller)
 */
export const getActiveUserPublicKeys = async ({
  db: database,
  effectiveDate,
  userId: userIdFromProps,
}: {
  userId: number;
  effectiveDate?: string | Date;
  db?: DatabaseType;
}): Promise<string[]> => {
  const dbInstance = await (database
    ? Promise.resolve(database)
    : drizDbWithInit());
  const date =
    typeof effectiveDate === 'undefined'
      ? new Date()
      : typeof effectiveDate === 'string'
        ? new Date(effectiveDate)
        : effectiveDate;
  let userId: number;
  if (userIdFromProps) {
    userId = userIdFromProps;
  } else {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new Error('User is not authenticated or user ID is missing');
    }
    userId =
      typeof session.user.id === 'number'
        ? session.user.id
        : parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID format');
    }
  } // Query userPublicKeys for keys where:
  // userId matches, effectiveDate <= date, and (expirationDate is null or expirationDate > date)
  const keys = await dbInstance
    .select()
    .from(schema.userPublicKeys)
    .where(
      and(
        eq(schema.userPublicKeys.userId, userId),
        lte(schema.userPublicKeys.effectiveDate, date.toISOString()),
        or(
          isNull(schema.userPublicKeys.expirationDate),
          gte(schema.userPublicKeys.expirationDate, date.toISOString()),
        ),
      ),
    );
  return keys.map((k: UserPublicKeysType) => k.publicKey);
};
