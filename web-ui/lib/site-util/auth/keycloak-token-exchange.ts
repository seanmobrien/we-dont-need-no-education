import axios, { AxiosResponse } from 'axios';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';
import { env } from '../env';

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
    public readonly code: string,
    public readonly status?: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'TokenExchangeError';
  }
}

/**
 * Keycloak Token Exchange Service
 *
 * Provides a clean, maintainable abstraction for exchanging Keycloak tokens
 * for Google API tokens using the OAuth2 token exchange specification (RFC 8693).
 */
export class KeycloakTokenExchange {
  private readonly config: KeycloakConfig;
  private readonly tokenEndpoint: string;

  constructor(config?: Partial<KeycloakConfig>) {
    // Load configuration from environment with optional overrides
    this.config = {
      issuer: config?.issuer ?? env('AUTH_KEYCLOAK_ISSUER') ?? '',
      clientId: config?.clientId ?? env('AUTH_KEYCLOAK_CLIENT_ID') ?? '',
      clientSecret:
        config?.clientSecret ?? env('AUTH_KEYCLOAK_CLIENT_SECRET') ?? '',
    };

    this.validateConfig();
    this.tokenEndpoint = `${this.config.issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;
  }

  /**
   * Validate that all required configuration is present
   */
  private validateConfig(): void {
    const missing: string[] = [];
    if (!this.config.issuer) missing.push('issuer');
    if (!this.config.clientId) missing.push('clientId');
    if (!this.config.clientSecret) missing.push('clientSecret');

    if (missing.length > 0) {
      throw new TokenExchangeError(
        `Missing required Keycloak configuration: ${missing.join(', ')}`,
        'INVALID_CONFIG',
      );
    }
  }

  /**
   * Extract Keycloak access token from NextAuth JWT in the request
   */
  async extractKeycloakToken(
    req: NextRequest | NextApiRequest,
  ): Promise<string> {
    try {
      const token = await getToken({
        req: req as NextRequest,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        throw new TokenExchangeError(
          'No JWT token found in request',
          'NO_JWT_TOKEN',
        );
      }

      const keycloakToken = token.access_token;
      if (!keycloakToken || typeof keycloakToken !== 'string') {
        throw new TokenExchangeError(
          'No Keycloak access token found in JWT',
          'NO_KEYCLOAK_TOKEN',
        );
      }

      return keycloakToken;
    } catch (error) {
      if (error instanceof TokenExchangeError) {
        throw error;
      }
      throw new TokenExchangeError(
        'Failed to extract Keycloak token from request',
        'TOKEN_EXTRACTION_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Exchange Keycloak token for Google tokens
   */
  async exchangeForGoogleTokens(
    params: TokenExchangeParams,
  ): Promise<GoogleTokens> {
    const requestParams = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      subject_token: params.subjectToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      requested_token_type:
        params.requestedTokenType ??
        'urn:ietf:params:oauth:token-type:refresh_token',
      audience: params.audience ?? 'google',
      ...(params.scope && { scope: params.scope }),
    });

    try {
      const response: AxiosResponse<TokenExchangeResponse> = await axios.post(
        this.tokenEndpoint,
        requestParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000, // 10 second timeout
        },
      );

      return this.extractGoogleTokens(response.data);
    } catch (error) {
      // Re-throw TokenExchangeError instances as-is
      if (error instanceof TokenExchangeError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage =
          errorData?.error_description || errorData?.error || error.message;

        throw new TokenExchangeError(
          `Keycloak token exchange failed: ${errorMessage}`,
          'EXCHANGE_FAILED',
          status,
          error,
        );
      }

      throw new TokenExchangeError(
        'Unexpected error during token exchange',
        'UNKNOWN_ERROR',
        undefined,
        error,
      );
    }
  }

  /**
   * Extract and validate Google tokens from token exchange response
   */
  private extractGoogleTokens(response: TokenExchangeResponse): GoogleTokens {
    const { access_token, refresh_token } = response;

    if (!access_token || !refresh_token) {
      throw new TokenExchangeError(
        'Invalid token response from Keycloak - missing Google tokens',
        'INVALID_TOKEN_RESPONSE',
      );
    }

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Convenience method that combines token extraction and exchange
   */
  async getGoogleTokensFromRequest(
    req: NextRequest | NextApiRequest,
    audience?: string,
  ): Promise<GoogleTokens> {
    const keycloakToken = await this.extractKeycloakToken(req);
    return this.exchangeForGoogleTokens({
      subjectToken: keycloakToken,
      audience,
    });
  }
}

const KEYCLOAK_TOKEN_EXCHANGE = Symbol.for(
  '@no-education/KeycloakTokenExchangeInstance',
);
type GlobalThisWithKeycloak = typeof globalThis & {
  [KEYCLOAK_TOKEN_EXCHANGE]?: KeycloakTokenExchange;
};

/**
 * Default instance for use throughout the application
 */
export const keycloakTokenExchange = () => {
  const withKeycloak = globalThis as GlobalThisWithKeycloak;
  if (!withKeycloak[KEYCLOAK_TOKEN_EXCHANGE]) {
    withKeycloak[KEYCLOAK_TOKEN_EXCHANGE] = new KeycloakTokenExchange();
  }
  return withKeycloak[KEYCLOAK_TOKEN_EXCHANGE]!;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use keycloakTokenExchange.getGoogleTokensFromRequest instead
 */
export const getGoogleTokensFromKeycloak = async (
  req: NextRequest | NextApiRequest,
): Promise<GoogleTokens> => {
  return keycloakTokenExchange().getGoogleTokensFromRequest(req);
};
