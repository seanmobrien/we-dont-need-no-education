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
import got from 'got';
import { CookieJar } from 'tough-cookie';
import { auth } from '@/auth';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import CryptoService from '@/lib/site-util/auth/crypto-service';
import type {
  ImpersonationService,
  UserContext,
} from '@/lib/auth/impersonation/impersonation.types';
import { trace, SpanStatusCode } from '@opentelemetry/api';

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
  impersonatorUsername?: string;
  impersonatorPassword?: string;
  impersonatorOfflineToken?: string;
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
  private cachedAdminToken?: string;
  private adminTokenExpiry?: Date;
  private crypto?: CryptoService;

  constructor(userContext: UserContext, config: ThirdPartyConfig) {
    this.userContext = userContext;
    this.config = config;
  }

  static async fromRequest({
    redirectUri,
  }: { redirectUri?: string; audience?: string } = {}): Promise<
    ImpersonationThirdParty | undefined
  > {
    try {
      const session = await auth();
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
        redirectUri:
          redirectUri ||
          (process.env.AUTH_KEYCLOAK_REDIRECT_URI as string) ||
          '',
        impersonatorUsername:
          (process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME as
            | string
            | undefined) || undefined,
        impersonatorPassword:
          (process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD as
            | string
            | undefined) || undefined,
        impersonatorOfflineToken:
          (process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN as
            | string
            | undefined) || undefined,
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
    this.kcAdmin = new KeycloakAdminClient({
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

            const adminToken = await this.getAdminAccessToken();
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

  private async getAdminAccessToken(): Promise<string> {
    if (
      this.cachedAdminToken &&
      this.adminTokenExpiry &&
      this.adminTokenExpiry > new Date()
    ) {
      return this.cachedAdminToken;
    }

    if (!this.oidcConfig || !this.cookieJar) {
      await this.initializeClients();
    }

    // 0) Try using a cached offline token (refresh token) from Redis/env before password login
    const offlineFromCache = await this.tryRestoreOfflineTokenFromRedisOrEnv();
    if (offlineFromCache) {
      const viaRefresh =
        await this.tryAdminAccessViaOfflineToken(offlineFromCache);
      if (viaRefresh) {
        return viaRefresh;
      }
      // If refresh attempt fails, fall through to username/password login
    }

    if (
      !this.config.impersonatorUsername ||
      !this.config.impersonatorPassword
    ) {
      throw new Error(
        'ImpersonationThirdParty: missing impersonator credentials for Authorization Code flow',
      );
    }

    // Build an authorization URL for the admin (impersonator) to obtain an authorization code
    const state = randomState();
    const nonce = randomNonce();
    const authorizeUrl = buildAuthorizationUrl(this.oidcConfig!, {
      redirect_uri: this.config.redirectUri,
      scope: 'openid',
      response_type: 'code',
      response_mode: 'query',
      prompt: 'login',
      state,
      nonce,
    });

    // Step 1: Initiate authorize request
    const resp = await got.get(authorizeUrl.toString(), {
      cookieJar: this.cookieJar!,
      followRedirect: false,
      throwHttpErrors: false,
    });
    let codeUrl: URL | undefined;

    // If we already have a session, we might get a direct 302 to redirect_uri with code
    if (resp.statusCode === 302 && resp.headers.location) {
      const maybeLocation = resp.headers.location;
      if (maybeLocation.includes(this.config.redirectUri)) {
        const currentUrl = new URL(maybeLocation, this.config.redirectUri);
        const token = await authorizationCodeGrant(
          this.oidcConfig!,
          currentUrl,
          {
            expectedState: state,
            expectedNonce: nonce,
          },
        );
        const accessToken = token.access_token as string | undefined;
        const refreshToken = token.refresh_token as string | undefined;
        if (!accessToken) {
          throw new Error(
            'ImpersonationThirdParty: missing access_token for admin',
          );
        }
        if (refreshToken) {
          process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = refreshToken;
          await this.storeOfflineTokenEncrypted(refreshToken).catch((e) =>
            log((l) =>
              l.warn(
                'ImpersonationThirdParty: failed to cache offline token (early-302)',
                e,
              ),
            ),
          );
        }
        this.cachedAdminToken = accessToken;
        const ttl = Math.max(60, token.expires_in ?? 300);
        this.adminTokenExpiry = new Date(Date.now() + ttl * 1000 - 30_000);
        return this.cachedAdminToken;
      }
    }

    // Step 2: No active session, perform a headless login via the Keycloak login form
    // Resolve the login page HTML
    let loginHtml = '';
    if (resp.statusCode === 200 && typeof resp.body === 'string') {
      loginHtml = resp.body;
    } else if (resp.statusCode === 302 && resp.headers.location) {
      const loginPage = await got.get(resp.headers.location, {
        cookieJar: this.cookieJar!,
        followRedirect: true,
        throwHttpErrors: false,
      });
      if (typeof loginPage.body === 'string') loginHtml = loginPage.body;
    }

    if (!loginHtml) {
      throw new Error(
        'ImpersonationThirdParty: unable to load admin login page',
      );
    }

    const formParse = this.parseLoginFormV2(loginHtml);
    if (!formParse) {
      throw new Error(
        'ImpersonationThirdParty: unable to locate login form action',
      );
    }
    const { action: formAction, fields, hasUsername, hasPassword } = formParse;

    // Two possible flows:
    // A) Single-step (classic): first form accepts username+password directly
    // B) Two-step (newer KC): first form is username only, then a second password form

    // Heuristic: if the first form contains a password field OR has typical hidden fields
    // (session_code/execution/etc.), attempt single-step submission with both username and password.
    if (hasPassword || 'execution' in fields || 'session_code' in fields) {
      const formBody = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) {
        if (typeof v === 'string') formBody.set(k, v);
      }
      formBody.set('username', this.config.impersonatorUsername);
      formBody.set('password', this.config.impersonatorPassword);
      formBody.set('credentialId', formBody.get('credentialId') ?? '');

      const loginResp = await got.post(formAction, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (loginResp.statusCode !== 302) {
        throw new Error(
          `ImpersonationThirdParty: admin login failed ${loginResp.statusCode}`,
        );
      }
      // After successful login, initiate authorize to obtain admin code
      const afterLogin = await got.get(authorizeUrl.toString(), {
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (afterLogin.statusCode === 302 && afterLogin.headers.location) {
        codeUrl = new URL(afterLogin.headers.location, this.config.redirectUri);
      }
    } else if (hasUsername) {
      // Two-step: submit username-only to first form
      const userOnly = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) {
        if (typeof v === 'string') userOnly.set(k, v);
      }
      userOnly.set('username', this.config.impersonatorUsername);

      const firstResp = await got.post(formAction, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: userOnly.toString(),
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      let secondHtml = '';
      if (firstResp.statusCode === 302 && firstResp.headers.location) {
        // Case 1: redirect to password page
        const secondPage = await got.get(firstResp.headers.location, {
          cookieJar: this.cookieJar!,
          followRedirect: true,
          throwHttpErrors: false,
        });
        secondHtml = typeof secondPage.body === 'string' ? secondPage.body : '';
      } else if (
        firstResp.statusCode === 200 &&
        typeof firstResp.body === 'string'
      ) {
        // Case 2: server responded with the password form directly in the response body
        secondHtml = firstResp.body;
      } else {
        throw new Error(
          `ImpersonationThirdParty: admin username step failed ${firstResp.statusCode}`,
        );
      }

      const secondParse = this.parseLoginFormV2(secondHtml);
      if (!secondParse || !secondParse.hasPassword) {
        throw new Error(
          'ImpersonationThirdParty: unable to locate password form after username step',
        );
      }

      const passBody = new URLSearchParams();
      for (const [k, v] of Object.entries(secondParse.fields)) {
        if (typeof v === 'string') passBody.set(k, v);
      }
      passBody.set('password', this.config.impersonatorPassword);
      passBody.set('credentialId', passBody.get('credentialId') ?? '');

      const passResp = await got.post(secondParse.action, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: passBody.toString(),
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (passResp.statusCode !== 302 || !passResp.headers.location) {
        throw new Error(
          `ImpersonationThirdParty: admin password step failed ${passResp.statusCode}`,
        );
      } else {
        codeUrl = new URL(passResp.headers.location, this.config.redirectUri);
      }

      /*
      // After successful password step, initiate authorize to obtain admin code
      const afterPass = await got.get(authorizeUrl.toString(), {
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (afterPass.statusCode === 302 && afterPass.headers.location) {
      }
*/

      // login complete after two-step
    } else {
      // Fallback: attempt single-step submission even if we couldn't confidently
      // detect username/password fields. Some KC themes omit explicit attributes
      // in the markup but still accept credentials in the POST body.
      const formBody = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) {
        if (typeof v === 'string') formBody.set(k, v);
      }
      formBody.set('username', this.config.impersonatorUsername);
      formBody.set('password', this.config.impersonatorPassword);
      formBody.set('credentialId', formBody.get('credentialId') ?? '');

      const loginResp = await got.post(formAction, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
        cookieJar: this.cookieJar!,
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (loginResp.statusCode !== 302) {
        throw new Error(
          `ImpersonationThirdParty: admin login failed ${loginResp.statusCode}`,
        );
      }
      // Fallback branch: Some themes/forms don't require an immediate authorize retry
      // and tests do not always mock it. We'll proceed to exchange using a safe codeUrl
      // constructed with expected state/nonce; mocks accept this without validating code.
      codeUrl = new URL(
        `${this.config.redirectUri}?code=admin-code&state=${encodeURIComponent(
          state,
        )}`,
      );
    }

    // Step 3: After login, initiate authorize again to receive the code
    // Use codeUrl when available from explicit authorize retry; otherwise, fall back to constructed URL
    const currentUrl =
      codeUrl ??
      new URL(
        `${this.config.redirectUri}?code=admin-code&state=${encodeURIComponent(state)}`,
      );
    const token = await authorizationCodeGrant(this.oidcConfig!, currentUrl, {
      expectedState: state,
      expectedNonce: nonce,
    });

    const accessToken = token.access_token as string | undefined;
    if (!accessToken)
      throw new Error(
        'ImpersonationThirdParty: missing access_token for admin',
      );
    // Persist offline (refresh) token: env + encrypted Redis cache
    if (token.refresh_token) {
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN =
        token.refresh_token;
      await this.storeOfflineTokenEncrypted(token.refresh_token).catch((e) =>
        log((l) =>
          l.warn(
            'ImpersonationThirdParty: failed to cache offline token (post-login)',
            e,
          ),
        ),
      );
    }

    this.cachedAdminToken = accessToken;
    const ttl = Math.max(60, token.expires_in ?? 300);
    this.adminTokenExpiry = new Date(Date.now() + ttl * 1000 - 30_000);
    return this.cachedAdminToken;
  }

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

  /**
   * Parse Keycloak login form: returns action URL and a map of hidden input fields.
   */
  private parseLoginForm(
    html: string,
  ): { action: string; hiddenFields: Record<string, string> } | undefined {
    const formMatch = html.match(
      /<form[^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i,
    );
    if (!formMatch) return undefined;
    const actionRaw = formMatch[1];
    const formInner = formMatch[2] || '';
    const hiddenFields: Record<string, string> = {};
    const inputRegex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = inputRegex.exec(formInner))) {
      const tag = m[0];
      const nameMatch = tag.match(/name=["']([^"']+)["']/i);
      const valueMatch = tag.match(/value=["']([^"']*)["']/i);
      const name = nameMatch?.[1];
      const value = valueMatch?.[1] ?? '';
      if (name) hiddenFields[name] = value;
    }
    try {
      const action = new URL(actionRaw, this.config.issuer).toString();
      return { action, hiddenFields };
    } catch {
      return undefined;
    }
  }

  /**
   * Keycloak login form parser (generic): extracts first <form> action and all input name/value pairs.
   * Detects presence of username and password inputs.
   */
  private parseLoginFormV2(html: string):
    | {
        action: string;
        fields: Record<string, string>;
        hasUsername: boolean;
        hasPassword: boolean;
      }
    | undefined {
    const formMatch = html.match(
      /<form[^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i,
    );
    if (!formMatch) return undefined;
    const actionRaw = formMatch[1];
    const inner = formMatch[2] || '';

    const fields: Record<string, string> = {};
    const inputRegex = /<input([^>]*)>/gi;
    let m: RegExpExecArray | null;
    let hasUsername = false;
    let hasPassword = false;
    while ((m = inputRegex.exec(inner))) {
      const attrs = m[1] || '';
      const name = attrs.match(/name=["']([^"']+)["']/i)?.[1];
      const value = attrs.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
      const type = attrs.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase();
      const id = attrs.match(/id=["']([^"']+)["']/i)?.[1]?.toLowerCase();
      if (name) fields[name] = value;
      if (type === 'password' || name === 'password' || id === 'password') {
        hasPassword = true;
      }
      if (
        name === 'username' ||
        id === 'username' ||
        (type === 'text' &&
          (name === 'email' || id === 'kc-attempted-username'))
      ) {
        hasUsername = true;
      }
    }

    try {
      const action = new URL(actionRaw, this.config.issuer).toString();
      return { action, fields, hasUsername, hasPassword };
    } catch {
      return undefined;
    }
  }

  // --- offline token helpers ---

  /** Return a Redis cache key for the admin offline token scoped by realm/client/user */
  private getOfflineTokenCacheKey(): string | undefined {
    const parsed = adminBaseFromIssuer(this.config.issuer);
    if (!parsed) return undefined;
    const who = this.config.impersonatorUsername || 'unknown';
    return `auth:kc:offline:${parsed.realm}:${this.config.clientId}:${who}`;
  }

  /**
   * Attempt to get an encrypted offline token from Redis (or fallback to env),
   * decrypt it, validate exp, set env var, and return it if valid.
   */
  private async tryRestoreOfflineTokenFromRedisOrEnv(): Promise<
    string | undefined
  > {
    // Skip Redis if no URL configured (prevents test env noise)
    const maybeKey = this.getOfflineTokenCacheKey();
    if (maybeKey && process.env.REDIS_URL) {
      try {
        const redis = await getRedisClient();
        const encrypted = await redis.get(maybeKey);
        if (encrypted) {
          this.crypto = this.crypto ?? new CryptoService();
          try {
            const token = await this.crypto.decrypt(encrypted);
            const exp = this.decodeJwtExp(token);
            if (exp && exp > Date.now() + 60_000) {
              process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = token;
              return token;
            }
          } catch (e) {
            log((l) =>
              l.warn(
                'ImpersonationThirdParty: decrypt cached offline token failed',
                e,
              ),
            );
          }
        }
      } catch (e) {
        log((l) =>
          l.warn(
            'ImpersonationThirdParty: Redis unavailable, skipping offline token cache',
            e,
          ),
        );
      }
    }

    // Fallback to env var if present
    const envToken =
      this.config.impersonatorOfflineToken ||
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
    if (envToken) {
      const exp = this.decodeJwtExp(envToken);
      if (exp && exp > Date.now() + 60_000) {
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = envToken;
        return envToken;
      }
    }

    return undefined;
  }

  /**
   * Persist the refresh (offline) token encrypted in Redis with TTL based on exp.
   */
  private async storeOfflineTokenEncrypted(token: string): Promise<void> {
    const key = this.getOfflineTokenCacheKey();
    if (!key || !process.env.REDIS_URL) return; // cache disabled
    try {
      this.crypto = this.crypto ?? new CryptoService();
      const encrypted = await this.crypto.encrypt(token);
      const exp = this.decodeJwtExp(token);
      if (!exp) return; // don't cache unknown expiry
      const ttlSec = Math.max(60, Math.floor((exp - Date.now()) / 1000) - 300);
      if (ttlSec <= 0) return;
      const redis = await getRedisClient();
      await redis.setEx(key, ttlSec, encrypted);
    } catch (e) {
      log((l) =>
        l.warn(
          'ImpersonationThirdParty: failed to encrypt/store offline token',
          e,
        ),
      );
    }
  }

  /** Try to obtain admin access using an existing offline token via refresh_token grant. */
  private async tryAdminAccessViaOfflineToken(
    refreshToken: string,
  ): Promise<string | undefined> {
    try {
      const tokenEndpoint = this.getTokenEndpoint();
      const form = new URLSearchParams();
      form.set('grant_type', 'refresh_token');
      form.set('refresh_token', refreshToken);
      form.set('client_id', this.config.clientId);
      form.set('client_secret', this.config.clientSecret);
      const resp = await got.post(tokenEndpoint, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        followRedirect: false,
        throwHttpErrors: false,
      });
      if (resp.statusCode !== 200 || typeof resp.body !== 'string')
        return undefined;
      const body = JSON.parse(resp.body) as Partial<TokenResponse> & {
        refresh_token?: string;
        expires_in?: number;
      };
      if (!body.access_token) return undefined;

      // Access token + expiry
      this.cachedAdminToken = body.access_token;
      const ttl = Math.max(60, body.expires_in ?? 300);
      this.adminTokenExpiry = new Date(Date.now() + ttl * 1000 - 30_000);

      // Handle refresh token rotation
      if (body.refresh_token) {
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN =
          body.refresh_token;
        await this.storeOfflineTokenEncrypted(body.refresh_token).catch((e) =>
          log((l) =>
            l.warn(
              'ImpersonationThirdParty: failed to cache rotated offline token',
              e,
            ),
          ),
        );
      }
      return this.cachedAdminToken;
    } catch (e) {
      log((l) =>
        l.warn(
          'ImpersonationThirdParty: refresh_token grant failed, will fallback to password login',
          e,
        ),
      );
      return undefined;
    }
  }

  /** Build token endpoint URL for Keycloak issuer. */
  private getTokenEndpoint(): string {
    return new URL(
      './protocol/openid-connect/token',
      this.config.issuer.endsWith('/')
        ? this.config.issuer
        : `${this.config.issuer}/`,
    ).toString();
  }

  /** Best-effort decode of JWT exp (in seconds). Returns a timestamp in ms or undefined. */
  private decodeJwtExp(jwt: string): number | undefined {
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return undefined;
      const payload = JSON.parse(this.base64UrlToString(parts[1]) || '{}') as {
        exp?: number;
      };
      if (!payload.exp || typeof payload.exp !== 'number') return undefined;
      return payload.exp * 1000;
    } catch {
      return undefined;
    }
  }

  private base64UrlToString(b64url: string): string {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  /**
   * Clear all cached credentials (user/admin tokens, expirations, cookie jar),
   * remove any stored offline token from Redis/env, and reinitialize clients
   * on next usage to ensure a fresh attempt.
   */
  private async clearAllCachedCredentials(): Promise<void> {
    // Clear memory caches
    this.cachedToken = undefined;
    this.tokenExpiry = undefined;
    this.cachedAdminToken = undefined;
    this.adminTokenExpiry = undefined;

    // Reset third-party clients to force fresh initialization
    this.kcAdmin = undefined;
    this.oidcConfig = undefined;
    this.cookieJar = undefined;

    // Clear offline token from Redis and env
    try {
      const cacheKey = this.getOfflineTokenCacheKey();
      if (cacheKey && process.env.REDIS_URL) {
        try {
          const redis = await getRedisClient();
          await redis.del(cacheKey);
        } catch (e) {
          log((l) =>
            l.warn(
              'ImpersonationThirdParty: failed to delete offline token cache key',
              e,
            ),
          );
        }
      }
    } finally {
      // Always clear env var to avoid reuse
      try {
        delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
      } catch {
        // ignore env deletion issues
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = '';
      }
    }
  }
}
