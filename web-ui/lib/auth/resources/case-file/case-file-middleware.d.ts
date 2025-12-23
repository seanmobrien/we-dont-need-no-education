import { NextRequest, NextResponse } from 'next/server';
import { CaseFileScope } from './case-file-resource';

/**
 * Case File Authorization Middleware Module
 *
 * @module lib/auth/resources/case-file/case-file-middleware
 */
declare module '@/lib/auth/resources/case-file/case-file-middleware' {
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
   * @param caseFileDocumentId - The email ID or unit ID from the route parameter
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
   *   const authCheck = await checkCaseFileAuthorization(req, emailId, {
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
  export function checkCaseFileAuthorization(
    req: NextRequest,
    caseFileDocumentId: string | number,
    options: CaseFileAuthOptions,
  ): Promise<AuthCheckResult>;

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
   */
  export function checkDocumentUnitAuthorization(
    req: NextRequest,
    unitId: number,
    options: CaseFileAuthOptions,
  ): Promise<AuthCheckResult>;
}
