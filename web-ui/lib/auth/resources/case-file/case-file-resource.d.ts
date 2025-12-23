import type { NextRequest } from 'next/server';

/**
 * Case File Resource Management Module
 *
 * @module lib/auth/resources/case-file/case-file-resource
 */
declare module '@/lib/auth/resources/case-file/case-file-resource' {
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
  export function ensureCaseFileResource(
    userId: number,
    keycloakUserId: string,
  ): Promise<CaseFileResource>;

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
  export function checkCaseFileAccess(
    req: NextRequest,
    userId: number,
    scope: CaseFileScope
  ): Promise<boolean>;

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
  export function getCaseFileResourceId(userId: number): Promise<string | null>;
}
