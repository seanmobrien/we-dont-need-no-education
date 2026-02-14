import { eq, lte, gte, and, or, isNull } from 'drizzle-orm';
import {
  DatabaseType,
  schema,
  type UserPublicKeysType,
  drizDbWithInit,
} from '@compliance-theater/database/orm';
import { auth } from '@/auth';

export const getActiveUserPublicKeys = async ({
  db: database,
  effectiveDate,
  userId: userIdFromProps,
}: {
  userId?: number;
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
  let userId: number | undefined;
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
