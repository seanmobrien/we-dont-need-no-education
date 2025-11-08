import type { OAuth2Client } from 'google-auth-library';
import type { NextApiRequest } from 'next';
import type { Session } from '@auth/core/types';
import type { NextRequest } from 'next/server';

declare module '@/lib/site-util/auth/_types' {
  /**
   * Server-side session tokens with promise-based access
   *
   * Provides lazy access to various authentication tokens used for
   * server-side operations. Each token is wrapped in a Promise to
   * support asynchronous retrieval from secure storage or external services.
   */
  export type IServerSessionTokens = {
    /** Gmail-specific access token, null if not available */
    gmail: Promise<string | null>;
    /** OAuth2 refresh token for token renewal */
    refresh: Promise<string>;
    /** OAuth2 access token for API authentication */
    access: Promise<string>;
  };

  /**
   * Resolved server session tokens
   *
   * Contains the actual token values after all promises have been resolved.
   * This is the synchronous representation of IServerSessionTokens.
   */
  export type IResolvedServerSessionTokens = {
    /** Gmail-specific access token, null if not available */
    gmail: string | null;
    /** OAuth2 refresh token for token renewal */
    refresh: string;
    /** OAuth2 access token for API authentication */
    access: string;
  };

  /**
   * Server-side session interface with token management
   *
   * Extends the standard session with server-side token management capabilities,
   * including methods for resolving tokens and flushing cached values.
   */
  export type IServerSession = {
    /** Promise-based token accessors */
    tokens: IServerSessionTokens;

    /**
     * Resolves all token promises to their actual values
     * @returns Resolved tokens with actual string values
     */
    resolveTokens(): Promise<IResolvedServerSessionTokens>;

    /**
     * Flushes any cached token values and forces refresh on next access
     * @returns Promise that resolves when flush is complete
     */
    flush(): Promise<void>;
  };

  /**
   * Extended session type with server-side capabilities
   *
   * Augments the standard NextAuth Session with server-side token
   * management and authentication capabilities.
   */
  export type SessionExt = Session & {
    /** Server-side session management interface */
    server: IServerSession;
  };

  /**
   * OAuth2 credential interface for service authentication
   *
   * Represents a complete set of OAuth2 credentials including tokens
   * and a configured client instance for making authenticated requests.
   */
  export type ICredential = {
    /** User identifier associated with this credential */
    userId: number;
    /** OAuth2 refresh token for obtaining new access tokens */
    refresh_token: string;
    /** OAuth2 access token for API requests */
    access_token: string;
    /** Configured OAuth2 client instance */
    client: OAuth2Client;
  };

  /**
   * Available service types for credential management
   *
   * Currently supports email services. This will be extended to support
   * additional service types as needed (calendar, drive, etc.).
   */
  export const ServiceValues: readonly ['email'];

  /**
   * Service type derived from ServiceValues
   */
  export type Service = (typeof ServiceValues)[number];

  /**
   * Options for requesting credentials from a provider
   *
   * Specifies which provider and service to use, along with the request
   * context and optional user identifier for multi-user scenarios.
   */
  export type CredentialOptions = {
    /** OAuth provider name (e.g., 'google', 'microsoft') */
    provider: string;
    /** Service type being accessed (e.g., 'email') */
    service: Service;
    /** Next.js request object for extracting session/auth data */
    req: NextRequest | NextApiRequest;
    /** Optional user ID for admin/impersonation scenarios */
    userId?: number;
  };

  /**
   * Credential provider interface
   *
   * Defines the contract for credential providers that manage OAuth2
   * credentials for different services and providers.
   */
  export type ICredentialProvider = {
    /**
     * Retrieves or generates credentials for the specified options
     *
     * @param options - Configuration specifying provider, service, and user context
     * @returns Promise resolving to a complete credential set with OAuth2 client
     * @throws Error if credentials cannot be obtained or user is not authorized
     */
    getCredential(options: CredentialOptions): Promise<ICredential>;
  };
}
