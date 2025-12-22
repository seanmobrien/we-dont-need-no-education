import type { JWT } from '@auth/core/jwt';
import { env } from '@/lib/site-util/env';
import { fetch } from '@/lib/nextjs-util/dynamic-fetch';
import { InvalidGrantError } from '@/lib/auth/errors';

/**
 * Refreshes the Keycloak access token using the refresh token.
 * This function is Edge-compatible (uses global fetch).
 *
 * @param token The current JWT object containing the refresh token.
 * @returns A new JWT object with updated tokens, or the original token with an error.
 */
export const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  try {
    if (!token.refresh_token) {
      throw new Error('No refresh_token available');
    }

    const clientId = env('AUTH_KEYCLOAK_CLIENT_ID');
    const clientSecret = env('AUTH_KEYCLOAK_CLIENT_SECRET');
    const issuer = env('AUTH_KEYCLOAK_ISSUER');
    if (!issuer) {
      throw new Error('AUTH_KEYCLOAK_ISSUER not defined');
    }

    // Construct the token endpoint URL
    // Typically: {issuer}/protocol/openid-connect/token
    const tokenEndpoint = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(refreshedTokens.error_description || 'Failed to refresh access token', { cause: refreshedTokens });
    }

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (refreshedTokens.expires_in ?? 0),
      // Fall back to old refresh token if new one is not returned
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);

    // Identify if error is due to invalid grant (e.g. refresh token expired/revoked)
    // We propagate 'RefreshAccessTokenError' which causes the client-side useSession hook
    // to detect the error and force a sign-out, effectively clearing the session.
    if (
      (error as { cause?: { error?: string; }; })?.cause?.error === 'invalid_grant' ||
      (error as { error?: string; })?.error === 'invalid_grant'
    ) {
      error = new InvalidGrantError(error);
    }

    return {
      ...token,
      error,
    };
  }
}
