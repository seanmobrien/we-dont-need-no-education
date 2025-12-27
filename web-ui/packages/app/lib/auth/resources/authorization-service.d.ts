import type { ServiceInstanceOverloads } from '@compliance-theater/typescript/_generics';

/**
 * Authorization Service module declaration
 * @module @/lib/auth/resources/authorization-service
 */

declare module '@/lib/auth/resources/authorization-service' {
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
    | { success: true; accessToken: string; permissions: unknown[] }
    | { success: false; code: number };

  /**
   * Service for handling authorization checks
   */
  export class AuthorizationService {
    private constructor();

    /**
     * Gets the singleton instance of AuthorizationService
     */
    public static get Instance(): AuthorizationService;

    /**
     * Checks access to a specific resource using Keycloak UMA
     *
     * @description This method attempts to exchange the user's access token for a Requesting Party Token (RPT)
     * that grants access to the specified resource and scope.
     *
     * @param {CheckAccessOptions} options - The options for the check
     * @returns {Promise<CheckAccessResult>} The result of the authorization check
     */
    public checkResourceFileAccess(
      options: CheckAccessOptions
    ): Promise<CheckAccessResult>;
  }

  /**
   * Singleton instance of AuthorizationService
   */
  export const authorizationService: ServiceInstanceOverloads<AuthorizationService>;
}
