/**
 * Shared types and contract for Impersonation services.
 * Defines the minimal public API used by callers and a common UserContext shape.
 */

/**
 * User context extracted from the current session
 */
export type UserContext = {
  /** User ID from the session (NextAuth id or subject) */
  userId: string;
  /** User email from the session */
  email?: string;
  /** User name from the session */
  name?: string;
  /** Account ID if available */
  accountId?: string | number;
};

/**
 * Public methods exposed by any Impersonation implementation.
 * Both the default token-exchange flow and the implicit-flow variant implement this.
 */
export interface ImpersonationService {
  /** Obtain an impersonated access token, using cache unless forceRefresh is true */
  getImpersonatedToken(forceRefresh?: boolean): Promise<string>;
  /** Retrieve the immutable user context tied to this impersonation instance */
  getUserContext(): Readonly<UserContext>;
  /** Clear any cached token to force a fresh exchange on next request */
  clearCache(): void;
  /** Whether a currently valid cached token exists */
  hasCachedToken(): boolean;
}
