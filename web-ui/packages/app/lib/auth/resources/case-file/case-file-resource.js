import { env } from '@compliance-theater/env';
import { log, LoggedError } from '@compliance-theater/logger';
import { getRequestTokens } from '../../access-token';
import { resourceService } from '../resource-service';
import { authorizationService } from '../authorization-service';
import { createSafeAsyncWrapper } from '@/lib/nextjs-util/safety-utils';
export var CaseFileScope;
(function (CaseFileScope) {
    CaseFileScope["READ"] = "case-file:read";
    CaseFileScope["WRITE"] = "case-file:write";
    CaseFileScope["ADMIN"] = "case-file:admin";
})(CaseFileScope || (CaseFileScope = {}));
export const ensureCaseFileResource = async (userId, keycloakUserId) => {
    try {
        const resourceName = `case-file:${userId}`;
        const existingResource = await findCaseFileResource(userId);
        if (existingResource) {
            log((l) => l.debug({
                msg: 'Found existing case file resource',
                userId,
                resourceId: existingResource._id,
            }));
            return existingResource;
        }
        const newResource = {
            name: resourceName,
            type: 'case-file',
            owner: keycloakUserId,
            scopes: [CaseFileScope.READ, CaseFileScope.WRITE, CaseFileScope.ADMIN],
            attributes: {
                caseFileId: [userId.toString()],
                readers: [keycloakUserId],
                writers: [keycloakUserId],
                admins: [keycloakUserId],
            },
        };
        const createdResource = await createCaseFileResource(newResource);
        log((l) => l.info({
            msg: 'Created new case file resource',
            userId,
            resourceId: createdResource._id,
        }));
        return createdResource;
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'ensureCaseFileResource',
            msg: 'Failed to ensure case file resource',
            include: { userId, keycloakUserId },
        });
    }
};
const findCaseFileResource = createSafeAsyncWrapper('findCaseFileResource', async (userId) => {
    const resourceName = `case-file:${userId}`;
    const resource = await resourceService().findAuthorizedResource(resourceName);
    if (!resource) {
        return null;
    }
    return {
        scopes: ['openid'],
        ...resource,
    };
}, () => null);
const createCaseFileResource = (resource) => resourceService().createAuthorizedResource(resource);
export const checkCaseFileAccess = createSafeAsyncWrapper('checkCaseFileAccess', async (req, userIdOrScope, caseScope) => {
    let userId = undefined;
    let scope;
    if (typeof userIdOrScope === 'number') {
        userId = userIdOrScope;
        scope = caseScope ?? CaseFileScope.READ;
    }
    else {
        scope = userIdOrScope;
    }
    const { access_token: accessToken, userId: sessionUserId, providerAccountId, } = (await getRequestTokens(req)) ?? {
        access_token: undefined,
        userId: undefined,
        providerAccountId: undefined,
    };
    if (!accessToken) {
        return false;
    }
    if (!userId) {
        userId = sessionUserId;
        if (!userId) {
            throw new TypeError('No user ID found for authorization check');
        }
    }
    let resource = await findCaseFileResource(userId);
    if (!resource || !resource._id) {
        if (sessionUserId === userId) {
            if (!providerAccountId) {
                log((l) => l.warn({
                    msg: 'Case file resource not found for authorization check',
                    userId,
                    scope,
                }));
                return false;
            }
            resource = await ensureCaseFileResource(userId, providerAccountId);
            if (!resource || !resource._id) {
                log((l) => l.warn({
                    msg: 'Unexpected error creating user case file resource',
                    userId,
                    scope,
                }));
                return false;
            }
        }
        else {
            log((l) => l.warn({
                msg: 'Case file resource not found for authorization check',
                userId,
                scope,
            }));
            return false;
        }
    }
    const result = await authorizationService((auth) => auth.checkResourceFileAccess({
        resourceId: resource._id,
        scope: scope,
        audience: env('AUTH_KEYCLOAK_CLIENT_ID'),
        bearerToken: accessToken,
    }));
    return result.success;
}, () => false);
export const getCaseFileResourceId = createSafeAsyncWrapper('getCaseFileResourceId', async (userId) => (await findCaseFileResource(userId))?._id ?? null, () => null);
//# sourceMappingURL=case-file-resource.js.map