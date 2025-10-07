/**
 * @fileoverview Impersonation via Keycloak Admin REST API + Authorization Code flow using third-party libraries
 *
 * Libraries used:
 * - @keycloak/keycloak-admin-client for admin APIs (user lookup, auth)
 * - openid-client for OIDC discovery and token exchange
 * - got + tough-cookie for HTTP with cookie jar (impersonation + authorize redirects)
 */

import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomState,
  randomNonce,
  type Configuration as OIDCConfiguration,
} from 'openid-client';
import { got } from 'got';
import { CookieJar } from 'tough-cookie';
import { env } from '/lib/site-util/env';
import { log } from '/lib/logger';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import CryptoService from '/lib/site-util/auth/crypto-service';
import type {
  ImpersonationService,
  UserContext,
} from '/lib/auth/impersonation/impersonation.types';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { SystemTokenStore } from './system-token-store';
import { Session } from 'next-auth';
import { keycloakAdminClientFactory } from '../keycloak-factories';

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  expires_at?: number; // epoch seconds (openid-client TokenSet)
}

interface ThirdPartyConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const extractRealmFromIssuer = (issuer: string): string | undefined => {
  try {
    const u = new URL(issuer);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'realms');
    if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
    return undefined;
  } catch {
    return undefined;
  }
};

const adminBaseFromIssuer = (
  issuer: string,
): { origin: string; realm: string; adminBase: string } | undefined => {
  try {
    const u = new URL(issuer);
    const realm = extractRealmFromIssuer(issuer);
    if (!realm) return undefined;
    return {
      origin: u.origin,
      realm,
      adminBase: `${u.origin}/admin/realms/${encodeURIComponent(realm)}`,
    };
  } catch {
    return undefined;
  }
};

// no-op: query builder not needed with openid-client's authorizationUrl

/**
 * ImpersonationThirdParty – uses KC Admin Client, openid-client, and got/tough-cookie
 */
export class ImpersonationThirdParty implements ImpersonationService {
  private readonly userContext: UserContext;
  private readonly config: ThirdPartyConfig;
  private kcAdmin?: KeycloakAdminClient;
  private oidcConfig?: OIDCConfiguration;
  private cookieJar?: CookieJar;
  private cachedToken?: string;
  private tokenExpiry?: Date;
  #adminTokenStore: SystemTokenStore = SystemTokenStore.getInstance();
  private crypto?: CryptoService;

  constructor(userContext: UserContext, config: ThirdPartyConfig) {
    this.userContext = userContext;
    this.config = config;
  }

