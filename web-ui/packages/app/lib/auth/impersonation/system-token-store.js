import { CookieJar } from 'tough-cookie';
import { log, LoggedError } from '@compliance-theater/logger';
import { got } from 'got';
import { parse as parseHtml } from 'node-html-parser';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
import { CryptoService } from '@/lib/site-util/auth/crypto-service';
import { getRedisClient } from '@compliance-theater/redis';
import { env } from '@compliance-theater/env';
import { SimpleRateLimiter } from '@/lib/react-util/simple-rate-limiter';
import { SimpleCircuitBreaker } from '@/lib/react-util/simple-circuit-breaker';
import { defaultConfigFromEnv } from './utility';
import { SingletonProvider } from '@compliance-theater/typescript';
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
const REGISTRY_KEY = '@noeducation/auth:SystemTokenStore';
export class SystemTokenStore {
    static get #instance() {
        return SingletonProvider.Instance.get(REGISTRY_KEY);
    }
    static set #instance(value) {
        if (value === undefined) {
            SingletonProvider.Instance.delete(REGISTRY_KEY);
        }
        else {
            SingletonProvider.Instance.set(REGISTRY_KEY, value);
        }
    }
    #initPromise;
    get initPromise() {
        return this.#initPromise;
    }
    config;
    cachedTokenData;
    crypto;
    oidcConfig;
    rateLimiter;
    circuitBreaker;
    constructor(config) {
        this.config = this.#validateAndSanitizeConfig(config);
        this.rateLimiter = new SimpleRateLimiter(config.rateLimitMaxAttempts ?? 5, config.rateLimitWindowMs ?? 60000);
        this.circuitBreaker = new SimpleCircuitBreaker(5, 30000);
    }
    static getInstance(config) {
        if (!this.#instance) {
            this.#instance = new SystemTokenStore(config ?? defaultConfigFromEnv());
        }
        return this.#instance;
    }
    static reset() {
        this.#instance = undefined;
    }
    async getAdminToken(forceRefresh = false) {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.get-admin-token',
            attributes: {
                'auth.force_refresh': forceRefresh,
                'auth.realm': this.config.realm,
                'auth.client_id': this.config.clientId,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            if (!forceRefresh && this.#hasValidCachedToken()) {
                span.setAttribute('auth.cache_hit', true);
                return this.cachedTokenData.token;
            }
            span.setAttribute('auth.cache_hit', false);
            if (this.#initPromise && !forceRefresh) {
                span.setAttribute('auth.awaiting_concurrent_request', true);
                return await this.#initPromise;
            }
            const tokenPromise = this.#acquireAdminToken();
            this.#initPromise = tokenPromise;
            try {
                const token = await tokenPromise;
                span.setAttribute('auth.acquisition_success', true);
                return token;
            }
            catch (error) {
                span.setAttribute('auth.acquisition_failed', true);
                throw error;
            }
            finally {
                this.#initPromise = undefined;
            }
        });
    }
    #validateAndSanitizeConfig(config) {
        if (!config.issuer?.trim()) {
            throw new Error('SystemTokenStore: issuer is required and cannot be empty');
        }
        try {
            const issuerUrl = new URL(config.issuer.trim());
            if (!['https:', 'http:'].includes(issuerUrl.protocol)) {
                throw new Error('SystemTokenStore: issuer must use HTTP or HTTPS protocol');
            }
            if (issuerUrl.protocol === 'http:' &&
                !issuerUrl.hostname.includes('localhost')) {
                log((l) => l.warn('SystemTokenStore: Using HTTP in production is not recommended'));
            }
        }
        catch {
            throw new Error(`SystemTokenStore: Invalid issuer URL format: ${config.issuer}`);
        }
        if (!config.clientId?.trim()) {
            throw new Error('SystemTokenStore: clientId is required and cannot be empty');
        }
        if (!config.clientSecret?.trim()) {
            throw new Error('SystemTokenStore: clientSecret is required and cannot be empty');
        }
        if (!config.realm?.trim()) {
            throw new Error('SystemTokenStore: realm is required and cannot be empty');
        }
        if (!config.adminBase?.trim()) {
            throw new Error('SystemTokenStore: adminBase is required and cannot be empty');
        }
        if (!config.redirectUri?.trim()) {
            throw new Error('SystemTokenStore: redirectUri is required and cannot be empty');
        }
        try {
            const redirectUrl = new URL(config.redirectUri.trim());
            if (!['https:', 'http:'].includes(redirectUrl.protocol)) {
                throw new Error('SystemTokenStore: redirectUri must use HTTP or HTTPS protocol');
            }
        }
        catch {
            throw new Error(`SystemTokenStore: Invalid redirectUri URL format: ${config.redirectUri}`);
        }
        if (config.tokenExpiryBufferSeconds !== undefined) {
            if (!Number.isInteger(config.tokenExpiryBufferSeconds) ||
                config.tokenExpiryBufferSeconds < 0) {
                throw new Error('SystemTokenStore: tokenExpiryBufferSeconds must be a non-negative integer');
            }
        }
        if (config.redisTokenTtlDays !== undefined) {
            if (!Number.isInteger(config.redisTokenTtlDays) ||
                config.redisTokenTtlDays < 1) {
                throw new Error('SystemTokenStore: redisTokenTtlDays must be a positive integer');
            }
        }
        if (config.rateLimitMaxAttempts !== undefined) {
            if (!Number.isInteger(config.rateLimitMaxAttempts) ||
                config.rateLimitMaxAttempts < 1) {
                throw new Error('SystemTokenStore: rateLimitMaxAttempts must be a positive integer');
            }
        }
        if (config.rateLimitWindowMs !== undefined) {
            if (!Number.isInteger(config.rateLimitWindowMs) ||
                config.rateLimitWindowMs < 1000) {
                throw new Error('SystemTokenStore: rateLimitWindowMs must be at least 1000ms');
            }
        }
        return {
            ...config,
            issuer: config.issuer.trim(),
            clientId: config.clientId.trim(),
            clientSecret: config.clientSecret.trim(),
            realm: config.realm.trim(),
            adminBase: config.adminBase.trim(),
            redirectUri: config.redirectUri.trim(),
            impersonatorUsername: config.impersonatorUsername?.trim(),
            impersonatorPassword: config.impersonatorPassword?.trim(),
            tokenExpiryBufferSeconds: config.tokenExpiryBufferSeconds ?? 30,
            redisTokenTtlDays: config.redisTokenTtlDays ?? 30,
            maxRetryAttempts: config.maxRetryAttempts ?? 3,
            rateLimitMaxAttempts: config.rateLimitMaxAttempts ?? 5,
            rateLimitWindowMs: config.rateLimitWindowMs ?? 60000,
        };
    }
    async clearCache() {
        this.cachedTokenData = undefined;
        this.#initPromise = undefined;
        this.rateLimiter.reset();
        try {
            const cacheKey = this.#getOfflineTokenCacheKey();
            if (cacheKey) {
                const redis = await getRedisClient();
                await redis.del(cacheKey);
            }
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to clear offline token from Redis cache',
                source: 'SystemTokenStore.clearCache',
            });
        }
        if (env('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME')) {
            try {
                delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
            }
            catch {
                process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = '';
            }
        }
    }
    #hasValidCachedToken() {
        const bufferMs = (this.config.tokenExpiryBufferSeconds ?? 30) * 1000;
        return !!(this.cachedTokenData &&
            this.cachedTokenData.expiry > new Date(Date.now() + bufferMs));
    }
    async #acquireAdminToken() {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.acquire-admin-token',
            attributes: {
                'auth.realm': this.config.realm,
                'auth.strategy': 'multi-strategy',
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            try {
                const offlineTokenResult = await this.#tryOfflineTokenStrategy();
                if (offlineTokenResult) {
                    span.setAttribute('auth.strategy_used', 'offline_token');
                    return offlineTokenResult;
                }
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Offline token strategy failed',
                    source: 'SystemTokenStore.acquireAdminToken',
                });
            }
            if (this.config.impersonatorUsername &&
                this.config.impersonatorPassword) {
                try {
                    const credentialsResult = await this.#tryCredentialsStrategy();
                    if (credentialsResult) {
                        span.setAttribute('auth.strategy_used', 'credentials');
                        return credentialsResult;
                    }
                }
                catch (error) {
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        message: 'Credentials strategy failed',
                        source: 'SystemTokenStore.acquireAdminToken',
                    });
                }
            }
            span.setAttribute('auth.strategy_used', 'none');
            throw new Error('All admin token acquisition strategies failed');
        });
    }
    async #tryOfflineTokenStrategy() {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.offline-token-strategy',
            attributes: {
                'auth.realm': this.config.realm,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            const offlineToken = await this.#getOfflineTokenFromStorage();
            if (!offlineToken) {
                span.setAttribute('auth.offline_token_available', false);
                return null;
            }
            span.setAttribute('auth.offline_token_available', true);
            const tokenResponse = await this.#exchangeOfflineToken(offlineToken);
            if (tokenResponse) {
                this.#cacheTokenData(tokenResponse);
                span.setAttribute('auth.offline_token_success', true);
                return tokenResponse.access_token;
            }
            span.setAttribute('auth.offline_token_success', false);
            return null;
        });
    }
    async #tryCredentialsStrategy() {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.credentials-strategy',
            attributes: {
                'auth.realm': this.config.realm,
                'auth.username': this.config.impersonatorUsername || 'undefined',
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            if (!this.config.impersonatorUsername ||
                !this.config.impersonatorPassword) {
                span.setAttribute('auth.credentials_available', false);
                return null;
            }
            const rateLimitKey = `credentials:${this.config.realm}:${this.config.impersonatorUsername}`;
            if (!this.rateLimiter.canAttempt(rateLimitKey)) {
                span.setAttribute('auth.rate_limited', true);
                throw new Error('Rate limit exceeded for credentials authentication');
            }
            span.setAttribute('auth.credentials_available', true);
            this.rateLimiter.recordAttempt(rateLimitKey);
            const loginResult = await this.circuitBreaker.execute(async () => {
                return await this.#performFormLogin();
            });
            if (!loginResult) {
                span.setAttribute('auth.form_login_success', false);
                return null;
            }
            span.setAttribute('auth.form_login_success', true);
            const cacheInstrumented = await createInstrumentedSpan({
                spanName: 'system-token-store.cache-credentials-token',
                attributes: {
                    'auth.realm': this.config.realm,
                },
            });
            return await cacheInstrumented.executeWithContext(async (cacheSpan) => {
                const tokenResponse = {
                    access_token: loginResult.accessToken,
                    expires_in: loginResult.expiresIn || 3600,
                    refresh_token: loginResult.refreshToken,
                };
                this.#cacheTokenData(tokenResponse);
                cacheSpan.setAttribute('auth.token_cached', true);
                if (loginResult.refreshToken) {
                    await this.#storeOfflineTokenEncrypted(loginResult.refreshToken);
                    cacheSpan.setAttribute('auth.refresh_token_stored', true);
                }
                span.setAttribute('auth.credentials_success', true);
                return loginResult.accessToken;
            });
        });
    }
    async #ensureOIDCConfiguration() {
        if (!this.oidcConfig) {
            const discoveryInstrumented = await createInstrumentedSpan({
                spanName: 'system-token-store.oidc-discovery',
                attributes: {
                    'auth.realm': this.config.realm,
                },
            });
            this.oidcConfig = await discoveryInstrumented.executeWithContext(async (discoverySpan) => {
                const config = await getOpenIdClientModule().discovery(new URL(this.config.issuer), this.config.clientId, this.config.clientSecret);
                discoverySpan.setAttribute('auth.oidc_discovery_success', true);
                return config;
            });
        }
    }
    async #handleAuthorizationRequest(client, state, nonce) {
        if (!this.oidcConfig) {
            throw new Error('OIDC configuration not initialized');
        }
        const authorizeUrl = getOpenIdClientModule().buildAuthorizationUrl(this.oidcConfig, {
            redirect_uri: this.config.redirectUri,
            scope: 'openid email profile offline_access',
            response_type: 'code',
            response_mode: 'query',
            prompt: 'login',
            state,
            nonce,
        });
        const authResponse = await client.get(authorizeUrl.toString());
        if (authResponse.statusCode === 302 && authResponse.headers.location) {
            const codeUrl = new URL(authResponse.headers.location, this.config.redirectUri);
            return { codeUrl };
        }
        else if (authResponse.statusCode === 200 &&
            typeof authResponse.body === 'string') {
            const loginHtml = authResponse.body;
            return { loginHtml };
        }
        else {
            throw new Error(`Authorization endpoint returned unexpected status ${authResponse.statusCode}`);
        }
    }
    async #processLoginForm(client, loginHtml, authorizeUrl, span, state) {
        const formParse = this.#parseLoginForm(loginHtml);
        if (!formParse) {
            throw new Error('Unable to locate login form action');
        }
        const { action: formAction, fields, hasUsername, hasPassword } = formParse;
        span.setAttribute('auth.login_form_parsed', true);
        span.setAttribute('auth.form_has_username', hasUsername);
        span.setAttribute('auth.form_has_password', hasPassword);
        if (hasPassword || 'execution' in fields || 'session_code' in fields) {
            return await this.#performSingleStepLogin(client, formAction, fields, authorizeUrl, span);
        }
        else if (hasUsername) {
            return await this.#performTwoStepLogin(client, formAction, fields, span);
        }
        else {
            return await this.#performFallbackLogin(client, formAction, fields, span, state);
        }
    }
    async #performSingleStepLogin(client, formAction, fields, authorizeUrl, span) {
        span.setAttribute('auth.login_flow', 'single_step');
        const formBody = new URLSearchParams();
        for (const [k, v] of Object.entries(fields)) {
            if (typeof v === 'string')
                formBody.set(k, v);
        }
        formBody.set('username', this.config.impersonatorUsername);
        formBody.set('password', this.config.impersonatorPassword);
        formBody.set('credentialId', formBody.get('credentialId') ?? '');
        const loginResp = await client.post(formAction, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody.toString(),
        });
        if (loginResp.statusCode !== 302) {
            throw new Error(`Admin login failed ${loginResp.statusCode}`);
        }
        const afterLogin = await client.get(authorizeUrl);
        if (afterLogin.statusCode === 302 && afterLogin.headers.location) {
            return new URL(afterLogin.headers.location, this.config.redirectUri);
        }
        return null;
    }
    async #performTwoStepLogin(client, formAction, fields, span) {
        span.setAttribute('auth.login_flow', 'two_step');
        const userOnly = new URLSearchParams();
        for (const [k, v] of Object.entries(fields)) {
            if (typeof v === 'string')
                userOnly.set(k, v);
        }
        userOnly.set('username', this.config.impersonatorUsername);
        const firstResp = await client.post(formAction, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: userOnly.toString(),
        });
        let secondHtml = '';
        if (firstResp.statusCode === 302 && firstResp.headers.location) {
            const secondPage = await client.get(firstResp.headers.location);
            secondHtml = typeof secondPage.body === 'string' ? secondPage.body : '';
        }
        else if (firstResp.statusCode === 200 &&
            typeof firstResp.body === 'string') {
            secondHtml = firstResp.body;
        }
        else {
            throw new Error(`Admin username step failed ${firstResp.statusCode}`);
        }
        const secondParse = this.#parseLoginForm(secondHtml);
        if (!secondParse || !secondParse.hasPassword) {
            throw new Error('Unable to locate password form after username step');
        }
        const passBody = new URLSearchParams();
        for (const [k, v] of Object.entries(secondParse.fields)) {
            if (typeof v === 'string')
                passBody.set(k, v);
        }
        passBody.set('password', this.config.impersonatorPassword);
        passBody.set('credentialId', passBody.get('credentialId') ?? '');
        const passResp = await client.post(secondParse.action, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: passBody.toString(),
        });
        if (passResp.statusCode !== 302 || !passResp.headers.location) {
            throw new Error(`Admin password step failed ${passResp.statusCode}`);
        }
        return new URL(passResp.headers.location, this.config.redirectUri);
    }
    async #performFallbackLogin(client, formAction, fields, span, state) {
        span.setAttribute('auth.login_flow', 'fallback');
        const formBody = new URLSearchParams();
        for (const [k, v] of Object.entries(fields)) {
            if (typeof v === 'string')
                formBody.set(k, v);
        }
        formBody.set('username', this.config.impersonatorUsername);
        formBody.set('password', this.config.impersonatorPassword);
        formBody.set('credentialId', formBody.get('credentialId') ?? '');
        const loginResp = await client.post(formAction, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody.toString(),
        });
        if (loginResp.statusCode !== 302) {
            throw new Error(`Admin login failed ${loginResp.statusCode}`);
        }
        return new URL(`${this.config.redirectUri}?code=admin-code&state=${encodeURIComponent(state)}`);
    }
    async #exchangeAuthorizationCode(codeUrl, state, nonce) {
        const exchangeInstrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.exchange-authorization-code',
            attributes: {
                'auth.realm': this.config.realm,
            },
        });
        return await exchangeInstrumented.executeWithContext(async (exchangeSpan) => {
            if (!this.oidcConfig) {
                throw new Error('OIDC configuration not initialized');
            }
            const token = await getOpenIdClientModule().authorizationCodeGrant(this.oidcConfig, codeUrl, {
                expectedState: state,
                expectedNonce: nonce,
            });
            const accessToken = token.access_token;
            if (!accessToken) {
                throw new Error('Missing access_token in authorization response');
            }
            exchangeSpan.setAttribute('auth.token_exchange_success', true);
            return {
                accessToken,
                refreshToken: token.refresh_token,
                expiresIn: token.expires_in,
            };
        });
    }
    async #performFormLogin() {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.form-login',
            attributes: {
                'auth.realm': this.config.realm,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            const cookieJar = new CookieJar();
            const client = got.extend({ cookieJar, followRedirect: false });
            await this.#ensureOIDCConfiguration();
            const openIdClient = getOpenIdClientModule();
            const state = openIdClient.randomState();
            const nonce = openIdClient.randomNonce();
            let codeUrl;
            try {
                const authResult = await this.#handleAuthorizationRequest(client, state, nonce);
                span.setAttribute('auth.authorization_url_generated', true);
                if (authResult.codeUrl) {
                    span.setAttribute('auth.existing_session_redirect', true);
                    const result = await this.#exchangeAuthorizationCode(authResult.codeUrl, state, nonce);
                    span.setAttribute('auth.session_reuse_success', true);
                    return result;
                }
                if (!authResult.loginHtml) {
                    throw new Error('Unable to load admin login page');
                }
                span.setAttribute('auth.login_form_required', true);
                const authorizeUrl = openIdClient.buildAuthorizationUrl(this.oidcConfig, {
                    redirect_uri: this.config.redirectUri,
                    scope: 'openid email profile offline_access',
                    response_type: 'code',
                    response_mode: 'query',
                    prompt: 'login',
                    state,
                    nonce,
                });
                const loginResult = await this.#processLoginForm(client, authResult.loginHtml, authorizeUrl.toString(), span, state);
                codeUrl = loginResult;
                const finalUrl = codeUrl ??
                    new URL(`${this.config.redirectUri}?code=admin-code&state=${encodeURIComponent(state)}`);
                const result = await this.#exchangeAuthorizationCode(finalUrl, state, nonce);
                span.setAttribute('auth.form_login_success', true);
                return result;
            }
            catch (error) {
                span.setAttribute('auth.form_login_error', true);
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Form login failed',
                    source: 'SystemTokenStore.performFormLogin',
                });
                return null;
            }
        });
    }
    async #getOfflineTokenFromStorage() {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.get-offline-token',
            attributes: {
                'auth.realm': this.config.realm,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            try {
                const cacheKey = this.#getOfflineTokenCacheKey();
                if (cacheKey) {
                    const redis = await getRedisClient();
                    const encryptedToken = await redis.get(cacheKey);
                    if (encryptedToken) {
                        const crypto = this.#getCrypto();
                        const decryptedToken = await crypto.decrypt(encryptedToken);
                        span.setAttribute('auth.offline_token_source', 'redis');
                        return decryptedToken;
                    }
                }
                const envToken = env('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN');
                if (envToken) {
                    span.setAttribute('auth.offline_token_source', 'environment');
                    return envToken;
                }
                span.setAttribute('auth.offline_token_source', 'none');
                return null;
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Failed to get offline token from storage',
                    source: 'SystemTokenStore.getOfflineTokenFromStorage',
                });
                return null;
            }
        });
    }
    async #exchangeOfflineToken(refreshToken) {
        const instrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.exchange-offline-token',
            attributes: {
                'auth.realm': this.config.realm,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            try {
                if (!this.oidcConfig) {
                    const discoveryInstrumented = await createInstrumentedSpan({
                        spanName: 'system-token-store.oidc-discovery',
                        attributes: {
                            'auth.realm': this.config.realm,
                        },
                    });
                    this.oidcConfig = await discoveryInstrumented.executeWithContext(async (discoverySpan) => {
                        const config = await getOpenIdClientModule().discovery(new URL(this.config.issuer), this.config.clientId, this.config.clientSecret);
                        discoverySpan.setAttribute('auth.oidc_discovery_success', true);
                        return config;
                    });
                }
                let tokenEndpoint;
                if (this.oidcConfig &&
                    'token_endpoint' in this.oidcConfig &&
                    this.oidcConfig.token_endpoint) {
                    tokenEndpoint = this.oidcConfig.token_endpoint;
                    span.setAttribute('auth.token_endpoint_source', 'oidc_discovery');
                }
                else {
                    tokenEndpoint = `${this.config.issuer}/protocol/openid-connect/token`;
                    span.setAttribute('auth.token_endpoint_source', 'hardcoded');
                }
                const response = await got.post(tokenEndpoint, {
                    form: {
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken,
                        client_id: this.config.clientId,
                        client_secret: this.config.clientSecret,
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                span.setAttribute('auth.token_exchange_status', response.statusCode);
                if (response.statusCode === 200) {
                    const tokenData = JSON.parse(response.body);
                    span.setAttribute('auth.token_exchange_success', true);
                    if (tokenData.refresh_token) {
                        await this.#storeOfflineTokenEncrypted(tokenData.refresh_token);
                        span.setAttribute('auth.new_refresh_token_stored', true);
                    }
                    return tokenData;
                }
                span.setAttribute('auth.token_exchange_success', false);
                return null;
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    message: 'Failed to exchange offline token',
                    source: 'SystemTokenStore.exchangeOfflineToken',
                });
                return null;
            }
        });
    }
    #cacheTokenData(tokenResponse) {
        const expiresIn = tokenResponse.expires_in || 3600;
        const bufferSeconds = this.config.tokenExpiryBufferSeconds ?? 30;
        const expiry = new Date(Date.now() + (expiresIn - bufferSeconds) * 1000);
        this.cachedTokenData = {
            token: tokenResponse.access_token,
            expiry,
            refreshToken: tokenResponse.refresh_token,
        };
    }
    async #storeOfflineTokenEncrypted(token) {
        try {
            const cacheKey = this.#getOfflineTokenCacheKey();
            if (!cacheKey)
                return;
            const crypto = this.#getCrypto();
            const encryptedToken = await crypto.encrypt(token);
            const redis = await getRedisClient();
            const ttlSeconds = (this.config.redisTokenTtlDays ?? 30) * 24 * 60 * 60;
            await redis.setEx(cacheKey, ttlSeconds, encryptedToken);
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to store offline token',
                source: 'SystemTokenStore.storeOfflineTokenEncrypted',
            });
        }
    }
    #getOfflineTokenCacheKey() {
        try {
            return `keycloak:offline_token:${this.config.realm}:${this.config.clientId}:system`;
        }
        catch {
            return null;
        }
    }
    #getCrypto() {
        if (!this.crypto) {
            this.crypto = new CryptoService();
        }
        return this.crypto;
    }
    getCircuitBreakerState() {
        return this.circuitBreaker.getState();
    }
    isRateLimited() {
        if (!this.config.impersonatorUsername) {
            return false;
        }
        const rateLimitKey = `credentials:${this.config.realm}:${this.config.impersonatorUsername}`;
        return !this.rateLimiter.canAttempt(rateLimitKey);
    }
    #parseLoginForm(html) {
        try {
            const document = parseHtml(html);
            const form = document.querySelector('form');
            if (!form) {
                return null;
            }
            const actionRaw = form.getAttribute('action');
            if (!actionRaw) {
                return null;
            }
            const action = this.#resolveFormAction(actionRaw.trim());
            if (!action) {
                return null;
            }
            const inputs = form.querySelectorAll('input');
            const fields = {};
            let hasUsername = false;
            let hasPassword = false;
            for (const input of inputs) {
                const name = input.getAttribute('name')?.trim();
                const value = input.getAttribute('value')?.trim() || '';
                const type = input.getAttribute('type')?.toLowerCase().trim() || 'text';
                const id = input.getAttribute('id')?.toLowerCase().trim() || '';
                if (name && this.#isValidFieldName(name)) {
                    fields[name] = this.#sanitizeFieldValue(value);
                }
                if (type === 'password' || name === 'password' || id === 'password') {
                    hasPassword = true;
                }
                if (name === 'username' ||
                    id === 'username' ||
                    (type === 'text' &&
                        (name === 'email' || id === 'kc-attempted-username'))) {
                    hasUsername = true;
                }
            }
            return { action, fields, hasUsername, hasPassword };
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to parse login form HTML',
                source: 'SystemTokenStore.parseLoginForm',
            });
            return null;
        }
    }
    #resolveFormAction(actionRaw) {
        try {
            const resolvedUrl = new URL(actionRaw, this.config.issuer);
            if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
                return null;
            }
            return resolvedUrl.toString();
        }
        catch {
            return null;
        }
    }
    #isValidFieldName(name) {
        return /^[a-zA-Z0-9_.-]+$/.test(name) && name.length <= 100;
    }
    #sanitizeFieldValue(value) {
        return value.replace(/[<>"'&]/g, '').substring(0, 1000);
    }
}
//# sourceMappingURL=system-token-store.js.map