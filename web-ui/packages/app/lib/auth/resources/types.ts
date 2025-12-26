import type { NextRequest } from "next/server";

/**
 * Resource entitlement
 * 
 * @see https://www.keycloak.org/docs/latest/authorization_services/index.html#_resource_entitlement
 */
export type ResourceEntitlement = {
  /**
   * Resource unique identifier
   */
  rsid?: string;
  /**
   * Resource name
   */
  rsname?: string;
  /**
   * List of scopes (permissions) the user is granted for the resource
   */
  scopes?: string[];
};
/**
 * Result of the access check
 */
export type CheckAccessResult =
  | { success: true; accessToken: string; permissions: Record<string, string[]> }
  | { success: false; code: number };


/**
 * Options for checking resource access
 */
export type CheckAccessOptions = {
  /** The specific resource ID in Keycloak */
  resourceId: string;
  /** The scope to check (e.g., 'case-file:read') */
  scope?: string;
  /** Optional audience for the token */
  audience?: string;
  /** The user's access token (Bearer) */
  bearerToken?: string | NextRequest;
  /** Optional array of permissions to verify in the response */
  permissions?: string[];
};
