import type { DefaultSession, Account as BaseAccount } from 'next-auth';


declare module '@compliance-theater/types/next-auth' {
    /*   
    * Extended user object with application-specific properties.
    *
    * This interface extends the base NextAuth User type to include additional
    * fields required by the application, such as account IDs and subject identifiers.
    * Used in OAuth provider profile callbacks and session callbacks.
    */
    export type User = {
        /**
         * Unique identifier for the user.
         * May be undefined during initial OAuth flow before database assignment.
         */
        id: string | undefined;

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
        image: string;

        /**
         * Full display name of the user.
         * Provided by OAuth providers or user profile data.
         */
        name: string;

        /**
         * Primary email address of the user.
         * Used for authentication and communication.
         */
        email: string;

        /**
         * Subject identifier from the OAuth provider.
         * Unique identifier within the provider's system (e.g., sub claim in JWT).
         */
        subject: string;

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
    export type Account = BaseAccount & {
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
    export type Session = DefaultSession & {
        /**
         * Internal user identifier from the application's database.
         * Corresponds to the user's primary key in the users table.
         * Essential for database queries and user-specific operations.
         */
        id: number;

        /**
         * Error code from the authentication strategy (e.g. "RefreshAccessTokenError").
         */
        error?: string;

        /**
         * UMA permissions associated with the session.
         * Map of resource ID to array of allowed scopes.
         */
        permissions?: Record<string, string[]>;
    };
}

