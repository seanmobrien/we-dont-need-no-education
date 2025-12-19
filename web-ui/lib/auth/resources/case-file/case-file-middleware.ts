/**
 * @fileoverview Case File Authorization Middleware
 *
 * This module provides middleware utilities for protecting API routes with
 * case file authorization checks. It integrates with Keycloak to verify
 * that users have the required permissions before accessing case file data.
 *
 * @module lib/auth/resources/case-file/case-file-middleware
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkCaseFileAccess, CaseFileScope } from './case-file-resource';
import {
  getUserIdFromEmailId,
  getUserIdFromUnitId,
} from './case-file-helpers';
import { log } from '@/lib/logger';
import { getValidatedAccessToken } from '../../access-token';

/**
 * Options for case file authorization middleware
 */
export interface CaseFileAuthOptions {
  /** The required scope for access */
  requiredScope: CaseFileScope;
  /** Whether to allow access if no user_id is found (defaults to false) */
  allowMissing?: boolean;
}

/**
 * Result of authorization check
 */
export type AuthCheckResult = {
  /** Whether the user is authorized */
  authorized: boolean;
  userId?: number;
} & (
    {
      authorized: false;
      response: NextResponse;
    } | {
      authorized: true;
      userId: number;
      response?: NextResponse;
    }
  );

/**
 * Checks authorization for an email-based route
 *
 * This function extracts the user_id associated with the email and verifies
 * that the requesting user has the required scope for that case file.
 *
 * @param req - The Next.js request object
 * @param emailId - The email ID from the route parameter
 * @param options - Authorization options
 * @returns Authorization check result
 *
 * @example
 * ```typescript
 * export const GET = async (
 *   req: NextRequest,
 *   { params }: { params: Promise<{ emailId: string }> }
 * ) => {
 *   const { emailId } = await params;
 *   const authCheck = await checkEmailAuthorization(req, emailId, {
 *     requiredScope: CaseFileScope.READ,
 *   });
 *
 *   if (!authCheck.authorized) {
 *     return authCheck.response;
 *   }
 *
 *   // Proceed with authorized request...
 * };
 * ```
 */
export const checkEmailAuthorization = async (
  req: NextRequest,
  emailId: string,
  options: CaseFileAuthOptions,
): Promise<AuthCheckResult> => {
  try {
    // Get user_id from email
    const userId = await getUserIdFromEmailId(emailId);

    if (!userId) {
      if (options.allowMissing) {
        return { authorized: true, userId: -1 };
      }
      log((l) =>
        l.warn({
          msg: 'No user_id found for email',
          emailId,
        }),
      );
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Case file not found for this email' },
          { status: 404 },
        ),
      };
    }

    // Extract and validate access token
    const tokenResult = await getValidatedAccessToken({ req, source: `auth-email:${emailId}` });
    if ('error' in tokenResult) {
      return {
        authorized: false,
        response: tokenResult.error,
      };
    }

    // Check case file access
    const hasAccess = await checkCaseFileAccess(
      userId,
      options.requiredScope,
      tokenResult.token,
    );

    if (!hasAccess) {
      log((l) =>
        l.warn({
          msg: 'User does not have required scope for case file',
          emailId,
          userId,
          scope: options.requiredScope,
        }),
      );
      return {
        authorized: false,
        userId,
        response: NextResponse.json(
          {
            error: 'Forbidden - Insufficient permissions for this case file',
            required: options.requiredScope,
          },
          { status: 403 },
        ),
      };
    }

    return { authorized: true, userId };
  } catch (error) {
    log((l) =>
      l.error({
        msg: 'Error during authorization check',
        emailId,
        error,
      }),
    );
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error during authorization' },
        { status: 500 },
      ),
    };
  }
};

/**
 * Checks authorization for a document unit-based route
 *
 * This function extracts the user_id associated with the document unit and
 * verifies that the requesting user has the required scope for that case file.
 *
 * @param req - The Next.js request object
 * @param unitId - The document unit ID from the route parameter
 * @param options - Authorization options
 * @returns Authorization check result
 *
 * @example
 * ```typescript
 * export const GET = async (
 *   req: NextRequest,
 *   { params }: { params: Promise<{ unitId: string }> }
 * ) => {
 *   const { unitId } = await params;
 *   const authCheck = await checkDocumentUnitAuthorization(req, Number(unitId), {
 *     requiredScope: CaseFileScope.READ,
 *   });
 *
 *   if (!authCheck.authorized) {
 *     return authCheck.response;
 *   }
 *
 *   // Proceed with authorized request...
 * };
 * ```
 */
export const checkDocumentUnitAuthorization = async (
  req: NextRequest,
  unitId: number,
  options: CaseFileAuthOptions,
): Promise<AuthCheckResult> => {
  try {
    // Get user_id from document unit
    const userId = await getUserIdFromUnitId(unitId);

    if (!userId) {
      if (options.allowMissing) {
        return { authorized: true, userId: -1 };
      }
      log((l) =>
        l.warn({
          msg: 'No user_id found for document unit',
          unitId,
        }),
      );
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Case file not found for this document unit' },
          { status: 404 },
        ),
      };
    }

    // Extract and validate access token
    const tokenResult = await getValidatedAccessToken({ req, source: `auth-doc:${unitId}` });
    if ('error' in tokenResult) {
      return {
        authorized: false,
        response: tokenResult.error,
      };
    }

    // Check case file access
    const hasAccess = await checkCaseFileAccess(
      userId,
      options.requiredScope,
      tokenResult.token,
    );

    if (!hasAccess) {
      log((l) =>
        l.warn({
          msg: 'User does not have required scope for case file',
          unitId,
          userId,
          scope: options.requiredScope,
        }),
      );
      return {
        authorized: false,
        userId,
        response: NextResponse.json(
          {
            error: 'Forbidden - Insufficient permissions for this case file',
            required: options.requiredScope,
          },
          { status: 403 },
        ),
      };
    }

    return { authorized: true, userId };
  } catch (error) {
    log((l) =>
      l.error({
        msg: 'Error during authorization check',
        unitId,
        error,
      }),
    );
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error during authorization' },
        { status: 500 },
      ),
    };
  }
};
