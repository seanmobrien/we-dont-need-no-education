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

/**
 * Configuration for admin token acquisition in Keycloak environment
 *
 * @interface AdminTokenConfig
 * @description Defines all required and optional configuration parameters
 * for acquiring admin tokens from Keycloak. Supports both OAuth2 OIDC flows
 * and direct credential-based authentication.
 *
 * @example
 * ```typescript
 * const config: AdminTokenConfig = {
 *   issuer: 'https://auth.example.com/realms/master',
 *   clientId: 'admin-cli',
 *   clientSecret: 'client-secret',
 *   realm: 'master',
 *   adminBase: 'https://auth.example.com/admin/realms/master',
 *   redirectUri: 'https://app.example.com/auth/callback',
 *   impersonatorUsername: 'admin-user',
 *   impersonatorPassword: 'admin-password'
 * };
 * ```
 */
export type AdminTokenConfig = {
  /** Keycloak issuer URL (e.g., 'https://auth.example.com/realms/master') */
  issuer: string;
  /** OAuth2 client ID for token acquisition */
  clientId: string;
  /** OAuth2 client secret for token acquisition */
  clientSecret: string;
  /** Keycloak realm name (extracted from issuer URL) */
  realm: string;
  /** Base URL for Keycloak admin API endpoints */
  adminBase: string;
  /** OAuth2 redirect URI for authorization code flows */
  redirectUri: string;
  /** Optional: Username for direct credential authentication */
  impersonatorUsername?: string;
  /** Optional: Password for direct credential authentication */
  impersonatorPassword?: string;
  /** Token expiry safety buffer in seconds (default: 30) */
  tokenExpiryBufferSeconds?: number;
  /** Redis token TTL in days (default: 30) */
  redisTokenTtlDays?: number;
  /** Maximum retry attempts for authentication (default: 3) */
  maxRetryAttempts?: number;
  /** Rate limiting: max attempts per window (default: 5) */
  rateLimitMaxAttempts?: number;
  /** Rate limiting: time window in ms (default: 60000) */
  rateLimitWindowMs?: number;
};

/**
 * Token response structure from Keycloak OAuth2/OIDC endpoints
 *
 * @interface TokenResponse
 * @description Standard OAuth2 token response format as returned by Keycloak
 * token endpoints. All fields except access_token are optional per OAuth2 spec.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-5.1} OAuth2 Token Response
 *
 * @example
 * ```typescript
 * const tokenResponse: TokenResponse = {
 *   access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   token_type: 'Bearer',
 *   expires_in: 3600,
 *   refresh_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   scope: 'openid profile email'
 * };
 * ```
 */
export type TokenResponse = {
  /** JWT access token for API authentication */
  access_token: string;
  /** Token type (typically 'Bearer' for JWT tokens) */
  token_type?: string;
  /** Token lifetime in seconds from time of issuance */
  expires_in?: number;
  /** Refresh token for obtaining new access tokens without re-authentication */
  refresh_token?: string;
  /** Space-separated list of granted OAuth2 scopes */
  scope?: string;
};

/**
 * Cached token data with expiry information for internal storage
 *
 * @interface CachedTokenData
 * @description Internal representation of cached authentication tokens with
 * computed expiry dates and optional refresh tokens. Used by SystemTokenStore
 * to manage token lifecycle and prevent unnecessary re-authentication.
 *
 * @example
 * ```typescript
 * const cachedData: CachedTokenData = {
 *   token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   expiry: new Date(Date.now() + 3600000), // 1 hour from now
 *   refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export type CachedTokenData = {
  /** The cached JWT access token */
  token: string;
  /** Computed expiry date with safety buffer (typically expires_in - 60 seconds) */
  expiry: Date;
  /** Optional refresh token for silent token renewal */
  refreshToken?: string;
};

/**
 * Result structure for form-based login operations
 *
 * @interface FormLoginResult
 * @description Contains the results of a successful form-based authentication
 * flow with Keycloak. This represents ready-to-use access tokens (not authorization
 * codes) obtained through direct form submission and OIDC token exchange.
 *
 * @example
 * ```typescript
 * const loginResult: FormLoginResult = {
 *   accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   expiresIn: 3600
 * };
 * ```
 */
export type FormLoginResult = {
  /** Ready-to-use JWT access token obtained from successful form login */
  accessToken: string;
  /** Optional refresh token for silent token renewal */
  refreshToken?: string;
  /** Token lifetime in seconds from time of issuance */
  expiresIn?: number;
};
