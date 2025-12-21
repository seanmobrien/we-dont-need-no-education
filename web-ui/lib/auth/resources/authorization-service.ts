/**
 * @fileoverview Authorization Service for Keycloak
 *
 * This service provides methods for managing authorization checks using Keycloak's
 * UMA (User-Managed Access) protocol. It verifies if a user has access to a specific
 * resource and scope.
 *
 * @module lib/auth/resources/authorization-service
 */

import { env } from '@/lib/site-util/env';
import { fetch } from '@/lib/nextjs-util/server';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { decodeToken } from '../utilities';
import { log } from '@/lib/logger';
import { serviceInstanceOverloadsFactory, SingletonProvider } from '@/lib/typescript';

/**
 * Options for checking resource access
 */
export interface CheckAccessOptions {
  /** The specific resource ID in Keycloak */
  resourceId: string;
  /** The scope to check (e.g., 'case-file:read') */
  scope?: string;
  /** Optional audience for the token */
  audience?: string;
  /** The user's access token (Bearer) */
  bearerToken?: string;
  /** Optional array of permissions to verify in the response */
  permissions?: string[];
}

/**
 * Result of the access check
 */
export type CheckAccessResult =
  | { success: true; accessToken: string; permissions: Record<string, string[]> }
  | { success: false; code: number };

/**
 * Service for handling authorization checks
 */
export class AuthorizationService {
  private constructor() { }

  /**
   * Gets the singleton instance of AuthorizationService
   */
  public static get Instance(): AuthorizationService {
    const ret = SingletonProvider.Instance.getOrCreate(
      "@no-education/lib/auth/resources/authorization-service",
      () => new AuthorizationService()
    );
    if (!ret) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Unable to get singleton instance of AuthorizationService'),
        {
          log: true,
          source: "AuthorizationService",
        }
      );
    }
    return ret;
  }

  /**
   * Gets the Keycloak token endpoint URL
   */
  private getTokenEndpoint(): string {
    return `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
  }

  /**
   * Checks access to a specific resource using Keycloak UMA
   *
   * This method attempts to exchange the user's access token for a Requesting Party Token (RPT)
   * that grants access to the specified resource and scope.
   *
   * @param options - The options for the check
   * @returns The result of the authorization check
   */
  public async checkResourceFileAccess(options: CheckAccessOptions): Promise<CheckAccessResult> {
    const { resourceId, scope, audience, bearerToken, permissions } = options;

    if (!bearerToken) {
      log((l) => l.warn('No bearer token provided for authorization check'));
      return { success: false, code: 401 };
    }

    try {
      // Build permission string: resourceId#scope or just resourceId
      const permissionParam = scope ? `${resourceId}#${scope}` : resourceId;
      const targetAudience = audience || env('AUTH_KEYCLOAK_CLIENT_ID');

      const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        ...(targetAudience ? { audience: targetAudience } : {}),
        permission: permissionParam,
      });

      const response = await fetch(this.getTokenEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${bearerToken}`,
        },
        body,
      });

      if (response.status === 200) {
        const rpt = await response.json();
        const accessToken = rpt.access_token;

        let decodedToken = rpt;
        if (accessToken) {
          decodedToken = await decodeToken(accessToken);
        }

        // Map permissions: Array<{ rsid, rsname, scopes }> -> Record<rsid, scopes[]>
        const tokenPermissionsList = decodedToken.authorization?.permissions || [];
        const mappedPermissions: Record<string, string[]> = {};

        for (const perm of tokenPermissionsList) {
          if (perm.rsid && Array.isArray(perm.scopes)) {
            mappedPermissions[perm.rsid] = perm.scopes;
          }
        }

        // Verify requested permissions if provided
        if (permissions && permissions.length > 0) {
          // Find permission entry for the target resource
          const resourcePerms = mappedPermissions[resourceId];

          if (!resourcePerms) {
            // Resource not found in permissions
            return { success: false, code: 403 };
          }

          // Check if all requested permissions (scopes) are present
          const hasAllPermissions = permissions.every(p => resourcePerms.includes(p));
          if (!hasAllPermissions) {
            return { success: false, code: 403 };
          }
        }

        return {
          success: true,
          accessToken: accessToken,
          permissions: mappedPermissions
        };

      } else if (response.status === 403 || response.status === 401) {
        return { success: false, code: response.status };
      }

      // Other errors
      const text = await response.text();
      log((l) =>
        l.warn({
          msg: 'Unexpected response when checking resource access',
          status: response.status,
          response: text,
          resourceId,
          scope,
        }),
      );
      return { success: false, code: response.status };

    } catch (error) {
      log((l) =>
        l.error({
          msg: 'Error checking resource access',
          resourceId,
          scope,
          error,
        }),
      );
      return { success: false, code: 500 };
    }
  }
}

export const authorizationService = serviceInstanceOverloadsFactory(() => AuthorizationService.Instance);
