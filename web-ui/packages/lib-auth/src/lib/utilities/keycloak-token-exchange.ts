/* global AbortController */

import { getToken } from '@compliance-theater/types/next-auth/jwt';
import { NextRequest } from 'next/server';
import type { NextApiRequest } from 'next';
import { env } from '@compliance-theater/env';
import { SingletonProvider } from '@compliance-theater/logger/singleton-provider';
import type { KeycloakConfig, TokenExchangeParams, TokenExchangeResponse, GoogleTokens } from './token-exchange-types';
import { resolveFetchService } from './fetch-service';

type TokenErrorPayload = {
  error?: string;
  error_description?: string;
};

const isObjectRecord = (
  value: unknown
): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseTokenErrorPayload = (body: unknown): TokenErrorPayload | undefined => {
  if (isObjectRecord(body)) {
    const error =
      typeof body.error === 'string' ? body.error : undefined;
    const errorDescription =
      typeof body.error_description === 'string'
        ? body.error_description
        : undefined;
    return {
      error,
      error_description: errorDescription,
    };
  }

  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body);
      if (isObjectRecord(parsed)) {
        return {
          error: typeof parsed.error === 'string' ? parsed.error : undefined,
          error_description:
            typeof parsed.error_description === 'string'
              ? parsed.error_description
              : undefined,
        };
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
};

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
    const requestParams = {
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
    };

    try {
      const formBody = new URLSearchParams();
      Object.entries(requestParams).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 0) {
          formBody.set(key, value);
        }
      });

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 10000);

      const fetch = resolveFetchService();
      let response: Response;
      try {
        response = await fetch(this.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody.toString(),
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const responseText = await response.text();
      if (!response.ok) {
        const errorData = parseTokenErrorPayload(responseText);
        const errorMessage =
          errorData?.error_description ||
          errorData?.error ||
          response.statusText ||
          'Token exchange request failed';

        throw new TokenExchangeError(
          `Keycloak token exchange failed: ${errorMessage}`,
          'EXCHANGE_FAILED',
          response.status,
          responseText
        );
      }

      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (error) {
        throw new TokenExchangeError(
          'Invalid JSON response from Keycloak token endpoint',
          'INVALID_TOKEN_RESPONSE',
          response.status,
          error
        );
      }

      if (!isObjectRecord(parsedResponse)) {
        throw new TokenExchangeError(
          'Invalid token response from Keycloak',
          'INVALID_TOKEN_RESPONSE',
          response.status,
          parsedResponse
        );
      }

      return this.extractGoogleTokens(parsedResponse as TokenExchangeResponse);
    } catch (error) {
      // Re-throw TokenExchangeError instances as-is
      if (error instanceof TokenExchangeError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TokenExchangeError(
          'Keycloak token exchange request timed out',
          'EXCHANGE_FAILED',
          undefined,
          error
        );
      }

      throw new TokenExchangeError(
        `Keycloak token exchange failed: ${error instanceof Error ? error.message : 'Unexpected error'
        }`,
        'EXCHANGE_FAILED',
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
