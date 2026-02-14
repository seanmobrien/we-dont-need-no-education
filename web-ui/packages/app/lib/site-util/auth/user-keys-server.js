import { eq, lte, gte, and, or, isNull } from 'drizzle-orm';
import { schema, drizDbWithInit, } from '@compliance-theater/database/orm';
import { auth } from '@/auth';
export const getActiveUserPublicKeys = async ({ db: database, effectiveDate, userId: userIdFromProps, }) => {
    const dbInstance = await (database
        ? Promise.resolve(database)
        : drizDbWithInit());
    const date = typeof effectiveDate === 'undefined'
        ? new Date()
        : typeof effectiveDate === 'string'
            ? new Date(effectiveDate)
            : effectiveDate;
    let userId;
    if (userIdFromProps) {
        userId = userIdFromProps;
    }
    else {
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
    }
    const keys = await dbInstance
        .select()
        .from(schema.userPublicKeys)
        .where(and(eq(schema.userPublicKeys.userId, userId), lte(schema.userPublicKeys.effectiveDate, date.toISOString()), or(isNull(schema.userPublicKeys.expirationDate), gte(schema.userPublicKeys.expirationDate, date.toISOString()))));
    return keys.map((k) => k.publicKey);
};
//# sourceMappingURL=user-keys-server.js.map