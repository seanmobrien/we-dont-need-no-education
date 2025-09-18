/**
 * @fileoverview Impersonation service for Keycloak token exchange
 * Provides user impersonation via Keycloak token exchange for authenticated API calls
 *
 * @module impersonation
 * @version 1.0.0
 * @author NoEducation Team
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

/**
 * Configuration for Keycloak token exchange
 */
interface KeycloakTokenExchangeConfig {
  /** Keycloak issuer URL */
  issuer: string;
  /** Client ID for token exchange */
  clientId: string;
  /** Client secret for token exchange */
  clientSecret: string;
  /** Target audience for the impersonated token */
  audience?: string;
}

/**
 * Response from Keycloak token exchange endpoint
 */
interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * User context extracted from the current session
 */
interface UserContext {
  /** User ID from the session */
  userId: string;
  /** User email from the session */
  email?: string;
  /** User name from the session */
  name?: string;
  /** Account ID if available */
  accountId?: string | number;
}

/**
 * Impersonation class for handling Keycloak token exchange
 *
 * This class provides functionality to impersonate users by exchanging
 * authentication tokens via Keycloak's token exchange mechanism.
 *
 * @example
 * ```typescript
 * // Create impersonation instance from request
 * const impersonation = await Impersonation.fromRequest(request);
 *
 * // Get impersonated token for API calls
 * const token = await impersonation.getImpersonatedToken();
 *
 * // Use token in API headers
 * const headers = {
 *   'Authorization': `Bearer ${token}`,
 *   'Content-Type': 'application/json'
 * };
 * ```
 */
export class Impersonation {
  private readonly userContext: UserContext;
  private readonly config: KeycloakTokenExchangeConfig;
  private cachedToken?: string;
  private tokenExpiry?: Date;

  /**
   * Creates a new Impersonation instance
   *
   * @param userContext - User context from the session
   * @param config - Keycloak token exchange configuration
   */
  constructor(userContext: UserContext, config: KeycloakTokenExchangeConfig) {
    this.userContext = userContext;
    this.config = config;
  }

  /**
   * Creates an Impersonation instance from a NextRequest
   *
   * @param request - The NextRequest to extract authentication from
   * @returns Promise resolving to Impersonation instance or null if not authenticated
   * @throws Never throws - returns null for unauthenticated requests
   */
  static async fromRequest({
    audience,
  }: {
    audience?: string;
  }): Promise<Impersonation | undefined> {
    try {
      // Get the current session
      const session = await auth();

      if (!session?.user) {
        log((l) => l.debug('No authenticated session found for impersonation'));
        return undefined;
      }

      // Extract user context from session
      const userContext: UserContext = {
        userId: session.user.id || '',
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        accountId:
          'account_id' in session.user ? session.user.account_id : undefined,
      };

      // Validate required user context
      if (!userContext.userId) {
        log((l) =>
          l.warn('User ID not available in session for impersonation'),
        );
        return undefined;
      }

      // Build Keycloak configuration from environment
      const config: KeycloakTokenExchangeConfig = {
        issuer: env('AUTH_KEYCLOAK_ISSUER') || '',
        clientId: env('AUTH_KEYCLOAK_CLIENT_ID') || '',
        clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET') || '',
        audience,
      };

      // Validate configuration
      if (!config.issuer || !config.clientId || !config.clientSecret) {
        log((l) =>
          l.warn('Incomplete Keycloak configuration for impersonation', {
            hasIssuer: !!config.issuer,
            hasClientId: !!config.clientId,
            hasClientSecret: !!config.clientSecret,
          }),
        );
        return undefined;
      }

      return new Impersonation(userContext, config);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'Impersonation.fromRequest',
        severity: 'error',
        message: 'Failed to create impersonation instance from request',
      });
      return undefined;
    }
  }

  /**
   * Gets an impersonated token for the authenticated user
   *
   * This method performs Keycloak token exchange to obtain an impersonated
   * token that can be used for API calls on behalf of the user.
   *
   * @param forceRefresh - Whether to force token refresh even if cached token is valid
   * @returns Promise resolving to the impersonated token
   * @throws Will throw an error if token exchange fails
   */
  async getImpersonatedToken(forceRefresh: boolean = false): Promise<string> {
    // Return cached token if still valid and not forcing refresh
    if (
      !forceRefresh &&
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    ) {
      log((l) => l.debug('Using cached impersonated token'));
      return this.cachedToken;
    }

    try {
      log((l) =>
        l.debug('Performing Keycloak token exchange', {
          userId: this.userContext.userId,
          hasEmail: !!this.userContext.email,
          hasAccountId: !!this.userContext.accountId,
        }),
      );

      // Perform token exchange using Keycloak standard token exchange
      const tokenResponse = await this.performTokenExchange();

      // Cache the token with expiry
      this.cachedToken = tokenResponse.access_token;
      this.tokenExpiry = new Date(
        Date.now() + tokenResponse.expires_in * 1000 - 60000,
      ); // 1 minute buffer

      log((l) =>
        l.debug('Successfully obtained impersonated token', {
          userId: this.userContext.userId,
          expiresIn: tokenResponse.expires_in,
          tokenType: tokenResponse.token_type,
        }),
      );

      return this.cachedToken;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'Impersonation.getImpersonatedToken',
        severity: 'error',
        message: 'Failed to obtain impersonated token',
        data: {
          userId: this.userContext.userId,
          hasEmail: !!this.userContext.email,
        },
      });
      throw error;
    }
  }

  /**
   * Performs the actual Keycloak token exchange
   *
   * @private
   * @returns Promise resolving to token exchange response
   */
  private async performTokenExchange(): Promise<TokenExchangeResponse> {
    const tokenEndpoint = `${this.config.issuer}/protocol/openid-connect/token`;

    // Build token exchange parameters according to Keycloak standard
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      // For impersonation, we use the user ID as the subject
      requested_subject: this.userContext.userId,
    });

    // Add audience if configured
    if (this.config.audience) {
      params.append('audience', this.config.audience);
    }

    // Add additional user context if available
    if (this.userContext.email) {
      params.append('requested_token_use', 'on_behalf_of');
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const tokenData: TokenExchangeResponse = await response.json();

    if (!tokenData.access_token) {
      throw new Error('Token exchange response missing access_token');
    }

    return tokenData;
  }

  /**
   * Gets the user context for this impersonation instance
   *
   * @returns The user context
   */
  getUserContext(): Readonly<UserContext> {
    return { ...this.userContext };
  }

  /**
   * Clears any cached tokens, forcing fresh token exchange on next request
   */
  clearCache(): void {
    this.cachedToken = undefined;
    this.tokenExpiry = undefined;
  }

  /**
   * Checks if the impersonation instance has a valid cached token
   *
   * @returns True if a valid cached token exists
   */
  hasCachedToken(): boolean {
    return !!(
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    );
  }
}
