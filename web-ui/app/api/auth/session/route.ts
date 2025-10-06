/**
 * @module AuthSessionRoute
 *
 * This module provides an API route handler for retrieving the current authentication session.
 * It exports a GET handler that checks the user's authentication status using the `auth` utility
 * and returns a JSON response with the session data if authenticated.
 *
 * The route is configured to be dynamic using the `force-dynamic` export, ensuring that the session
 * is evaluated on each request.
 */

import { auth } from '/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserPublicKeys } from '/lib/site-util/auth/user-keys-server';

export const dynamic = 'force-dynamic';

/**
 * Handles GET requests to retrieve the current authentication session.
 *
 * This function uses the `auth` utility to check if a user session exists.
 * It returns a JSON response indicating the authentication status and
 * includes the session data if authenticated.
 *
 * @returns {Promise<NextResponse>} A JSON response with the authentication status and session data.
 */
export const GET = async (req: NextRequest): Promise<NextResponse> => {
  // Get the current request (Next.js 13+ API route)
  // Use globalThis.request if available, otherwise fallback to NextRequest
  // (Next.js 14+ passes the request as a parameter, but for compatibility, use URL)
  const { nextUrl } = req;

  const session = await auth();
  let keys: string[] | undefined = undefined;
  if (nextUrl) {
    const getKeys = nextUrl.searchParams.get('get-keys');
    if (getKeys && session?.user?.id) {
      // getActiveUserPublicKeys expects userId (number) and date
      // If session.id is not a number, try to parseInt, else skip
      const userId =
        typeof session.user.id === 'number'
          ? session.user.id
          : parseInt(session.user.id, 10);
      if (!isNaN(userId)) {
        keys = await getActiveUserPublicKeys({ userId });
      }
    }
  }
  return NextResponse.json({
    status: session ? 'authenticated' : 'unauthenticated',
    data: session ?? null,
    publicKeys: keys,
  });
};
