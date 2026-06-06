/* global AbortController */

import { getToken } from '@compliance-theater/auth-compat/runtime';
import type { JWT } from '@compliance-theater/auth-compat';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { NextRequest } from 'next/server';
import type { NextApiRequest } from 'next';
import { env } from '@compliance-theater/env';
import { SingletonProvider } from '@compliance-theater/logger/singleton-provider';
import { getRequestTokens } from '../access-token';
import type { KeycloakConfig, TokenExchangeParams, TokenExchangeResponse, GoogleTokens } from './token-exchange-types';
import { resolveFetchService } from './fetch-service';

type TokenErrorPayload = {
  error?: string;
  error_description?: string;
};

type IdentityProviderDescriptor = {
  alias?: unknown;
  providerId?: unknown;
};

type ThrownHttpError = {
  status?: number;
  body?: string;
  message?: string;
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

const normalizeResponseBody = (body: unknown): string | undefined => {
  if (typeof body === 'string') {
    return body;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }
  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }
  if (body && typeof body === 'object') {
    try {
      return JSON.stringify(body);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const extractThrownHttpError = (error: unknown): ThrownHttpError | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const response = (error as {
    response?: {
      status?: number;
      statusCode?: number;
      body?: unknown;
    };
    message?: string;
  }).response;

  if (!response) {
    return undefined;
  }

  return {
    status:
      typeof response.status === 'number'
        ? response.status
        : typeof response.statusCode === 'number'
          ? response.statusCode
          : undefined,
    body: normalizeResponseBody(response.body),
    message:
      typeof (error as { message?: string }).message === 'string'
        ? (error as { message?: string }).message
        : undefined,
  };
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
      try {
        const valueFromEnv = env(key);
        return typeof valueFromEnv === 'string' ? valueFromEnv : '';
      } catch {
        return '';
      }
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

  private hasExplicitGoogleProviderAlias(): boolean {
    return [
      process.env.AUTH_KEYCLOAK_GOOGLE_IDP_ALIAS,
      process.env.AUTH_KEYCLOAK_GOOGLE_PROVIDER_ALIAS,
    ].some(
      (candidate) =>
        typeof candidate === 'string' && candidate.trim().length > 0,
    );
  }

  private getGoogleProviderAlias(): string {
    const candidates = [
      process.env.AUTH_KEYCLOAK_GOOGLE_IDP_ALIAS,
      process.env.AUTH_KEYCLOAK_GOOGLE_PROVIDER_ALIAS,
      'google',
    ];

    return (
      candidates.find(
        (candidate): candidate is string =>
          typeof candidate === 'string' && candidate.trim().length > 0,
      ) ?? 'google'
    ).trim();
  }

  private getIdentityProvidersEndpoint(): string | undefined {
    try {
      const issuerUrl = new URL(this.config.issuer);
      const pathParts = issuerUrl.pathname.split('/').filter(Boolean);
      const realmsIndex = pathParts.findIndex((part) => part === 'realms');
      const realm =
        realmsIndex >= 0 && pathParts[realmsIndex + 1]
          ? decodeURIComponent(pathParts[realmsIndex + 1]!)
          : undefined;

      if (!realm) {
        return undefined;
      }

      return `${issuerUrl.origin}/admin/realms/${encodeURIComponent(
        realm,
      )}/identity-provider/instances`;
    } catch {
      return undefined;
    }
  }

  private getBrokerTokenEndpoint(providerAlias: string): string {
    return `${this.config.issuer.replace(/\/$/, '')}/broker/${encodeURIComponent(
      providerAlias,
    )}/token`;
  }

  private async performRequest({
    url,
    method,
    headers,
    body,
    errorCode,
    errorPrefix,
  }: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
    errorCode: string;
    errorPrefix: string;
  }): Promise<string> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);

    const fetch = resolveFetchService();

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(body ? { body } : {}),
        signal: abortController.signal,
      });

      const responseText = await response.text();
      if (!response.ok) {
        const errorData = parseTokenErrorPayload(responseText);
        const errorMessage =
          errorData?.error_description ||
          errorData?.error ||
          response.statusText ||
          'Request failed';

        throw new TokenExchangeError(
          `${errorPrefix}: ${errorMessage}`,
          errorCode,
          response.status,
          responseText,
        );
      }

      return responseText;
    } catch (error) {
      if (error instanceof TokenExchangeError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TokenExchangeError(
          `${errorPrefix}: request timed out`,
          errorCode,
          undefined,
          error,
        );
      }

      const httpError = extractThrownHttpError(error);
      if (httpError) {
        const errorData = parseTokenErrorPayload(httpError.body);
        throw new TokenExchangeError(
          `${errorPrefix}: ${
            errorData?.error_description ||
            errorData?.error ||
            httpError.message ||
            'Request failed'
          }`,
          errorCode,
          httpError.status,
          httpError.body ?? error,
        );
      }

      throw new TokenExchangeError(
        `${errorPrefix}: ${error instanceof Error ? error.message : 'Unexpected error'}`,
        errorCode,
        undefined,
        error,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseTokenResponse(
    responseText: string,
    errorCode: string,
    status?: number,
  ): TokenExchangeResponse {
    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      throw new TokenExchangeError(
        'Invalid JSON response from Keycloak token endpoint',
        errorCode,
        status,
        error,
      );
    }

    if (!isObjectRecord(parsedResponse)) {
      throw new TokenExchangeError(
        'Invalid token response from Keycloak',
        errorCode,
        status,
        parsedResponse,
      );
    }

    return parsedResponse as TokenExchangeResponse;
  }

  private async getBrokeredGoogleTokens(
    subjectToken: string,
    providerAlias: string,
  ): Promise<GoogleTokens> {
    const responseText = await this.performRequest({
      url: this.getBrokerTokenEndpoint(providerAlias),
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${subjectToken}`,
      },
      errorCode: 'BROKER_TOKEN_FAILED',
      errorPrefix: 'Keycloak broker token retrieval failed',
    });

    return this.extractGoogleTokens(
      this.parseTokenResponse(responseText, 'BROKER_TOKEN_FAILED'),
    );
  }

  private async discoverGoogleProviderAlias(
    subjectToken: string,
  ): Promise<string | undefined> {
    const identityProvidersEndpoint = this.getIdentityProvidersEndpoint();
    if (!identityProvidersEndpoint) {
      return undefined;
    }

    const responseText = await this.performRequest({
      url: identityProvidersEndpoint,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${subjectToken}`,
      },
      errorCode: 'IDENTITY_PROVIDER_DISCOVERY_FAILED',
      errorPrefix: 'Keycloak identity provider discovery failed',
    });

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      throw new TokenExchangeError(
        'Invalid JSON response from Keycloak identity provider discovery',
        'IDENTITY_PROVIDER_DISCOVERY_FAILED',
        undefined,
        error,
      );
    }

    if (!Array.isArray(parsedResponse)) {
      throw new TokenExchangeError(
        'Invalid identity provider response from Keycloak',
        'IDENTITY_PROVIDER_DISCOVERY_FAILED',
        undefined,
        parsedResponse,
      );
    }

    const googleProvider = (parsedResponse as IdentityProviderDescriptor[]).find(
      (provider) => {
        const alias =
          typeof provider.alias === 'string'
            ? provider.alias.trim().toLowerCase()
            : '';
        const providerId =
          typeof provider.providerId === 'string'
            ? provider.providerId.trim().toLowerCase()
            : '';

        return (
          providerId === 'google' ||
          providerId.includes('google') ||
          alias === 'google' ||
          alias.includes('google')
        );
      },
    );

    return typeof googleProvider?.alias === 'string' &&
      googleProvider.alias.trim().length > 0
      ? googleProvider.alias.trim()
      : undefined;
  }

  private formatAttemptError(context: string, error: unknown): string {
    if (error instanceof TokenExchangeError) {
      return `${context}: ${error.message}`;
    }
    if (error instanceof Error) {
      return `${context}: ${error.message}`;
    }
    return `${context}: unexpected error`;
  }

  private async isKeycloakTokenBrokerV2Enabled(): Promise<boolean> {
    return (await getFeatureFlag('keycloak_token_broker_v2')) === true;
  }

  private async exchangeForBrokeredGoogleTokens({
    subjectToken,
    requestedIssuer,
    requestedTokenType,
    scope,
  }: Required<Pick<TokenExchangeParams, 'subjectToken' | 'requestedIssuer'>> &
    Pick<TokenExchangeParams, 'requestedTokenType' | 'scope'>): Promise<GoogleTokens> {
    const requestParams = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      subject_token: subjectToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      requested_token_type:
        requestedTokenType ??
        'urn:ietf:params:oauth:token-type:refresh_token',
      requested_issuer: requestedIssuer,
      ...(scope && { scope }),
    };

    const formBody = new URLSearchParams();
    Object.entries(requestParams).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        formBody.set(key, value);
      }
    });

    const responseText = await this.performRequest({
      url: this.tokenEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
      errorCode: 'BROKER_EXCHANGE_FAILED',
      errorPrefix: 'Keycloak broker token exchange failed',
    });

    return this.extractGoogleTokens(
      this.parseTokenResponse(responseText, 'BROKER_EXCHANGE_FAILED'),
    );
  }

  async extractKeycloakToken(
    req: NextRequest | NextApiRequest
  ): Promise<string> {
    try {
      const requestTokens = await getRequestTokens(
        req as Parameters<typeof getRequestTokens>[0]
      );
      if (requestTokens?.access_token) {
        return requestTokens.access_token;
      }

      const authSecret = [
        process.env.AUTH_SECRET,
        process.env.NEXTAUTH_SECRET,
        (() => {
          try {
            return env('AUTH_SECRET');
          } catch {
            return undefined;
          }
        })(),
      ].find(
        (candidate): candidate is string =>
          typeof candidate === 'string' && candidate.trim().length > 0,
      );
      const token = await getToken({
        req: req as NextRequest,
        secret: authSecret,
      }) as JWT | null;

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

    const formBody = new URLSearchParams();
    Object.entries(requestParams).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        formBody.set(key, value);
      }
    });

    const responseText = await this.performRequest({
      url: this.tokenEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
      errorCode: 'EXCHANGE_FAILED',
      errorPrefix: 'Keycloak token exchange failed',
    });

    return this.extractGoogleTokens(
      this.parseTokenResponse(responseText, 'INVALID_TOKEN_RESPONSE'),
    );
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
    const useBrokerV2Flow = await this.isKeycloakTokenBrokerV2Enabled();
    if (!useBrokerV2Flow) {
      return this.exchangeForGoogleTokens({
        subjectToken: keycloakToken,
        audience,
      });
    }

    const attemptedErrors: string[] = [];
    const tryBrokerFlows = async (
      providerAlias: string,
    ): Promise<GoogleTokens | undefined> => {
      try {
        return await this.getBrokeredGoogleTokens(keycloakToken, providerAlias);
      } catch (error) {
        attemptedErrors.push(
          this.formatAttemptError(`broker token (${providerAlias})`, error),
        );
      }

      try {
        return await this.exchangeForBrokeredGoogleTokens({
          subjectToken: keycloakToken,
          requestedIssuer: providerAlias,
        });
      } catch (error) {
        attemptedErrors.push(
          this.formatAttemptError(
            `broker exchange (${providerAlias})`,
            error,
          ),
        );
      }

      return undefined;
    };

    const configuredAlias = this.getGoogleProviderAlias();
    const configuredAliasTokens = await tryBrokerFlows(configuredAlias);
    if (configuredAliasTokens) {
      return configuredAliasTokens;
    }

    if (!this.hasExplicitGoogleProviderAlias()) {
      try {
        const discoveredAlias = await this.discoverGoogleProviderAlias(
          keycloakToken,
        );
        if (discoveredAlias && discoveredAlias !== configuredAlias) {
          const discoveredAliasTokens = await tryBrokerFlows(discoveredAlias);
          if (discoveredAliasTokens) {
            return discoveredAliasTokens;
          }
        }
      } catch (error) {
        attemptedErrors.push(
          this.formatAttemptError('identity provider discovery', error),
        );
      }
    }

    try {
      return await this.exchangeForGoogleTokens({
        subjectToken: keycloakToken,
        audience: audience ?? configuredAlias,
      });
    } catch (error) {
      if (attemptedErrors.length > 0) {
        const finalMessage =
          error instanceof TokenExchangeError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unexpected error';
        throw new TokenExchangeError(
          `${finalMessage}; prior attempts: ${attemptedErrors.join(' | ')}`,
          error instanceof TokenExchangeError
            ? error.code
            : 'EXCHANGE_FAILED',
          error instanceof TokenExchangeError ? error.status : undefined,
          error,
        );
      }
      throw error;
    }
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