  static async fromRequest({
    session,
  }: {
    audience?: string;
    session: Session;
  }): Promise<ImpersonationThirdParty | undefined> {
    try {
      if (!session?.user) return undefined;
      const userContext: UserContext = {
        userId: session.user.subject || session.user.id || '',
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        accountId:
          'account_id' in session.user ? session.user.account_id : undefined,
      };
      if (!userContext.email) return undefined;

      const config: ThirdPartyConfig = {
        issuer: env('AUTH_KEYCLOAK_ISSUER') || '',
        clientId: env('AUTH_KEYCLOAK_CLIENT_ID') || '',
        clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET') || '',
        redirectUri: env('AUTH_KEYCLOAK_REDIRECT_URI') || '',
      };

      if (
        !config.issuer ||
        !config.clientId ||
        !config.clientSecret ||
        !config.redirectUri
      ) {
        log((l) => l.warn('ImpersonationThirdParty: incomplete config'));
        return undefined;
      }

      const self = new ImpersonationThirdParty(userContext, config);
      await self.initializeClients();
      return self;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ImpersonationThirdParty.fromRequest',
        severity: 'error',
        message: 'Failed creating ImpersonationThirdParty',
      });
      return undefined;
    }
  }

  private async initializeClients(): Promise<void> {
    // OIDC discovery and client
    this.oidcConfig = await discovery(
      new URL(this.config.issuer),
      this.config.clientId,
      this.config.clientSecret,
    );

    // Keycloak Admin client
    const parsed = adminBaseFromIssuer(this.config.issuer);
    if (!parsed)
      throw new Error(
        'ImpersonationThirdParty: unable to parse realm from issuer',
      );
    const { origin, realm } = parsed;
    this.kcAdmin = keycloakAdminClientFactory({
      baseUrl: origin,
      realmName: realm,
    });

    // Cookie jar for admin impersonation and authorize request
    this.cookieJar = new CookieJar();
  }

  async getImpersonatedToken(forceRefresh = false): Promise<string> {
    const tracer = trace.getTracer('noeducation/impersonation');
    return await tracer.startActiveSpan(
      'impersonation.getImpersonatedToken',
      async (span) => {
        span.setAttribute('impersonation.userId', this.userContext.userId);
        if (this.userContext.email)
          span.setAttribute('impersonation.email', this.userContext.email);
        try {
          // Fast-path cached token if valid and not forcing refresh
          if (
            !forceRefresh &&
            this.cachedToken &&
            this.tokenExpiry &&
            this.tokenExpiry > new Date()
          ) {
            span.setStatus({ code: SpanStatusCode.OK });
            return this.cachedToken;
          }

          // Helper for a single attempt; keeps logic contained
          const attemptOnce = async (): Promise<string> => {
            if (!this.kcAdmin || !this.oidcConfig || !this.cookieJar) {
              await this.initializeClients();
            }

            const adminToken = await this.#adminTokenStore.getAdminToken();
            this.kcAdmin!.setAccessToken(adminToken);

            const userId = await this.findUserIdViaAdmin(
              this.userContext.email!,
            );
            if (!userId)
              throw new Error('ImpersonationThirdParty: target user not found');

            await this.performImpersonation(adminToken, userId);

            const access = await this.authorizeAndExchange();

            this.cachedToken = access.access_token;
            if (access.expires_at) {
              this.tokenExpiry = new Date(access.expires_at * 1000 - 60_000);
            } else if (access.expires_in) {
              this.tokenExpiry = new Date(
                Date.now() + Math.max(60, access.expires_in) * 1000 - 60_000,
              );
            } else {
              this.tokenExpiry = new Date(Date.now() + 10 * 60_000);
            }
            return this.cachedToken!;
          };

          // First attempt
          try {
            const token = await attemptOnce();
            span.setStatus({ code: SpanStatusCode.OK });
            return token;
          } catch (firstErr) {
            // Clear caches and retry once with a fresh instance
            const msg = (firstErr as Error)?.message || '';
            // Do NOT retry for logical/semantic errors where a retry won't help
            const nonRetryable =
              /target user not found|missing impersonator credentials|unable to locate login form action|admin login failed|admin password step failed|unable to locate password form|expected 302 from authorize|expected 302 with code after admin login/i;
            if (nonRetryable.test(msg)) {
              span.recordException(firstErr as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw firstErr;
            }
            try {
              span.addEvent('impersonation.retry');
            } catch {
              // ignore addEvent errors
            }
            await this.clearAllCachedCredentials();
            try {
              const token = await attemptOnce();
              span.setStatus({ code: SpanStatusCode.OK });
              return token;
            } catch (secondErr) {
              // Record the last error and rethrow
              try {
                span.recordException(secondErr as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
              } catch {}
              throw secondErr;
            }
          }
        } finally {
          span.end();
        }
      },
    );
  }

  getUserContext(): Readonly<UserContext> {
    return { ...this.userContext };
  }

  clearCache(): void {
    this.cachedToken = undefined;
    this.tokenExpiry = undefined;
  }

  hasCachedToken(): boolean {
    return !!(
      this.cachedToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    );
  }

  // --- internals ---

  private async findUserIdViaAdmin(
    identifier: string,
  ): Promise<string | undefined> {
    if (!this.kcAdmin) throw new Error('kcAdmin not initialized');

    // Try exact username
    const byUsername = await this.kcAdmin.users
      .find({ username: identifier, exact: true })
      .catch(() => []);
    if (Array.isArray(byUsername) && byUsername[0]?.id) return byUsername[0].id;

    // Try exact email
    const byEmail = await this.kcAdmin.users
      .find({ email: identifier, exact: true })
      .catch(() => []);
    if (Array.isArray(byEmail) && byEmail[0]?.id) return byEmail[0].id;

    // Fallback search
    const search = await this.kcAdmin.users
      .find({ search: identifier })
      .catch(() => []);
    if (Array.isArray(search) && search[0]?.id) return search[0].id;

    return undefined;
  }

  private async performImpersonation(
    adminToken: string,
    userId: string,
  ): Promise<void> {
    if (!this.cookieJar) throw new Error('cookieJar not initialized');

    const parsed = adminBaseFromIssuer(this.config.issuer);
    if (!parsed)
      throw new Error('ImpersonationThirdParty: cannot derive admin base');
    const url = `${parsed.adminBase}/users/${encodeURIComponent(userId)}/impersonation`;

    const resp = await got.post(url, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
      cookieJar: this.cookieJar,
      followRedirect: false,
      throwHttpErrors: false,
    });

    if (resp.statusCode !== 200 && resp.statusCode !== 302) {
      throw new Error(
        `ImpersonationThirdParty: impersonation failed ${resp.statusCode} ${resp.body?.toString?.() ?? ''}`,
      );
    }
  }

  private async authorizeAndExchange(): Promise<TokenResponse> {
    if (!this.oidcConfig || !this.cookieJar)
      throw new Error('OIDC config/cookieJar not initialized');

    const state = randomState();
    const nonce = randomNonce();

    const authorizeUrl = buildAuthorizationUrl(this.oidcConfig, {
      redirect_uri: this.config.redirectUri,
      scope: 'openid',
      response_type: 'code',
      response_mode: 'query',
      prompt: 'none',
      state,
      nonce,
    });

    const resp = await got.get(authorizeUrl.toString(), {
      cookieJar: this.cookieJar,
      followRedirect: false,
      throwHttpErrors: false,
    });

    if (resp.statusCode !== 302) {
      throw new Error(
        `ImpersonationThirdParty: expected 302 from authorize, got ${resp.statusCode}`,
      );
    }

    const location = resp.headers.location;
    if (!location)
      throw new Error(
        'ImpersonationThirdParty: missing Location header from authorize response',
      );

    const currentUrl = new URL(location, this.config.redirectUri);
    const token = await authorizationCodeGrant(this.oidcConfig, currentUrl, {
      expectedState: state,
      expectedNonce: nonce,
    });

    return {
      access_token: token.access_token as string,
      expires_in: token.expires_in ?? undefined,
      refresh_token: token.refresh_token ?? undefined,
      scope: token.scope ?? undefined,
      token_type: token.token_type ?? undefined,
    };
  }

  // --- offline token helpers ---

  /**
   * Clear all cached credentials (user/admin tokens, expirations, cookie jar),
   * remove any stored offline token from Redis/env, and reinitialize clients
   * on next usage to ensure a fresh attempt.
   */
  private async clearAllCachedCredentials(): Promise<void> {
    // Clear memory caches (user tokens)
    this.cachedToken = undefined;
    this.tokenExpiry = undefined;

    // Clear admin token store cache (includes Redis cleanup)
    await this.#adminTokenStore.clearCache();

    // Reset third-party clients to force fresh initialization
    this.kcAdmin = undefined;
    this.oidcConfig = undefined;
    this.cookieJar = undefined;
  }
}
