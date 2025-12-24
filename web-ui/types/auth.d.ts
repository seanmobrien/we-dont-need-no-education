import type {
  Account as BaseAccount,
  DefaultSession,
  User,
} from '@auth/core/types';
import type { JWT } from '@auth/core/jwt';
import type { AuthConfig as BaseAuthConfig } from '@auth/core';

declare module '@auth/core/types' {
  /**
   * Extended user object with application-specific properties.
   *
   * This interface extends the base NextAuth User type to include additional
   * fields required by the application, such as account IDs and subject identifiers.
   * Used in OAuth provider profile callbacks and session callbacks.
   */
  interface User {
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
  interface Account extends BaseAccount {
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
     * Resource access claims associated with the token.
     */
    resource_access?: { [key: string]: string[] };


    /**
     * Error code from the authentication strategy (e.g. "RefreshAccessTokenError").
     * 
     */
    error?: unknown;

    /**
     * UMA permissions associated with the session.
     * Map of resource ID to array of allowed scopes.
     */
    permissions?: Record<string, string[]>;
  }
  export type AuthConfig = BaseAuthConfig & {
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

export declare module '@auth/core' {
  export type AuthConfig = BaseAuthConfig & {
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

declare module '@auth/core/jwt' {
  /**
   * Extended JWT token object with OAuth and application-specific data.
   *
   * This interface extends the base NextAuth JWT type to include OAuth tokens,
   * account identifiers, and user information for JWT-based sessions.
   * Used in JWT callback functions and token manipulation.
   */
  interface JWT extends BaseJWT {
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
  }
}
