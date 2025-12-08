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

import { keycloakAdminClientFactory } from '@/lib/auth/keycloak-factories';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

/**
 * Gets the Keycloak token endpoint URL
 * @internal
 */
const getTokenEndpoint = (): string => {
  return `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
};

/**
 * Creates the body for client credentials grant
 * @internal
 */
const createClientCredentialsBody = (): URLSearchParams => {
  return new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env('AUTH_KEYCLOAK_CLIENT_ID'),
    client_secret: env('AUTH_KEYCLOAK_CLIENT_SECRET'),
  });
};

/**
 * Represents a case file resource in Keycloak
 */
export interface CaseFileResource {
  /** Unique resource ID in Keycloak */
  _id?: string;
  /** Resource name: case-file:{userId} */
  name: string;
  /** Resource type identifier */
  type: string;
  /** Keycloak user ID of the owner */
  owner: string;
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
export async function ensureCaseFileResource(
  userId: number,
  keycloakUserId: string,
): Promise<CaseFileResource> {
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
    const newResource: CaseFileResource = {
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
}

/**
 * Finds an existing case file resource by user ID
 *
 * @param userId - The user ID representing the case file
 * @returns The case file resource if found, null otherwise
 * @internal
 */
async function findCaseFileResource(
  userId: number,
): Promise<CaseFileResource | null> {
  try {
    const adminClient = await keycloakAdminClientFactory({
      baseUrl: env('AUTH_KEYCLOAK_ISSUER').replace('/realms/', '/admin/realms/'),
      realmName: extractRealmFromIssuer(env('AUTH_KEYCLOAK_ISSUER')),
    });

    // Set access token from service account or admin
    await adminClient.auth({
      grantType: 'client_credentials',
      clientId: env('AUTH_KEYCLOAK_CLIENT_ID'),
      clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET'),
    });

    // Search for resource by name
    // Note: Keycloak Admin API doesn't have a direct Protection API endpoint,
    // so we need to use a custom fetch to the Protection API
    const resourceName = `case-file:${userId}`;
    const protectionApiUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
    
    // Get PAT (Protection API Token)
    const patResponse = await fetch(protectionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env('AUTH_KEYCLOAK_CLIENT_ID'),
        client_secret: env('AUTH_KEYCLOAK_CLIENT_SECRET'),
      }),
    });

    if (!patResponse.ok) {
      throw new Error(`Failed to get PAT: ${patResponse.statusText}`);
    }

    const patData = await patResponse.json();
    const pat = patData.access_token;

    // Search for the resource
    const resourcesUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set?name=${encodeURIComponent(resourceName)}`;
    const resourcesResponse = await fetch(resourcesUrl, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });

    if (!resourcesResponse.ok) {
      if (resourcesResponse.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to search resources: ${resourcesResponse.statusText}`,
      );
    }

    const resourceIds = await resourcesResponse.json();
    if (!resourceIds || resourceIds.length === 0) {
      return null;
    }

    // Get the full resource details
    const resourceId = resourceIds[0];
    const resourceUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set/${resourceId}`;
    const resourceResponse = await fetch(resourceUrl, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });

    if (!resourceResponse.ok) {
      throw new Error(
        `Failed to get resource details: ${resourceResponse.statusText}`,
      );
    }

    const resource = await resourceResponse.json();
    return resource as CaseFileResource;
  } catch (error) {
    log((l) =>
      l.error({
        msg: 'Error finding case file resource',
        userId,
        error,
      }),
    );
    return null;
  }
}

/**
 * Creates a new case file resource in Keycloak
 *
 * @param resource - The resource definition to create
 * @returns The created resource with ID
 * @throws {Error} If resource creation fails
 * @internal
 */
async function createCaseFileResource(
  resource: CaseFileResource,
): Promise<CaseFileResource> {
  try {
    // Get PAT (Protection API Token)
    const patResponse = await fetch(getTokenEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createClientCredentialsBody(),
    });

    if (!patResponse.ok) {
      throw new Error(`Failed to get PAT: ${patResponse.statusText}`);
    }

    const patData = await patResponse.json();
    const pat = patData.access_token;

    // Create the resource
    const resourcesUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set`;
    const createResponse = await fetch(resourcesUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(
        `Failed to create resource: ${createResponse.statusText} - ${errorText}`,
      );
    }

    const createdResource = await createResponse.json();
    return { ...resource, _id: createdResource._id };
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'createCaseFileResource',
      msg: 'Failed to create case file resource',
      include: { resourceName: resource.name },
    });
  }
}

/**
 * Extracts the realm name from a Keycloak issuer URL
 *
 * @param issuer - The Keycloak issuer URL (e.g., 'https://keycloak.example.com/realms/myrealm')
 * @returns The realm name
 * @internal
 */
function extractRealmFromIssuer(issuer: string): string {
  const match = issuer.match(/\/realms\/([^/]+)/);
  if (!match) {
    throw new Error(`Invalid Keycloak issuer URL: ${issuer}`);
  }
  return match[1];
}

/**
 * Checks if a user has a specific scope for a case file resource
 *
 * @param userId - The case file user ID
 * @param scope - The required scope (e.g., 'case-file:read')
 * @param userAccessToken - The user's access token
 * @returns True if the user has the required scope, false otherwise
 *
 * @example
 * ```typescript
 * const canRead = await checkCaseFileAccess(123, CaseFileScope.READ, userToken);
 * if (!canRead) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
 * }
 * ```
 */
export async function checkCaseFileAccess(
  userId: number,
  scope: CaseFileScope,
  userAccessToken: string,
): Promise<boolean> {
  try {
    const resourceName = `case-file:${userId}`;

    // Request an RPT (Requesting Party Token) with entitlement
    const response = await fetch(getTokenEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${userAccessToken}`,
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        audience: env('AUTH_KEYCLOAK_CLIENT_ID'),
        permission: `${resourceName}#${scope}`,
      }),
    });

    // If we get a 200, the user has access
    // If we get a 403, the user doesn't have access
    if (response.status === 200) {
      return true;
    } else if (response.status === 403 || response.status === 401) {
      return false;
    }

    // For other status codes, log and return false
    log((l) =>
      l.warn({
        msg: 'Unexpected response when checking case file access',
        status: response.status,
        userId,
        scope,
      }),
    );
    return false;
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
