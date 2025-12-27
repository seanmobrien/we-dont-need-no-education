import { NextRequest, NextResponse } from 'next/server';
import { checkCaseFileAccess, CaseFileScope } from './case-file-resource';
import {
  getUserIdFromUnitId,
} from './case-file-helpers';
import { log } from '@repo/lib-logger';
import { getValidatedAccessToken } from '../../access-token';
import { resolveCaseFileId } from '@/lib/api/document-unit/resolve-case-file-id';

export interface CaseFileAuthOptions {
  requiredScope: CaseFileScope;
  allowMissing?: boolean;
}

export type AuthCheckResult = {
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

export const checkCaseFileAuthorization = async (
  req: NextRequest | undefined,
  caseFileDocumentId: string | number,
  options: CaseFileAuthOptions,
): Promise<AuthCheckResult> => {
  try {
    // Get user_id from email
    const unitId = await resolveCaseFileId(caseFileDocumentId);
    const userId = unitId ? await getUserIdFromUnitId(unitId) : undefined;

    if (!userId) {
      if (options.allowMissing) {
        return { authorized: true, userId: -1 };
      }
      log((l) =>
        l.warn({
          msg: 'No user_id found for case file document ID',
          caseFileDocumentId,
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
    const tokenResult = await getValidatedAccessToken({ req, source: `auth-email:${caseFileDocumentId}` });
    if ('error' in tokenResult) {
      return {
        authorized: false,
        response: tokenResult.error,
      };
    }

    // Check case file access
    const hasAccess = await checkCaseFileAccess(
      req,
      userId,
      options.requiredScope
    );

    if (!hasAccess) {
      log((l) =>
        l.warn({
          msg: 'User does not have required scope for case file',
          caseFileDocumentId,
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
        caseFileDocumentId,
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

