import type {
    Account as BaseAccount,
    DefaultSession as BaseSession,
    User as BaseUser,
    AuthConfig as BaseAuthConfig,
    Awaitable,
} from '@auth/core/types';
import type { NextRequest, NextResponse } from 'next/server';

declare module '@auth/core/types' {
    /**
     * Extended user object with application-specific properties.
     *
     * This type extends the base NextAuth User type to include additional
     * fields required by the application, such as account IDs and subject identifiers.
     * Used in OAuth provider profile callbacks and session callbacks.
     */
    interface User extends BaseUser {
        /**
         * Unique identifier for the user.
         * May be undefined during initial OAuth flow before database assignment.
         */
        id?: string;

        /**
         * Internal account identifier from the application's database.
         * Maps to the user's account record in the local system.
         */
        account_id?: number;

        /**
         * Timestamp when the user's email was verified.
         * Set by OAuth providers or email verification processes.
         */
        emailVerified?: Date;

        /**
         * URL to the user's profile image/avatar.
         * Provided by OAuth providers like Google, GitHub, etc.
         */
        image?: string | null;

        /**
         * Full display name of the user.
         * Provided by OAuth providers or user profile data.
         */
        name?: string | null;

        /**
         * Primary email address of the user.
         * Used for authentication and communication.
         */
        email?: string | null;

        /**
         * Subject identifier from the OAuth provider.
         * Unique identifier within the provider's system (e.g., sub claim in JWT).
         */
        subject?: string;

        /**
         * SHA256 hash of the user's email for consistent identification.
         */
        hash?: string;
    };

    /**
     * Extended account object with provider-specific information.
     *
     * This interface extends the base NextAuth Account type to include
     * provider identification and OAuth token management.
     * Used in OAuth provider account callbacks.
     */
    interface Account extends BaseAccount {
        /**
         * The OAuth provider identifier.
         * Examples: 'google', 'github', 'azure-ad', 'credentials'.
         */
        provider: string;
    };

    /**
     * Extended session object with application-specific session data.
     *
     * This interface extends the base NextAuth Session type to include
     * the user's internal database ID for easy access throughout the application.
     * Returned by useSession, getSession, and auth() functions.
     */
    interface DefaultSession extends BaseSession {
        /**
         * Internal user identifier from the application's database.
         * Corresponds to the user's primary key in the users table.
         * Essential for database queries and user-specific operations.
         */
        id?: number;

        /**
         * Resource access claims associated with the token.
         */
        resource_access?: { [key: string]: string[] };


        /**
         * Error code from the authentication strategy (e.g. "RefreshAccessTokenError").
         * 
         */
        error?: string;

        /**
         * UMA permissions associated with the session.
         * Map of resource ID to array of allowed scopes.
         */
        permissions?: Record<string, string[]>;
    };

    type Session = DefaultSession;

    interface AuthConfig extends BaseAuthConfig {
        callbacks: BaseAuthConfig['callbacks'] & {
            /**
             * Invoked when a user needs authorization, using [Middleware](https://nextjs.org/docs/advanced-features/middleware).
             *
             * You can override this behavior by returning a {@link NextResponse}.
             *
             * @example
             * ```ts title="app/auth.ts"
             * async authorized({ request, auth }) {
             *   const url = request.nextUrl
             *
             *   if(request.method === "POST") {
             *     const { authToken } = (await request.json()) ?? {}
             *     // If the request has a valid auth token, it is authorized
             *     const valid = await validateAuthToken(authToken)
             *     if(valid) return true
             *     return NextResponse.json("Invalid auth token", { status: 401 })
             *   }
             *
             *   // Logged in users are authenticated, otherwise redirect to login page
             *   return !!auth.user
             * }
             * ```
             *
             * :::warning
             * If you are returning a redirect response, make sure that the page you are redirecting to is not protected by this callback,
             * otherwise you could end up in an infinite redirect loop.
             * :::
             */
            authorized?: (params: {
                /** The request to be authorized. */
                request: NextRequest;
                /** The authenticated user or token, if any. */
                auth: Session | null;
            }) => Awaitable<boolean | NextResponse | Response | undefined>;
        };
    };
}

export { };