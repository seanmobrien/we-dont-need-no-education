declare module '@/lib/site-util/auth/keycloak-token-exchange' {
  import { NextApiRequest } from 'next';
  import { NextRequest } from 'next/server';

  /**
   * Configuration for Keycloak token exchange operations
   */
  export interface KeycloakConfig {
    issuer: string;
    clientId: string;
    clientSecret: string;
  }

  /**
   * Parameters for token exchange request
   */
  export interface TokenExchangeParams {
    subjectToken: string;
    audience?: string;
    requestedTokenType?: string;
    scope?: string;
  }

  /**
   * Response from Keycloak token exchange
   */
  export interface TokenExchangeResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
  }

  /**
   * Google tokens extracted from token exchange response
   */
  export interface GoogleTokens {
    refresh_token: string;
    access_token: string;
  }

  /**
   * Comprehensive error class for token exchange operations
   */
  export class TokenExchangeError extends Error {
    constructor(
      message: string,
      code: string,
      status?: number,
      originalError?: unknown,
    );
    readonly code: string;
    readonly status?: number;
    readonly originalError?: unknown;
  }

  /**
   * Keycloak Token Exchange Service
   *
   * Provides a clean, maintainable abstraction for exchanging Keycloak tokens
   * for Google API tokens using the OAuth2 token exchange specification (RFC 8693).
   */
  export class KeycloakTokenExchange {
    /**
     * Creates a new KeycloakTokenExchange instance
     *
     * @param config - Optional configuration overrides. If not provided, values are loaded from environment variables:
     *   - AUTH_KEYCLOAK_ISSUER
     *   - AUTH_KEYCLOAK_CLIENT_ID
     *   - AUTH_KEYCLOAK_CLIENT_SECRET
     * @throws {TokenExchangeError} If required configuration is missing
     */
    constructor(config?: Partial<KeycloakConfig>);

    /**
     * Validate that all required configuration is present
     */
    private validateConfig(): void;

    /**
     * Extract Keycloak access token from NextAuth JWT in the request
     */
    extractKeycloakToken(req: NextRequest | NextApiRequest): Promise<string>;

    /**
     * Exchange Keycloak token for Google tokens
     */
    exchangeForGoogleTokens(params: TokenExchangeParams): Promise<GoogleTokens>;

    /**
     * Extract and validate Google tokens from token exchange response
     */
    private extractGoogleTokens(
      response: TokenExchangeResponse,
    ): GoogleTokens;

    /**
     * Convenience method that combines token extraction and exchange
     */
    getGoogleTokensFromRequest(
      req: NextRequest | NextApiRequest,
      audience?: string,
    ): Promise<GoogleTokens>;
  }

  /**
   * Default instance for use throughout the application
   *
   * This function returns a singleton instance of KeycloakTokenExchange,
   * configured with environment variables. The instance is cached globally
   * to avoid repeated initialization.
   *
   * @returns Singleton KeycloakTokenExchange instance
   *
   * @example
   * ```typescript
   * const tokens = await keycloakTokenExchange().getGoogleTokensFromRequest(req);
   * ```
   */
  export const keycloakTokenExchange: () => KeycloakTokenExchange;

  /**
   * Legacy function for backward compatibility
   * @deprecated Use keycloakTokenExchange.getGoogleTokensFromRequest instead
   */
  export const getGoogleTokensFromKeycloak: (
    req: NextRequest | NextApiRequest,
  ) => Promise<GoogleTokens>;
}
