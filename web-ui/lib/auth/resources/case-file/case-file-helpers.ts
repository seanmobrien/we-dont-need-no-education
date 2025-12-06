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

import { drizDbWithInit } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

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
 */
export async function getUserIdFromEmailId(
  emailId: string,
): Promise<number | null> {
  try {
    const db = await drizDbWithInit();
    
    // Find any document unit associated with this email
    const documentUnit = await db.query.documentUnits.findFirst({
      where: (du, { eq }) => eq(du.emailId, emailId),
      columns: {
        userId: true,
      },
    });

    if (!documentUnit) {
      log((l) =>
        l.debug({
          msg: 'No document unit found for email',
          emailId,
        }),
      );
      return null;
    }

    return documentUnit.userId;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getUserIdFromEmailId',
      msg: 'Failed to get user_id from email_id',
      include: { emailId },
    });
  }
}

/**
 * Extracts the user_id (case file ID) associated with a given document unit ID
 *
 * This function directly queries the document_units table to retrieve the
 * user_id for the specified unit.
 *
 * @param unitId - The ID of the document unit
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
export async function getUserIdFromUnitId(
  unitId: number,
): Promise<number | null> {
  try {
    const db = await drizDbWithInit();
    
    const documentUnit = await db.query.documentUnits.findFirst({
      where: (du, { eq }) => eq(du.unitId, unitId),
      columns: {
        userId: true,
      },
    });

    if (!documentUnit) {
      log((l) =>
        l.debug({
          msg: 'No document unit found',
          unitId,
        }),
      );
      return null;
    }

    return documentUnit.userId;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getUserIdFromUnitId',
      msg: 'Failed to get user_id from unit_id',
      include: { unitId },
    });
  }
}

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
export async function getKeycloakUserIdFromUserId(
  userId: number,
): Promise<string | null> {
  try {
    const db = await drizDbWithInit();
    
    // Find the Keycloak account for this user
    const account = await db.query.accounts.findFirst({
      where: (acc, { and, eq }) =>
        and(eq(acc.userId, userId), eq(acc.provider, 'keycloak')),
      columns: {
        providerAccountId: true,
      },
    });

    if (!account) {
      log((l) =>
        l.debug({
          msg: 'No Keycloak account found for user',
          userId,
        }),
      );
      return null;
    }

    return account.providerAccountId;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getKeycloakUserIdFromUserId',
      msg: 'Failed to get Keycloak user ID from user ID',
      include: { userId },
    });
  }
}

/**
 * Gets accessible user IDs (case file IDs) for the current user based on their Keycloak token
 *
 * This function would typically query Keycloak entitlements to determine which
 * case files the user has access to. For now, it's a placeholder that should be
 * implemented based on specific Keycloak entitlement queries.
 *
 * @param userAccessToken - The user's access token
 * @returns Array of user IDs the user can access
 * @throws {LoggedError} If entitlement query fails
 *
 * @example
 * ```typescript
 * const accessibleCaseFiles = await getAccessibleUserIds(token);
 * // Filter results: WHERE user_id IN (accessibleCaseFiles)
 * ```
 */
export async function getAccessibleUserIds(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userAccessToken: string,
): Promise<number[]> {
  try {
    // TODO: Implement entitlement query to Keycloak
    // This should query for all resources the user has access to
    // and extract the caseFileId from the resource attributes
    
    log((l) =>
      l.warn({
        msg: 'getAccessibleUserIds is not yet implemented - returning empty array',
      }),
    );
    
    return [];
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'getAccessibleUserIds',
      msg: 'Failed to get accessible user IDs',
    });
  }
}
