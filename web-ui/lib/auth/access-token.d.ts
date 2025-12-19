/**
 * Access token management module declaration
 * @module @/lib/auth/access-token
 */
import type { NextRequest, NextResponse } from 'next/server';

declare module '@/lib/auth/access-token' {
  /**
   * Overloaded interface for `withRequestAccessToken` function.
   */
  interface RequestWithAccessTokenOverloads {
    /**
     * Retrieves the access token from the request if it exists.
     * @param req - The request to check for an access token.
     * @returns The access token string if present, otherwise undefined.
     */
    (req: NextRequest): string | undefined;

    /**
     * Attaches an access token to the request.
     * @param req - The request to attach the token to.
     * @param value - The access token string to attach.
     * @returns The modified request object.
     */
    (req: NextRequest, value: string): NextRequest | undefined;
  }

  /**
   * Utility to attach or retrieve an access token on a request object using a symbol key.
   *
   * @function withRequestAccessToken
   * @description This function serves two purposes based on the arguments provided:
   * 1. If a value is provided, it attaches that value as an access token to the request
   *    using a unique symbol key to avoid collisions.
   * 2. If no value is provided, it attempts to retrieve the stored access token from the request.
   *
   * @param {NextRequest} req - The Next.js request object.
   * @param {string} [value] - Optional access token to store.
   * @returns {string | NextRequest | undefined} The token string (getter) or the request object (setter).
   */
  export const withRequestAccessToken: RequestWithAccessTokenOverloads;

  /**
   * Retrieves an access token for the current session.
   *
   * @function getAccessToken
   * @description Attempts to resolve a valid access token for the current request context.
   * Logic:
   * 1. Checks if a token is already attached to the request via `withRequestAccessToken`.
   * 2. If not, fetches the current session using `auth()`.
   * 3. Uses the session user ID to query the database for a Keycloak account record.
   * 4. Returns the stored access token from the database if found.
   * 5. Caches the found token on the request for subsequent calls.
   *
   * @param {NextRequest} req - The current request object.
   * @returns {Promise<string | undefined>} The access token if available, otherwise undefined.
   */
  export function getAccessToken(req: NextRequest): Promise<string | undefined>;

  /**
   * Retrieves and validates an access token, returning an error response if missing.
   *
   * @function getValidatedAccessToken
   * @description Wrapper around `getAccessToken` that enforces the presence of a token.
   * If a token is not found, it logs a warning and returns a 401 Unauthorized NextResponse.
   *
   * @param {Object} params
   * @param {NextRequest} params.req - The request object.
   * @param {string} [params.source] - Optional source string for logging purposes.
   * @returns {Promise<{ token: string } | { error: NextResponse }>}
   *          An object containing either the valid token string or an error response.
   */
  export function getValidatedAccessToken(params: {
    req: NextRequest;
    source?: string;
  }): Promise<{ token: string } | { error: NextResponse }>;
}
