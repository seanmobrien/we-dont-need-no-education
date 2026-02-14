import { got } from 'got';
import { CookieJar } from 'tough-cookie';
import { env } from '@compliance-theater/env';
import { log, LoggedError } from '@compliance-theater/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { SystemTokenStore } from './system-token-store';
import { keycloakAdminClientFactory } from '../keycloak-factories';
const extractRealmFromIssuer = (issuer) => {
    try {
        const u = new URL(issuer);
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex((p) => p === 'realms');
        if (idx >= 0 && parts[idx + 1])
            return decodeURIComponent(parts[idx + 1]);
        return undefined;
    }
    catch {
        return undefined;
    }
};
const adminBaseFromIssuer = (issuer) => {
    try {
        const u = new URL(issuer);
        const realm = extractRealmFromIssuer(issuer);
        if (!realm)
            return undefined;
        return {
            origin: u.origin,
            realm,
            adminBase: `${u.origin}/admin/realms/${encodeURIComponent(realm)}`,
        };
    }
    catch {
        return undefined;
    }
};
let openIdClientModule = null;
const getOpenIdClientModule = () => {
    if (openIdClientModule) {
        return openIdClientModule;
    }
    const { discovery, buildAuthorizationUrl, authorizationCodeGrant, randomState, randomNonce, } = require('openid-client');
    openIdClientModule = {
        discovery,
        buildAuthorizationUrl,
        authorizationCodeGrant,
        randomState,
        randomNonce,
    };
    return openIdClientModule;
};
const ADMIN_USER_CONTEXT = Symbol('@no-education/ImpersonationThirdParty.ADMIN_USER_CONTEXT');
const ADMIN_USER_CONTEXT_ID = '__admin';
const isSystemUserContext = (check) => {
    return (typeof check === 'object' &&
        check !== null &&
        ADMIN_USER_CONTEXT in check &&
        check[ADMIN_USER_CONTEXT] === true);
};
export class ImpersonationThirdParty {
    userContext;
    config;
    kcAdmin;
    oidcConfig;
    cookieJar;
    cachedToken;
    tokenExpiry;
    #adminTokenStore = SystemTokenStore.getInstance();
    crypto;
    constructor(userContext, config) {
        this.userContext = userContext;
        this.config = config;
    }
    static #getConfig() {
        const config = {
            issuer: env('AUTH_KEYCLOAK_ISSUER') || '',
            clientId: env('AUTH_KEYCLOAK_CLIENT_ID') || '',
            clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET') || '',
            redirectUri: env('AUTH_KEYCLOAK_REDIRECT_URI') || '',
        };
        if (!config.issuer ||
            !config.clientId ||
            !config.clientSecret ||
            !config.redirectUri) {
            log((l) => l.warn('ImpersonationThirdParty: incomplete config'));
            return undefined;
        }
        return config;
    }
    static async fromRequest({ session, ...props }) {
        return ImpersonationThirdParty.fromUser({ user: session?.user, ...props });
    }
    static async fromUser({ user, }) {
        try {
            if (!user)
                return undefined;
            const userContext = {
                userId: user.subject || user.id || '',
                email: user.email || undefined,
                name: user.name || undefined,
                accountId: 'account_id' in user ? user.account_id : undefined,
                hash: user.hash || undefined,
            };
            if (!userContext.email)
                return undefined;
            const config = ImpersonationThirdParty.#getConfig();
            if (!config) {
                return undefined;
            }
            const self = new ImpersonationThirdParty(userContext, config);
            await self.initializeClients();
            return self;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ImpersonationThirdParty.fromRequest',
                severity: 'error',
                message: 'Failed creating ImpersonationThirdParty',
            });
            return undefined;
        }
    }
    static async forAdmin() {
        try {
            const config = ImpersonationThirdParty.#getConfig();
            if (!config) {
                return undefined;
            }
            const adminContext = {
                userId: ADMIN_USER_CONTEXT_ID,
                [ADMIN_USER_CONTEXT]: true,
            };
            const self = new ImpersonationThirdParty(adminContext, config);
            await self.initializeClients();
            return self;
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ImpersonationThirdParty.forAdmin',
                severity: 'error',
                message: 'Failed creating ImpersonationThirdParty for admin',
            });
            return undefined;
        }
    }
    async initializeClients() {
        this.oidcConfig = await getOpenIdClientModule().discovery(new URL(this.config.issuer), this.config.clientId, this.config.clientSecret);
        const parsed = adminBaseFromIssuer(this.config.issuer);
        if (!parsed)
            throw new Error('ImpersonationThirdParty: unable to parse realm from issuer');
        const { origin, realm } = parsed;
        this.kcAdmin = await keycloakAdminClientFactory({
            baseUrl: origin,
            realmName: realm,
        });
        this.cookieJar = new CookieJar();
    }
    async getImpersonatedToken(forceRefresh = false) {
        const tracer = trace.getTracer('noeducation/impersonation');
        return await tracer.startActiveSpan('impersonation.getImpersonatedToken', async (span) => {
            if (isSystemUserContext(this.userContext)) {
                span.setAttribute('impersonation.userId', 'system');
                span.setAttribute('impersonation.admin', true);
                try {
                    return await this.#adminTokenStore.getAdminToken(forceRefresh);
                }
                catch (error) {
                    span.recordException(error);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'ImpersonationThirdParty.getImpersonatedToken',
                    });
                }
                finally {
                    try {
                        span.end();
                    }
                    catch { }
                }
            }
            span.setAttribute('impersonation.userId', this.userContext.userId);
            if (this.userContext.email)
                span.setAttribute('impersonation.email', this.userContext.email);
            try {
                if (!forceRefresh &&
                    this.cachedToken &&
                    this.tokenExpiry &&
                    this.tokenExpiry > new Date()) {
                    span.setStatus({ code: SpanStatusCode.OK });
                    return this.cachedToken;
                }
                const attemptOnce = async () => {
                    if (!this.kcAdmin || !this.oidcConfig || !this.cookieJar) {
                        await this.initializeClients();
                    }
                    const adminToken = await this.#adminTokenStore.getAdminToken();
                    this.kcAdmin.setAccessToken(adminToken);
                    const userId = await this.findUserIdViaAdmin(this.userContext.email);
                    if (!userId)
                        throw new Error('ImpersonationThirdParty: target user not found');
                    await this.performImpersonation(adminToken, userId);
                    const access = await this.authorizeAndExchange();
                    this.cachedToken = access.access_token;
                    if (access.expires_at) {
                        this.tokenExpiry = new Date(access.expires_at * 1000 - 60_000);
                    }
                    else if (access.expires_in) {
                        this.tokenExpiry = new Date(Date.now() + Math.max(60, access.expires_in) * 1000 - 60_000);
                    }
                    else {
                        this.tokenExpiry = new Date(Date.now() + 10 * 60_000);
                    }
                    return this.cachedToken;
                };
                try {
                    const token = await attemptOnce();
                    span.setStatus({ code: SpanStatusCode.OK });
                    return token;
                }
                catch (firstErr) {
                    const msg = firstErr?.message || '';
                    const nonRetryable = /target user not found|missing impersonator credentials|unable to locate login form action|admin login failed|admin password step failed|unable to locate password form|expected 302 from authorize|expected 302 with code after admin login/i;
                    if (nonRetryable.test(msg)) {
                        span.recordException(firstErr);
                        span.setStatus({ code: SpanStatusCode.ERROR });
                        throw firstErr;
                    }
                    try {
                        span.addEvent('impersonation.retry');
                    }
                    catch {
                    }
                    await this.clearAllCachedCredentials();
                    try {
                        const token = await attemptOnce();
                        span.setStatus({ code: SpanStatusCode.OK });
                        return token;
                    }
                    catch (secondErr) {
                        try {
                            span.recordException(secondErr);
                            span.setStatus({ code: SpanStatusCode.ERROR });
                        }
                        catch { }
                        throw secondErr;
                    }
                }
            }
            finally {
                span.end();
            }
        });
    }
    getUserContext() {
        return { ...this.userContext };
    }
    clearCache() {
        this.cachedToken = undefined;
        this.tokenExpiry = undefined;
    }
    hasCachedToken() {
        return !!(this.cachedToken &&
            this.tokenExpiry &&
            this.tokenExpiry > new Date());
    }
    async findUserIdViaAdmin(identifier) {
        if (!this.kcAdmin)
            throw new Error('kcAdmin not initialized');
        const byUsername = await this.kcAdmin.users
            .find({ username: identifier, exact: true })
            .catch(() => []);
        if (Array.isArray(byUsername) && byUsername[0]?.id)
            return byUsername[0].id;
        const byEmail = await this.kcAdmin.users
            .find({ email: identifier, exact: true })
            .catch(() => []);
        if (Array.isArray(byEmail) && byEmail[0]?.id)
            return byEmail[0].id;
        const search = await this.kcAdmin.users
            .find({ search: identifier })
            .catch(() => []);
        if (Array.isArray(search) && search[0]?.id)
            return search[0].id;
        return undefined;
    }
    async performImpersonation(adminToken, userId) {
        if (!this.cookieJar)
            throw new Error('cookieJar not initialized');
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
            throw new Error(`ImpersonationThirdParty: impersonation failed ${resp.statusCode} ${resp.body?.toString?.() ?? ''}`);
        }
    }
    async authorizeAndExchange() {
        if (!this.oidcConfig || !this.cookieJar)
            throw new Error('OIDC config/cookieJar not initialized');
        const openIdClient = getOpenIdClientModule();
        const state = openIdClient.randomState();
        const nonce = openIdClient.randomNonce();
        const authorizeUrl = openIdClient.buildAuthorizationUrl(this.oidcConfig, {
            redirect_uri: this.config.redirectUri,
            scope: env('AUTH_KEYCLOAK_SCOPE') ?? 'openid mcp_tool',
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
            throw new Error(`ImpersonationThirdParty: expected 302 from authorize, got ${resp.statusCode}`);
        }
        const location = resp.headers.location;
        if (!location)
            throw new Error('ImpersonationThirdParty: missing Location header from authorize response');
        const currentUrl = new URL(location, this.config.redirectUri);
        const token = await openIdClient.authorizationCodeGrant(this.oidcConfig, currentUrl, {
            expectedState: state,
            expectedNonce: nonce,
        });
        return {
            access_token: token.access_token,
            expires_in: token.expires_in ?? undefined,
            refresh_token: token.refresh_token ?? undefined,
            scope: token.scope ?? undefined,
            token_type: token.token_type ?? undefined,
        };
    }
    async clearAllCachedCredentials() {
        this.cachedToken = undefined;
        this.tokenExpiry = undefined;
        await this.#adminTokenStore.clearCache();
        this.kcAdmin = undefined;
        this.oidcConfig = undefined;
        this.cookieJar = undefined;
    }
}
//# sourceMappingURL=impersonation.thirdparty.js.map