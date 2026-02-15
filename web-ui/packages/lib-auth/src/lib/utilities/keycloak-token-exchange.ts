import axios, { AxiosResponse } from 'axios';
// import { getToken } from 'next-auth/jwt';
import { getToken } from '@auth/core/jwt';
import { NextRequest } from 'next/server';
import { NextApiRequest } from 'next';
import { env } from '@compliance-theater/env';
import { SingletonProvider } from '@compliance-theater/typescript';

export interface KeycloakConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

export interface TokenExchangeParams {
  subjectToken: string;
  audience?: string;
  requestedTokenType?: string;
  scope?: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

export interface GoogleTokens {
  refresh_token: string;
  access_token: string;
}

export class TokenExchangeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'TokenExchangeError';
  }
}

export class KeycloakTokenExchange {
  private readonly config: KeycloakConfig;
  private readonly tokenEndpoint: string;

  constructor(config?: Partial<KeycloakConfig>) {
    type KeycloakConfigEnvKey =
      | 'AUTH_KEYCLOAK_ISSUER'
      | 'AUTH_KEYCLOAK_CLIENT_ID'
      | 'AUTH_KEYCLOAK_CLIENT_SECRET';
    const fromEnv = (key: KeycloakConfigEnvKey): string => {
      const valueFromProcess = process.env[key];
      if (typeof valueFromProcess === 'string') {
        return valueFromProcess;
      }
      const valueFromEnv = env(key);
      return typeof valueFromEnv === 'string' ? valueFromEnv : '';
    };

    // Load configuration from environment with optional overrides
    this.config = {
      issuer: config?.issuer ?? fromEnv('AUTH_KEYCLOAK_ISSUER'),
      clientId: config?.clientId ?? fromEnv('AUTH_KEYCLOAK_CLIENT_ID'),
      clientSecret:
        config?.clientSecret ?? fromEnv('AUTH_KEYCLOAK_CLIENT_SECRET'),
    };

    this.validateConfig();
    this.tokenEndpoint = `${this.config.issuer.replace(
      /\/$/,
      ''
    )}/protocol/openid-connect/token`;
  }

  private validateConfig(): void {
    const missing: string[] = [];
    if (!this.config.issuer) missing.push('issuer');
    if (!this.config.clientId) missing.push('clientId');
    if (!this.config.clientSecret) missing.push('clientSecret');

    if (missing.length > 0) {
      throw new TokenExchangeError(
        `Missing required Keycloak configuration: ${missing.join(', ')}`,
        'INVALID_CONFIG'
      );
    }
  }

  async extractKeycloakToken(
    req: NextRequest | NextApiRequest
  ): Promise<string> {
    try {
      const token = await getToken({
        req: req as NextRequest,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        throw new TokenExchangeError(
          'No JWT token found in request',
          'NO_JWT_TOKEN'
        );
      }

      const keycloakToken = token.access_token;
      if (!keycloakToken || typeof keycloakToken !== 'string') {
        throw new TokenExchangeError(
          'No Keycloak access token found in JWT',
          'NO_KEYCLOAK_TOKEN'
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
        error
      );
    }
  }

  async exchangeForGoogleTokens(
    params: TokenExchangeParams
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
        }
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
          error
        );
      }

      throw new TokenExchangeError(
        'Unexpected error during token exchange',
        'UNKNOWN_ERROR',
        undefined,
        error
      );
    }
  }

  private extractGoogleTokens(response: TokenExchangeResponse): GoogleTokens {
    const { access_token, refresh_token } = response;

    if (!access_token || !refresh_token) {
      throw new TokenExchangeError(
        'Invalid token response from Keycloak - missing Google tokens',
        'INVALID_TOKEN_RESPONSE'
      );
    }

    return {
      access_token,
      refresh_token,
    };
  }

  async getGoogleTokensFromRequest(
    req: NextRequest | NextApiRequest,
    audience?: string
  ): Promise<GoogleTokens> {
    const keycloakToken = await this.extractKeycloakToken(req);
    return this.exchangeForGoogleTokens({
      subjectToken: keycloakToken,
      audience,
    });
  }
}

export const keycloakTokenExchange = () =>
  SingletonProvider.Instance.getRequired<KeycloakTokenExchange>(
    '@no-education/KeycloakTokenExchangeInstance',
    () => new KeycloakTokenExchange()
  );

export const getGoogleTokensFromKeycloak = async (
  req: NextRequest | NextApiRequest
): Promise<GoogleTokens> => {
  return keycloakTokenExchange().getGoogleTokensFromRequest(req);
};
