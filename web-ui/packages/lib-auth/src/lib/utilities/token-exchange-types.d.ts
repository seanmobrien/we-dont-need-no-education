
/**
 * Token exchange type definitions for Keycloak OAuth2 token exchange operations.
 *
 * @module @compliance-theater/auth/lib/utilities/token-exchange-types
 *
 * @description
 * Provides the core type definitions used by {@link KeycloakTokenExchange} to perform
 * OAuth2 token exchange (RFC 8693) between Keycloak and downstream identity providers
 * such as Google. These types define the configuration, request parameters, and response
 * shapes consumed and produced throughout the token exchange lifecycle.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8693 | RFC 8693 - OAuth 2.0 Token Exchange}
 */
declare module '@compliance-theater/auth/lib/utilities/token-exchange-types' {
  /**
   * Configuration for connecting to a Keycloak realm's token endpoint.
   *
   * When not supplied explicitly, each property falls back to an environment variable:
   * - `issuer`       → `AUTH_KEYCLOAK_ISSUER`
   * - `clientId`     → `AUTH_KEYCLOAK_CLIENT_ID`
   * - `clientSecret` → `AUTH_KEYCLOAK_CLIENT_SECRET`
   *
   * @example
   * ```typescript
   * const config: KeycloakConfig = {
   *   issuer: 'https://keycloak.example.com/realms/my-realm',
   *   clientId: 'my-client',
   *   clientSecret: 's3cret',
   * };
   * ```
   */
  export type KeycloakConfig = {
    /**
     * The full Keycloak realm issuer URL.
     *
     * @remarks
     * Must include the `/realms/{realm}` path segment. A trailing slash is
     * tolerated and stripped automatically by the exchange client.
     *
     * @example `'https://keycloak.example.com/realms/my-realm'`
     */
    issuer: string;

    /**
     * The OAuth2 client identifier registered in Keycloak for this application.
     */
    clientId: string;

    /**
     * The OAuth2 client secret associated with {@link KeycloakConfig.clientId}.
     *
     * @remarks
     * Treat this value as sensitive — it should be sourced from a secret
     * manager or environment variable, never hard-coded.
     */
    clientSecret: string;
  };

  /**
   * Parameters for an OAuth2 token exchange request (RFC 8693).
   *
   * These parameters are sent as `application/x-www-form-urlencoded` form fields
   * to the Keycloak token endpoint.
   *
   * @example
   * ```typescript
   * const params: TokenExchangeParams = {
   *   subjectToken: keycloakAccessToken,
   *   audience: 'google',
   *   scope: 'openid email profile',
   * };
   * ```
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-2.1 | RFC 8693 §2.1}
   */
  export type TokenExchangeParams = {
    /**
     * The existing Keycloak access token to be exchanged.
     *
     * Sent as the `subject_token` parameter with a token type of
     * `urn:ietf:params:oauth:token-type:access_token`.
     */
    subjectToken: string;

    /**
     * The target audience for the exchanged token.
     *
     * @default `'google'`
     *
     * @remarks
     * In a Keycloak identity brokering setup this typically matches the
     * alias of the identity provider configured in the realm.
     */
    audience?: string;

    /**
     * The desired token type for the exchange response.
     *
     * @default `'urn:ietf:params:oauth:token-type:refresh_token'`
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-3 | RFC 8693 §3}
     */
    requestedTokenType?: string;

    /**
     * Space-delimited OAuth2 scopes to request for the exchanged token.
     *
     * @remarks
     * Only included in the request when a non-empty value is provided.
     */
    scope?: string;
  };

  /**
   * Google API tokens obtained via Keycloak token exchange.
   *
   * Represents the minimal credential set required for authenticating
   * requests to Google APIs on behalf of the user.
   *
   * @example
   * ```typescript
   * const tokens: GoogleTokens = await keycloakTokenExchange()
   *   .getGoogleTokensFromRequest(req);
   *
   * // Use tokens.access_token for immediate API calls
   * // Use tokens.refresh_token to obtain new access tokens later
   * ```
   */
  export type GoogleTokens = {
    /**
     * OAuth2 refresh token for obtaining new Google access tokens.
     *
     * @remarks
     * May be `undefined` when the identity provider or requested token type
     * does not support refresh token issuance.
     */
    refresh_token?: string;

    /**
     * Short-lived OAuth2 access token for Google API requests.
     *
     * @remarks
     * Typically valid for one hour. Use {@link GoogleTokens.refresh_token} to
     * obtain a fresh access token when this one expires.
     */
    access_token: string;
  };

  /**
   * Full token exchange response payload from the Keycloak token endpoint.
   *
   * Extends {@link GoogleTokens} with standard OAuth2 token response metadata
   * as defined in RFC 6749 §5.1.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-5.1 | RFC 6749 §5.1}
   */
  export type TokenExchangeResponse = GoogleTokens & {
    /**
     * The type of the issued token (e.g., `'Bearer'`).
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc6749#section-7.1 | RFC 6749 §7.1}
     */
    token_type: string;

    /**
     * Lifetime of the access token in seconds.
     *
     * @remarks
     * When present, indicates how many seconds until the access token expires
     * from the time of issuance.
     */
    expires_in?: number;

    /**
     * Space-delimited scopes granted by the authorization server.
     *
     * @remarks
     * May differ from the scopes originally requested if the server applied
     * scope narrowing or expansion policies.
     */
    scope?: string;
  };
}

