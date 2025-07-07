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
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

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
export async function GET() {
  const session = await auth();
  return NextResponse.json({
    status: session ? 'authenticated' : 'unauthenticated',
    data: session ?? null,
  });
}
