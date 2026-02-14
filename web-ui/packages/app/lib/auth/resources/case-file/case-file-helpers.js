import { resolveCaseFileId } from '@/lib/api/document-unit/resolve-case-file-id';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { deprecate } from '@/lib/nextjs-util/utils';
import { authorizationService } from '../authorization-service';
import { normalizedAccessToken } from '../../access-token';
export const getUserIdFromEmailId = deprecate(async function getUserIdFromEmailId(emailId) {
    try {
        return getUserIdFromUnitId(emailId);
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getUserIdFromEmailId',
            msg: 'Failed to get user_id from email_id',
            include: { emailId },
        });
    }
}, 'getUserIdFromEmailId is deprecated. Use getUserIdFromUnitId instead.', 'DEP003');
export const getUserIdFromUnitId = async (documentUnitId) => {
    try {
        const unitId = await resolveCaseFileId(documentUnitId);
        if (!unitId) {
            log((l) => l.debug({
                msg: 'null/undefined unitId provided',
                unitId,
            }));
            return null;
        }
        const db = await drizDbWithInit();
        const documentUnit = await db.query.documentUnits.findFirst({
            where: (du, { eq }) => eq(du.unitId, unitId),
            columns: {
                userId: true,
            },
        });
        if (!documentUnit) {
            log((l) => l.debug({
                msg: 'No document unit found',
                unitId,
            }));
            return null;
        }
        return documentUnit.userId;
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getUserIdFromUnitId',
            msg: 'Failed to get user_id from unit_id',
            include: { unitId: documentUnitId },
        });
    }
};
export const getKeycloakUserIdFromUserId = async (userId) => {
    try {
        const db = await drizDbWithInit();
        const account = await db.query.accounts.findFirst({
            where: (acc, { and, eq }) => and(eq(acc.userId, userId), eq(acc.provider, 'keycloak')),
            columns: {
                providerAccountId: true,
            },
        });
        if (!account) {
            log((l) => l.debug({
                msg: 'No Keycloak account found for user',
                userId,
            }));
            return null;
        }
        return account.providerAccountId;
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getKeycloakUserIdFromUserId',
            msg: 'Failed to get Keycloak user ID from user ID',
            include: { userId },
        });
    }
};
export const getAccessibleUserIds = async (userAccessToken) => {
    try {
        const normalizedInput = await normalizedAccessToken(userAccessToken);
        if (!normalizedInput) {
            log((l) => l.warn('No credentials available for entitlement check.'));
            return [];
        }
        const { accessToken: bearerToken, userId } = normalizedInput;
        const entitlements = await authorizationService((s) => s.getUserEntitlements(bearerToken));
        const accessibleUserIds = new Set();
        let foundThisId = false;
        for (const entitlement of entitlements) {
            if (entitlement.rsname && entitlement.rsname.startsWith('case-file:')) {
                const idPart = entitlement.rsname.split(':')[1];
                const parsedUserId = parseInt(idPart, 10);
                if (!isNaN(parsedUserId)) {
                    accessibleUserIds.add(parsedUserId);
                    foundThisId = foundThisId || parsedUserId === userId;
                }
            }
        }
        if (!foundThisId && userId) {
            accessibleUserIds.add(userId);
        }
        return Array.from(accessibleUserIds);
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getAccessibleUserIds',
            msg: 'Failed to get accessible user IDs',
        });
    }
};
//# sourceMappingURL=case-file-helpers.js.map