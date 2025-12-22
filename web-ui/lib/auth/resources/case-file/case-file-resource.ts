/**
 * @fileoverview Case File Resource Management for Keycloak Authorization Services
 *
 * This module provides utilities for managing Keycloak resources that represent
 * case files in the Title IX advocacy platform. Each case file (user_id) has a
 * corresponding Keycloak resource with associated scopes and ACL attributes.
 *
 * Key features:
 * - Dynamic resource creation for case files
 * - ACL management (readers, writers, admins)
 * - Scope-based authorization checks
 * - Integration with Keycloak Protection API
 *
 * @module lib/auth/resources/case-file/case-file-resource
 * @version 1.0.0
 */

import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getProviderAccountId, getAccessToken, withRequestProviderAccountId } from '../../access-token';
import { resourceService } from '../resource-service';
import { authorizationService } from '../authorization-service';

/**
 * Represents a case file resource in Keycloak
 */
export interface CaseFileResource {
  /** Unique resource ID in Keycloak */
  _id: string;
  /** Resource name: case-file:{userId} */
  name: string;
  /** Resource type identifier */
  type?: string;
  /** Keycloak user ID of the owner */
  owner?: string;
  /** Associated scopes for this resource */
  scopes: string[];
  /** ACL attributes */
  attributes: {
    caseFileId: string[];
    readers: string[];
    writers: string[];
    admins: string[];
  };
}

/**
 * Available scopes for case file resources
 */
export enum CaseFileScope {
  READ = 'case-file:read',
  WRITE = 'case-file:write',
  ADMIN = 'case-file:admin',
}

/**
 * Gets or creates a case file resource in Keycloak
 *
 * This function ensures that a Keycloak resource exists for the specified user_id (case file).
 * If the resource doesn't exist, it creates one with default ACL settings where the owner
 * has full access.
 *
 * @param userId - The user ID representing the case file owner
 * @param keycloakUserId - The Keycloak user ID of the owner
 * @returns The case file resource
 * @throws {LoggedError} If resource creation or retrieval fails
 *
 * @example
 * ```typescript
 * const resource = await ensureCaseFileResource(123, 'keycloak-uuid-123');
 * console.log(resource.name); // 'case-file:123'
 * ```
 */
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

/**
 * Finds an existing case file resource by user ID
 *
 * @param userId - The user ID representing the case file
 * @returns The case file resource if found, null otherwise
 * @internal
 */
const findCaseFileResource = async (
  userId: number,
): Promise<CaseFileResource | null> => {
  try {
    const resourceName = `case-file:${userId}`;
    const resource = await resourceService().findAuthorizedResource<CaseFileResource>(resourceName);
    if (!resource) {
      return null;
    }
    return {
      scopes: ['openid'],
      ...resource,
    };
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'findCaseFileResource',
      include: { userId },
    });
    return null;
  }
};

/**
 * Creates a new case file resource in Keycloak
 *
 * @param resource - The resource definition to create
 * @returns The created resource with ID
 * @throws {Error} If resource creation fails
 * @internal
 */
const createCaseFileResource = async (
  resource: Omit<CaseFileResource, '_id'>,
): Promise<CaseFileResource> => {
  try {
    return await resourceService().createAuthorizedResource(resource);
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'createCaseFileResource',
      msg: 'Failed to create case file resource',
      include: { resourceName: resource.name },
    });
  }
};

/**
 * Checks if a user has a specific scope for a case file resource using UMA
 *
 * This function performs authorization checking by requesting an RPT (Requesting Party Token)
 * from Keycloak with the specified permission. The permission format is `{resourceId}#{scope}`.
 *
 * @param req - The request object containing the user's access token
 * @param userId - The case file user ID
 * @param scope - The required scope (e.g., 'case-file:read')
 * @returns True if the user has the required scope, false otherwise
 *
 * @example
 * ```typescript
 * const canRead = await checkCaseFileAccess(req, 123, CaseFileScope.READ, userToken);
 * if (!canRead) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * }
 * ```
 */
export const checkCaseFileAccess = async (
  req: NextRequest,
  userId: number,
  scope: CaseFileScope
): Promise<boolean> => {
  try {
    const userAccessToken = await getAccessToken(req);
    if (!userAccessToken) {
      // If no user access token is found, always return false
      return false;
    }

    // First, find the resource to get its ID
    let resource = await findCaseFileResource(userId);

    if (!resource || !resource._id) {
      // We could not find the resource - if the user is trying to access
      // their own case file we should create it.
      const session = await auth();
      const sessionUserId = parseInt(session?.user?.id ?? '0', 10);
      if (sessionUserId === userId) {
        const providerAccountId = withRequestProviderAccountId(req) ?? await getProviderAccountId(req);
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
      bearerToken: userAccessToken,
    }));

    return result.success;
  } catch (error) {
    log((l) =>
      l.error({
        msg: 'Error checking case file access',
        userId,
        scope,
        error,
      }),
    );
    return false;
  }
}

/**
 * Gets the Keycloak resource ID for a case file
 *
 * This helper function retrieves the Keycloak resource ID that corresponds
 * to a case file. This is useful when you need to perform operations that
 * require the resource ID rather than the user ID.
 *
 * @param userId - The case file user ID
 * @returns The Keycloak resource ID if found, null otherwise
 *
 * @example
 * ```typescript
 * const resourceId = await getCaseFileResourceId(123);
 * if (resourceId) {
 *   // Use resourceId for direct permission checks
 *   console.log('Resource ID:', resourceId);
 * }
 * ```
 */
export const getCaseFileResourceId = async (
  userId: number,
): Promise<string | null> => {
  try {
    const resource = await findCaseFileResource(userId);
    return resource?._id ?? null;
  } catch (error) {
    log((l) =>
      l.error({
        msg: 'Error getting case file resource ID',
        userId,
        error,
      }),
    );
    return null;
  }
};
