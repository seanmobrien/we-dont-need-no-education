import { env } from '@compliance-theater/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { NextRequest } from 'next/server';
import { getRequestTokens } from '../../access-token';
import { resourceService } from '../resource-service';
import { authorizationService } from '../authorization-service';
import { createSafeAsyncWrapper } from '@/lib/nextjs-util/safety-utils';

export interface CaseFileResource {
  _id: string;
  name: string;
  type?: string;
  owner?: string;
  scopes: string[];
  attributes: {
    caseFileId: string[];
    readers: string[];
    writers: string[];
    admins: string[];
  };
}

export enum CaseFileScope {
  READ = 'case-file:read',
  WRITE = 'case-file:write',
  ADMIN = 'case-file:admin',
}

export const ensureCaseFileResource = async (
  userId: number,
  keycloakUserId: string,
): Promise<CaseFileResource> => {
  try {
    const resourceName = `case-file:${userId}`;

    // Try to find existing resource
    const existingResource = await findCaseFileResource(userId);
    if (existingResource) {
      log((l) =>
        l.debug({
          msg: 'Found existing case file resource',
          userId,
          resourceId: existingResource._id,
        }),
      );
      return existingResource;
    }

    // Create new resource
    const newResource: Omit<CaseFileResource, '_id'> = {
      name: resourceName,
      type: 'case-file',
      owner: keycloakUserId,
      scopes: [
        CaseFileScope.READ,
        CaseFileScope.WRITE,
        CaseFileScope.ADMIN,
      ],
      attributes: {
        caseFileId: [userId.toString()],
        readers: [keycloakUserId],
        writers: [keycloakUserId],
        admins: [keycloakUserId],
      },
    };

    const createdResource = await createCaseFileResource(newResource);
    log((l) =>
      l.info({
        msg: 'Created new case file resource',
        userId,
        resourceId: createdResource._id,
      }),
    );

    return createdResource;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'ensureCaseFileResource',
      msg: 'Failed to ensure case file resource',
      include: { userId, keycloakUserId },
    });
  }
};

const findCaseFileResource =
  createSafeAsyncWrapper(
    'findCaseFileResource',
    async (
      userId: number,
    ): Promise<CaseFileResource | null> => {
      const resourceName = `case-file:${userId}`;
      const resource = await resourceService().findAuthorizedResource<CaseFileResource>(resourceName);
      if (!resource) {
        return null;
      }
      return {
        scopes: ['openid'],
        ...resource,
      };
    },
    () => null);

const createCaseFileResource = (resource: Omit<CaseFileResource, '_id'>): Promise<CaseFileResource> =>
  resourceService().createAuthorizedResource(resource);

export const checkCaseFileAccess = createSafeAsyncWrapper(
  'checkCaseFileAccess',
  async (
    req: NextRequest | undefined,
    userIdOrScope: number | CaseFileScope,
    caseScope?: CaseFileScope
  ): Promise<boolean> => {
    let userId: number | undefined = undefined;
    let scope: CaseFileScope;
    if (typeof userIdOrScope === 'number') {
      userId = userIdOrScope;
      scope = caseScope ?? CaseFileScope.READ;
    } else {
      scope = userIdOrScope;
    }
    const {
      access_token: accessToken,
      userId: sessionUserId,
      providerAccountId
    } = await getRequestTokens(req) ?? { access_token: undefined, userId: undefined, providerAccountId: undefined };

    if (!accessToken) {
      // If no user access token is found, always return false
      return false;
    }
    if (!userId) {
      userId = sessionUserId;
      if (!userId) {
        throw new TypeError('No user ID found for authorization check');
      }
    }

    // First, find the resource to get its ID
    let resource = await findCaseFileResource(userId);
    if (!resource || !resource._id) {
      // We could not find the resource - if the user is trying to access
      // their own case file we should create it.
      if (sessionUserId === userId) {
        if (!providerAccountId) {
          log((l) =>
            l.warn({
              msg: 'Case file resource not found for authorization check',
              userId,
              scope,
            }),
          );
          return false;
        }
        resource = await ensureCaseFileResource(userId, providerAccountId);
        if (!resource || !resource._id) {
          log((l) =>
            l.warn({
              msg: 'Unexpected error creating user case file resource',
              userId,
              scope,
            }));
          return false;
        }
      } else {
        log((l) =>
          l.warn({
            msg: 'Case file resource not found for authorization check',
            userId,
            scope,
          }),
        );
        return false;
      }
    }

    // Use AuthorizationService to check access
    const result = await authorizationService(auth => auth.checkResourceFileAccess({
      resourceId: resource._id!,
      scope: scope,
      audience: env('AUTH_KEYCLOAK_CLIENT_ID'),
      bearerToken: accessToken,
    }));

    return result.success;
  },
  () => false,
);

export const getCaseFileResourceId = createSafeAsyncWrapper(
  'getCaseFileResourceId',
  (async (userId: number): Promise<string | null> => (await findCaseFileResource(userId))?._id ?? null),
  () => null
);
