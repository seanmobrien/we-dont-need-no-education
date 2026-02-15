/**
 * @fileoverview Authorization Service for Keycloak
 *
 * This service provides methods for managing authorization checks using Keycloak's
 * UMA (User-Managed Access) protocol. It verifies if a user has access to a specific
 * resource and scope.
 *
 * @module lib/auth/resources/authorization-service
 */

import { env } from '@compliance-theater/env';
import { fetch } from '@compliance-theater/nextjs/server';
import { LoggedError, log } from '@compliance-theater/logger';
import { decodeToken } from '../utilities';
import {
  serviceInstanceOverloadsFactory,
  SingletonProvider,
} from '@compliance-theater/typescript';
import type {
  ResourceEntitlement,
  CheckAccessResult,
  CheckAccessOptions,
} from './types';
import { NextRequest } from 'next/server';
import { normalizedAccessToken } from '../access-token';

/**
 * Service for handling authorization checks
 */
export class AuthorizationService {
  private constructor() {}

  /**
   * Gets the singleton instance of AuthorizationService
   */
  public static get Instance(): AuthorizationService {
    const ret = SingletonProvider.Instance.getOrCreate(
      '@no-education/lib/auth/resources/authorization-service',
      () => new AuthorizationService(),
    );
    if (!ret) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Unable to get singleton instance of AuthorizationService'),
        {
          log: true,
          source: 'AuthorizationService',
        },
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
  public async checkResourceFileAccess(
    options: CheckAccessOptions,
  ): Promise<CheckAccessResult> {
    const { resourceId, scope, audience, permissions } = options;
    const normalToken = await normalizedAccessToken(options?.bearerToken);
    if (!normalToken) {
      log((l) =>
        l.warn('No authentication context availbale for authorization check'),
      );
      return { success: false, code: 401 };
    }
    const { accessToken: bearerToken } = normalToken;
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
        const tokenPermissionsList =
          decodedToken.authorization?.permissions || [];
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
          const hasAllPermissions = permissions.every((p) =>
            resourcePerms.includes(p),
          );
          if (!hasAllPermissions) {
            return { success: false, code: 403 };
          }
        }

        return {
          success: true,
          accessToken: accessToken,
          permissions: mappedPermissions,
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

  /**
   * Retrieves all permissions (entitlements) for the user.
   *
   * @param bearerToken - The user's access token
   * @param audience - Optional audience
   * @returns A list of entitlements (permissions)
   */
  public async getUserEntitlements(
    req: NextRequest | undefined,
    audience?: string,
  ): Promise<Array<ResourceEntitlement>>;
  public async getUserEntitlements(
    bearerToken: string,
    audience?: string,
  ): Promise<Array<ResourceEntitlement>>;
  public async getUserEntitlements(
    reqOrBearerToken: NextRequest | string | undefined,
    audience?: string,
  ): Promise<Array<ResourceEntitlement>> {
    const normalizedInput = await normalizedAccessToken(reqOrBearerToken, {
      skipUserId: true,
    });
    if (!normalizedInput) {
      log((l) => l.warn('No credentials available for entitlement check.'));
      return [];
    }
    const { accessToken: bearerToken } = normalizedInput;
    const targetAudience = audience || env('AUTH_KEYCLOAK_CLIENT_ID');

    // We need to request a generic RPT without a specific permission to get all entitlements
    // https://www.keycloak.org/docs/latest/authorization_services/#_obtaining_permissions

    try {
      const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        ...(targetAudience ? { audience: targetAudience } : {}),
      });

      const response = await fetch(this.getTokenEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${bearerToken}`,
        },
        body,
      });

      if (response.status !== 200) {
        const text = await response.text();
        log((l) =>
          l.warn({
            msg: 'Failed to retrieve entitlements',
            status: response.status,
            response: text,
          }),
        );
        return [];
      }

      const rpt = await response.json();
      const accessToken = rpt.access_token;

      if (!accessToken) {
        return [];
      }

      const decodedToken = await decodeToken(accessToken);

      const permissions =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (decodedToken as any).authorization?.permissions || [];
      return permissions;
    } catch (error) {
      log((l) =>
        l.error({
          msg: 'Error retrieving user entitlements',
          error,
        }),
      );
      return [];
    }
  }
}

export const authorizationService = serviceInstanceOverloadsFactory(
  () => AuthorizationService.Instance,
);
