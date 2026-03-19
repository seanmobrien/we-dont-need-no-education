/**
 * @fileoverview NextAuth.js TypeScript type extensions and custom session handling
 *
 * This module extends the official NextAuth.js types to include custom user properties,
 * session data, and JWT token fields specific to this application's authentication system.
 * It provides type-safe access to authentication data throughout the application.
 *
 * The extensions include:
 * - Custom User interface with application-specific fields (account_id, subject)
 * - Extended Session interface with database user ID for easy querying
 * - Enhanced JWT interface with OAuth tokens and account linking
 * - Account interface extensions for provider-specific data
 *
 * @example
 * ```typescript
 * import { getServerSession } from '@compliance-theater/types/next-auth';
 * import type { Session } from '@compliance-theater/types/next-auth';
 *
 * // Type-safe session access with custom properties
 * export async function getUserData() {
 *   const session = await getServerSession(authOptions) as Session;
 *
 *   if (session?.id) {
 *     // Access custom session properties
 *     console.log('User ID:', session.id);
 *     console.log('User email:', session.user.email);
 *
 *     // Query user data using the database ID
 *     const userData = await db.users.findUnique({
 *       where: { id: session.id }
 *     });
 *
 *     return userData;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * import type { JWT, Account } from '@compliance-theater/types/next-auth/jwt';
 *
 * // JWT callback with extended token properties
 * export async function jwt({ token, account }: {
 *   token: JWT;
 *   account?: Account;
 *   user?: User;
 * }) {
 *   // Link account on initial sign in
 *   if (account && user) {
 *     token.access_token = account.access_token;
 *     token.refresh_token = account.refresh_token;
 *     token.account_id = account.providerAccountId;
 *     token.user_id = user.account_id; // Our internal user ID
 *   }
 *
 *   // Handle token refresh
 *   if (token.refresh_token && shouldRefreshToken(token)) {
 *     const newTokens = await refreshAccessToken(token.refresh_token);
 *     token.access_token = newTokens.access_token;
 *     token.refresh_token = newTokens.refresh_token ?? token.refresh_token;
 *   }
 *
 *   return token;
 * }
 * ```
 *
 * @example
 * ```typescript
 * import type { User, Account } from '@compliance-theater/types/next-auth';
 *
 * // OAuth profile callback with custom user mapping
 * export async function signIn({ user, account, profile }: {
 *   user: User;
 *   account: Account | null;
 *   profile?: any;
 * }) {
 *   // Link or create user account
 *   if (account && profile) {
 *     const existingUser = await db.users.findUnique({
 *       where: { subject: profile.sub }
 *     });
 *
 *     if (!existingUser) {
 *       // Create new user
 *       const newUser = await db.users.create({
 *         data: {
 *           subject: profile.sub,
 *           email: profile.email,
 *           name: profile.name,
 *           image: profile.picture,
 *           emailVerified: profile.email_verified ? new Date() : null,
 *         }
 *       });
 *
 *       user.id = newUser.id.toString();
 *       user.account_id = newUser.id;
 *       user.subject = profile.sub;
 *     } else {
 *       // Link existing user
 *       user.id = existingUser.id.toString();
 *       user.account_id = existingUser.id;
 *       user.subject = existingUser.subject;
 *     }
 *   }
 *
 *   return true;
 * }
 * ```
 */

import type { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extended user object with application-specific properties.
   *
   * This type extends the base NextAuth User type to include additional
   * fields required by the application, such as account IDs and subject identifiers.
   * Used in OAuth provider profile callbacks and session callbacks.
   */
  interface User extends DefaultUser {
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
  }

  /**
   * Extended account object with provider-specific information.
   *
   * This interface extends the base NextAuth Account type to include
   * provider identification and OAuth token management.
   * Used in OAuth provider account callbacks.
   */
  interface Account {
    /**
     * The OAuth provider identifier.
     * Examples: 'google', 'github', 'azure-ad', 'credentials'.
     */
    provider: string;
  }

  /**
   * Extended session object with application-specific session data.
   *
   * This interface extends the base NextAuth Session type to include
   * the user's internal database ID for easy access throughout the application.
   * Returned by useSession, getSession, and auth() functions.
   */
  interface Session extends DefaultSession {
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
    user: DefaultSession['user'] & {
      account_id?: number;
      subject?: string;
      hash?: string;
    };
  }

}

