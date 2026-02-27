import * as next_auth_jwt from 'next-auth/jwt';
import type { JWT as BaseJWT } from 'next-auth/jwt';
export { next_auth_jwt };
export * from 'next-auth/jwt';


declare module '@compliance-theater/types/next-auth' {
    /**
      * Extended JWT token object with OAuth and application-specific data.
      *
      * This interface extends the base NextAuth JWT type to include OAuth tokens,
      * account identifiers, and user information for JWT-based sessions.
      * Used in JWT callback functions and token manipulation.
      */
    export type JWT = BaseJWT & {
        /**
         * OpenID Connect ID Token.
         * Contains user identity information and is digitally signed by the provider.
         * Used for identity verification and can be passed to APIs requiring user context.
         */
        idToken?: string;

        /**
         * OAuth refresh token for obtaining new access tokens.
         * Used to maintain long-term authentication without requiring user re-login.
         * Should be stored securely and handled with care.
         */
        refresh_token?: string;

        /**
         * OAuth access token for API authentication.
         * Short-lived token used to authenticate API requests to the OAuth provider.
         * Included in Authorization headers when making provider API calls.
         */
        access_token?: string;

        /**
         * Internal account identifier from the application's database.
         * Links the JWT to the user's account record for database operations.
         * Populated during the JWT callback after account linking.
         */
        account_id?: number;

        /**
         * Internal user identifier from the application's database.
         * Primary key of the user in the local users table.
         * Essential for user-specific database queries and authorization checks.
         */
        user_id?: number;

        /**
         * Resource access claims associated with the token.
         */
        resource_access?: { [key: string]: string[] };

        /**
         * Timestamp (in seconds) when the access token expires.
         * Used to determine if the token needs to be refreshed.
         */
        expires_at?: number;

        /**
         * Error code or message if token refresh fails.
         * Common value: "RefreshAccessTokenError".
         */
        error?: unknown;
        /**
         * UMA permissions associated with the session.
         * Array of permissions.
         */
        authorization?: {
            permissions?: Array<{
                scopes: Array<string>;
                rsid: string;
                rsname: string;
            }>;
        }
    };
}