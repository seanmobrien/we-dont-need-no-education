import { env } from '@compliance-theater/env';
import { fetch } from '@/lib/nextjs-util/dynamic-fetch';
import { InvalidGrantError } from '@/lib/auth/errors';
export const refreshAccessToken = async (token) => {
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
        const tokenEndpoint = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
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
            access_token: refreshedTokens.access_token ?? token.access_token,
            expires_at: Math.floor(Date.now() / 1000) + (refreshedTokens.expires_in ?? 0),
            refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        };
    }
    catch (error) {
        console.error('Error refreshing access token', error);
        if (error?.cause?.error === 'invalid_grant' ||
            error?.error === 'invalid_grant') {
            error = new InvalidGrantError(error);
        }
        return {
            ...token,
            error,
        };
    }
};
//# sourceMappingURL=refresh-token.js.map