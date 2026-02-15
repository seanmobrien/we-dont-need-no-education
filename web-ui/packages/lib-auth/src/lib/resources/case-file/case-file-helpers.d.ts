/**
 * @fileoverview Helper Functions for Case File Authorization
 *
 * This module provides utility functions for extracting user_id (case file ID)
 * from various database entities like emails and document units, enabling
 * authorization checks at API endpoints.
 *
 * @module lib/auth/resources/case-file/case-file-helpers
 * @version 1.0.0
 */

declare module '@/lib/auth/resources/case-file/case-file-helpers' {
  /**
   * Extracts the user_id (case file ID) associated with a given email ID
   *
   * This function queries the document_units table to find the user_id linked
   * to the specified email. Since multiple document units may exist for a single
   * email (e.g., email body, attachments), this returns the first matching user_id.
   *
   * @param emailId - The UUID of the email
   * @returns The user_id if found, null otherwise
   * @throws {LoggedError} If database query fails
   *
   * @example
   * ```typescript
   * const userId = await getUserIdFromEmailId('550e8400-e29b-41d4-a716-446655440000');
   * if (userId) {
   *   console.log(`Email belongs to case file ${userId}`);
   * }
   * ```
   * @deprecated Use `getUserIdFromUnitId` instead.
   */
  export function getUserIdFromEmailId(emailId: string): Promise<number | null>;

  /**
   * Extracts the user_id (case file ID) associated with a given document unit ID
   *
   * This function directly queries the document_units table to retrieve the
   * user_id for the specified unit.
   *
   * @param documentUnitId - The ID of the document unit
   * @returns The user_id if found, null otherwise
   * @throws {LoggedError} If database query fails
   *
   * @example
   * ```typescript
   * const userId = await getUserIdFromUnitId(12345);
   * if (userId) {
   *   console.log(`Document unit belongs to case file ${userId}`);
   * }
   * ```
   */
  export function getUserIdFromUnitId(
    documentUnitId: number | string | undefined,
  ): Promise<number | null>;

  /**
   * Gets the Keycloak user ID for a given local user ID
   *
   * This function looks up the Keycloak provider account ID from the accounts
   * table for the specified user.
   *
   * @param userId - The local user ID
   * @returns The Keycloak user ID (provider_account_id) if found, null otherwise
   * @throws {LoggedError} If database query fails
   *
   * @example
   * ```typescript
   * const keycloakId = await getKeycloakUserIdFromUserId(123);
   * if (keycloakId) {
   *   console.log(`Keycloak ID: ${keycloakId}`);
   * }
   * ```
   */
  export function getKeycloakUserIdFromUserId(
    userId: number,
  ): Promise<string | null>;

  /**
   * Gets accessible user IDs (case file IDs) for the current user based on their Keycloak token
   *
   * **NOTE:** This is a stub function for future implementation. It should query Keycloak's
   * entitlement endpoint to discover which case-file resources the user has access to,
   * then extract the caseFileId from each resource's attributes.
   *
   * When implemented, this will enable list/search endpoints to filter results by accessible
   * case files without requiring individual authorization checks for each item.
   *
   * Implementation steps:
   * 1. Request entitlements from Keycloak using the user's token
   * 2. Parse the response to extract resource names matching "case-file:*"
   * 3. For each resource, query its attributes to get the caseFileId
   * 4. Return an array of accessible user IDs
   *
   * @param userAccessToken - The user's access token
   * @returns Array of user IDs the user can access (currently returns empty array)
   * @throws {LoggedError} If entitlement query fails
   *
   * @example
   * ```typescript
   * // Future usage for filtering list endpoints:
   * const accessibleCaseFiles = await getAccessibleUserIds(token);
   * const filteredEmails = emails.filter(e => accessibleCaseFiles.includes(e.userId));
   * ```
   */
  export function getAccessibleUserIds(
    userAccessToken: string,
  ): Promise<number[]>;
}
