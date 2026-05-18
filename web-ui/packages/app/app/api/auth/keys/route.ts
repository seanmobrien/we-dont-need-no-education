/**
 * @fileoverview API endpoint for managing user cryptographic keys
 *
 * This endpoint allows authenticated users to upload new public keys
 * to be associated with their account for cryptographic operations.
 *
 * @module app/api/auth/keys/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@compliance-theater/nextjs/server/utils';
import { auth } from '@compliance-theater/auth/auth.node';
import { getServiceContainer } from '@compliance-theater/types/dependency-injection/container';
import type { IUserSigningKeysService } from '@compliance-theater/types';
import { LoggedError } from '@compliance-theater/logger';
import { ApiRequestError } from '@compliance-theater/send-api-request';

export const dynamic = 'force-dynamic';

const getUserSigningKeysService = (): IUserSigningKeysService => {
  return getServiceContainer().resolve<IUserSigningKeysService>('userSigningKeys');
};

const authenticationRequiredResponse = (): NextResponse => {
  return NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 },
  );
};

const getAuthenticatedUser = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiRequestError(
      'Authentication required',
      authenticationRequiredResponse(),
    );
  }
  return session.user;
};

const handleRouteError = (
  error: unknown,
  source: string,
  message: string,
): NextResponse => {
  if (ApiRequestError.isApiRequestError(error)) {
    return error.response as NextResponse;
  }

  LoggedError.isTurtlesAllTheWayDownBaby(error, {
    log: true,
    source,
    message,
    critical: false,
  });

  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 },
  );
};

/**
 * POST /api/auth/keys
 *
 * Uploads a new public key for the authenticated user
 */
export const POST = wrapRouteRequest(
  async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getAuthenticatedUser();
      const service = getUserSigningKeysService();
      const uploadRequest = await service.getUploadRequest(user, req);
      const result = await service.processKeyRequest(uploadRequest);

      return NextResponse.json(result);
    } catch (error) {
      return handleRouteError(
        error,
        'POST /api/auth/keys',
        'Failed to upload public key',
      );
    }
  }
);

/**
 * GET /api/auth/keys
 *
 * Retrieves all active public keys for the authenticated user
 */
export const GET = wrapRouteRequest(async (): Promise<NextResponse> => {
  try {
    const user = await getAuthenticatedUser();
    const userKeys = await getUserSigningKeysService().getKeys(user);

    return NextResponse.json({
      success: true,
      keys: userKeys,
      count: userKeys.length,
    });
  } catch (error) {
    return handleRouteError(
      error,
      'GET /api/auth/keys',
      'Failed to retrieve public keys',
    );
  }
});
