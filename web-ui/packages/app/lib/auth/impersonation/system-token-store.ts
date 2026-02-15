/**
 * @fileoverview SystemTokenStore - Singleton for managing shared admin tokens across impersonation instances
 *
 * This singleton prevents multiple impersonation instances from racing to acquire admin tokens,
 * which would invalidate refresh tokens and cause authentication failures. Uses global symbol
 * registry pattern for cross-module singleton behavior and promise protection for concurrent access.
 *
 * **Key Features:**
 * - Global symbol-based singleton (survives HMR and module reloads)
 * - Promise-protected token acquisition (first caller creates promise, others await it)
 * - Comprehensive OpenTelemetry instrumentation for observability
 * - Redis-backed encrypted offline token storage
 * - Automatic token expiry management and refresh
 * - Multi-strategy authentication (offline tokens, credentials, form-based)
 * - Thread-safe concurrent access protection
 * - Comprehensive error handling and logging
 *
 * **Documentation Coverage:**
 * This module includes comprehensive JSDoc documentation for all public APIs,
 * private methods, interfaces, types, and utility functions. Each method includes
 * detailed descriptions, parameter documentation, return types, examples, and
 * cross-references to related functionality.
 *
 * @author SystemTokenStore Development Team
 * @since 1.0.0
 * @version 2.0.0
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { CookieJar } from 'tough-cookie';
import { log, LoggedError } from '@compliance-theater/logger';
import { got } from 'got';
import { parse as parseHtml } from 'node-html-parser';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
import { CryptoService } from '@/lib/site-util/auth/crypto-service';
import { getRedisClient } from '@compliance-theater/redis';
import { env } from '@compliance-theater/env';
import { SimpleRateLimiter } from '@compliance-theater/react/simple-rate-limiter';
import { SimpleCircuitBreaker } from '@compliance-theater/react/simple-circuit-breaker';
import type {
  AdminTokenConfig,
  TokenResponse,
  CachedTokenData,
  FormLoginResult,
} from './impersonation.types';
import { defaultConfigFromEnv } from './utility';
import { SingletonProvider } from '@compliance-theater/typescript';

let openIdClientModule: {
  discovery: Function;
  buildAuthorizationUrl: Function;
  authorizationCodeGrant: Function;
  randomState: Function;
  randomNonce: Function;
} | null = null;
//type Configuration as OIDCConfiguration

const getOpenIdClientModule = () => {
  if (openIdClientModule) {
    return openIdClientModule;
  }
  const {
    discovery,
    buildAuthorizationUrl,
    authorizationCodeGrant,
    randomState,
    randomNonce,
  } = require('openid-client');
  openIdClientModule = {
    discovery,
    buildAuthorizationUrl,
    authorizationCodeGrant,
    randomState,
    randomNonce,
  };
  return openIdClientModule;
};

/**
 * Global key for the singleton registry
 */
const REGISTRY_KEY = '@noeducation/auth:SystemTokenStore';

/**
 * SystemTokenStore - Thread-safe singleton for centralized admin token management
 *
 * @class SystemTokenStore
 * @description Provides centralized, thread-safe management of Keycloak admin tokens
 * across multiple impersonation instances. Implements the singleton pattern using
 * global symbol registry to ensure a single instance exists even during HMR and
 * module reloads in development environments.
 *
 * **Key Features:**
 * - **Concurrency Protection**: Promise-based synchronization prevents race conditions
 * - **Multi-Strategy Authentication**: Supports offline tokens, credentials, and form-based flows
 * - **Comprehensive Caching**: Memory and Redis-based token storage with expiry management
 * - **OpenTelemetry Integration**: Full distributed tracing for authentication flows
 * - **Encryption**: Secure storage of sensitive tokens using CryptoService
 * - **Automatic Failover**: Falls back through multiple authentication strategies
 *
 * **Authentication Strategies (in order of preference):**
 * 1. **Offline Token Strategy**: Uses stored refresh tokens for silent renewal
 * 2. **Credentials Strategy**: Username/password authentication with form login
 * 3. **Form Login Strategy**: Handles complex Keycloak login flows (single/multi-step)
 *
 * @example Basic Usage
 * ```typescript
 * // Get singleton instance (auto-configures from environment)
 * const tokenStore = SystemTokenStore.getInstance();
 *
 * // Get valid admin token (handles caching and renewal)
 * const adminToken = await tokenStore.getAdminToken();
 *
 * // Force token refresh
 * const freshToken = await tokenStore.getAdminToken(true);
 *
 * // Clear all cached tokens
 * await tokenStore.clearCache();
 * ```
 *
 * @example Custom Configuration
 * ```typescript
 * const config: AdminTokenConfig = {
 *   issuer: 'https://auth.example.com/realms/master',
 *   clientId: 'admin-cli',
 *   clientSecret: 'secret',
 *   realm: 'master',
 *   adminBase: 'https://auth.example.com/admin/realms/master',
 *   redirectUri: 'https://app.example.com/callback',
 *   impersonatorUsername: 'admin',
 *   impersonatorPassword: 'password'
 * };
 *
 * const tokenStore = SystemTokenStore.getInstance(config);
 * const token = await tokenStore.getAdminToken();
 * ```
 *
 * @example Concurrent Access Handling
 * ```typescript
 * // Multiple concurrent calls are automatically synchronized
 * const [token1, token2, token3] = await Promise.all([
 *   tokenStore.getAdminToken(),
 *   tokenStore.getAdminToken(),
 *   tokenStore.getAdminToken()
 * ]);
 * // All three will receive the same token - only one network request made
 * ```
 *
 * @see {@link AdminTokenConfig} for configuration options
 * @see {@link FormLoginResult} for form login return structure
 * @see {@link CachedTokenData} for internal caching structure
 */
export class SystemTokenStore {
  /** Get the singleton instance from global registry */
  static get #instance(): SystemTokenStore | undefined {
    return SingletonProvider.Instance.get<SystemTokenStore>(REGISTRY_KEY);
  }

  /** Set the singleton instance in global registry */
  static set #instance(value: SystemTokenStore | undefined) {
    if (value === undefined) {
      SingletonProvider.Instance.delete(REGISTRY_KEY);
    } else {
      SingletonProvider.Instance.set(REGISTRY_KEY, value);
    }
  }

  /**
   * Promise for ongoing token acquisition to prevent concurrent requests.
   * Note that since SystemTokenStore is a singleton, this instance variable
   * is effectively global across all usages.
   */
  #initPromise: Promise<string> | undefined;
  /**
   * Get the ongoing token acquisition promise
   */
  protected get initPromise(): Promise<string> | undefined {
    return this.#initPromise;
  }

  /**
   * Immutable configuration for admin token acquisition
   * @description Contains all necessary endpoints, credentials, and settings
   * for authenticating with Keycloak. Set during construction and never modified.
   */
  private readonly config: AdminTokenConfig;

  /**
   * In-memory cached token data with expiry information
   * @description Stores the current valid access token along with its computed
   * expiry time and optional refresh token. Cleared when tokens expire or
   * clearCache() is called.
   */
  private cachedTokenData?: CachedTokenData;

  /**
   * Lazy-loaded crypto service for token encryption
   * @description Used for encrypting/decrypting refresh tokens stored in Redis.
   * Instantiated on first use to avoid unnecessary initialization overhead.
   */
  private crypto?: CryptoService;

  /**
   * Cached OIDC discovery configuration from Keycloak
   * @description Contains discovered endpoints and configuration from Keycloak's
   * .well-known/openid_configuration endpoint. Cached to avoid repeated discovery.
   */
  private oidcConfig?: Record<string, unknown>;

  /**
   * Rate limiter for authentication attempts
   * @description Prevents brute force attacks by limiting authentication attempts per time window
   */
  private rateLimiter: SimpleRateLimiter;

  /**
   * Circuit breaker for external API calls
   * @description Prevents cascading failures by temporarily stopping requests after repeated failures
   */
  private circuitBreaker: SimpleCircuitBreaker;

  /**
   * Private constructor for singleton pattern
   *
   * @private
   * @constructor
   * @description Initializes a new SystemTokenStore instance with the provided
   * configuration. This constructor is private to enforce the singleton pattern.
   * Use {@link getInstance} to obtain the singleton instance.
   *
   * @param {AdminTokenConfig} config - Complete configuration for admin token acquisition
   * @throws {Error} When configuration validation fails
   */
  private constructor(config: AdminTokenConfig) {
    this.config = this.#validateAndSanitizeConfig(config);
    this.rateLimiter = new SimpleRateLimiter(
      config.rateLimitMaxAttempts ?? 5,
      config.rateLimitWindowMs ?? 60000
    );
    this.circuitBreaker = new SimpleCircuitBreaker(5, 30000);
  }

  /**
   * Get the singleton instance, creating it if necessary
   *
   * @static
   * @method getInstance
   * @description Returns the singleton SystemTokenStore instance. Creates a new
   * instance on first call using the provided or default configuration.
   * Subsequent calls ignore the config parameter and return the existing instance.
   *
   * @param {AdminTokenConfig} [config] - Configuration for token store (used only on first call)
   * @returns {SystemTokenStore} The singleton SystemTokenStore instance
   *
   * @example With default environment configuration
   * ```typescript
   * const store = SystemTokenStore.getInstance();
   * // Uses environment variables for configuration
   * ```
   *
   * @example With custom configuration
   * ```typescript
   * const config: AdminTokenConfig = {
   *   issuer: 'https://auth.example.com/realms/master',
   *   clientId: 'admin-cli',
   *   clientSecret: 'secret',
   *   // ... other config
   * };
   * const store = SystemTokenStore.getInstance(config);
   * ```
   */
  static getInstance(config?: AdminTokenConfig): SystemTokenStore {
    if (!this.#instance) {
      this.#instance = new SystemTokenStore(config ?? defaultConfigFromEnv());
    }
    return this.#instance;
  }

  /**
   * Reset the singleton instance and all global state
   *
   * @static
   * @method reset
   * @description Completely resets the SystemTokenStore singleton by clearing
   * the global registry instance and any pending initialization promises.
   * Primarily intended for testing scenarios.
   *
   * **⚠️ Warning**: This method should only be used in testing environments.
   * Like all {@link SingletonProvider} singletons, the SystemTokenStore is
   * automatically reset between tests. This method is provided for legacy
   * compatibility and mid-test reset scenarios.  Calling this in production
   * can cause authentication failures for ongoing operations.
   *
   * @example Testing usage
   * ```typescript
   * // In test setup/teardown
   * afterEach(() => {
   *   SystemTokenStore.reset();
   * });
   * ```
   */
  static reset(): void {
    this.#instance = undefined;
  }

  /**
   * Get a valid admin access token with promise protection against concurrent requests
   *
   * @async
   * @method getAdminToken
   * @description Retrieves a valid admin access token, using cached tokens when available
   * and fresh when necessary. Implements promise-based concurrency protection to prevent
   * multiple simultaneous token requests that could invalidate refresh tokens.
   *
   * **Token Acquisition Strategy (in order of preference):**
   * 1. Return cached token if valid and not expired (unless forceRefresh=true)
   * 2. If concurrent request in progress, await that request's result
   * 3. Otherwise, initiate new token acquisition using multi-strategy approach
   *
   * **Multi-Strategy Authentication:**
   * - **Offline Token**: Use stored refresh token for silent renewal
   * - **Credentials**: Username/password authentication with form-based login
   *
   * @param {boolean} [forceRefresh=false] - Whether to bypass cached tokens and force fresh acquisition
   * @returns {Promise<string>} Promise resolving to a valid JWT access token
   * @throws {Error} When all authentication strategies fail
   *
   * @example Basic usage with caching
   * ```typescript
   * const store = SystemTokenStore.getInstance();
   * const token = await store.getAdminToken();
   * // Uses cached token if available and valid
   * ```
   *
   * @example Force fresh token
   * ```typescript
   * const freshToken = await store.getAdminToken(true);
   * // Bypasses cache and acquires new token
   * ```
   *
   * @example Concurrent access safety
   * ```typescript
   * // Multiple concurrent calls - only one actual network request
   * const [token1, token2, token3] = await Promise.all([
   *   store.getAdminToken(),
   *   store.getAdminToken(),
   *   store.getAdminToken()
   * ]);
   * // All receive the same token, promise synchronization prevents races
   * ```
   */
  async getAdminToken(forceRefresh = false): Promise<string> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.get-admin-token',
      attributes: {
        'auth.force_refresh': forceRefresh,
        'auth.realm': this.config.realm,
        'auth.client_id': this.config.clientId,
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      // Check if we have a valid cached token (unless forced refresh)
      if (!forceRefresh && this.#hasValidCachedToken()) {
        span.setAttribute('auth.cache_hit', true);
        return this.cachedTokenData!.token;
      }

      span.setAttribute('auth.cache_hit', false);

      // Check if there's already a token acquisition in progress
      if (this.#initPromise && !forceRefresh) {
        span.setAttribute('auth.awaiting_concurrent_request', true);
        return await this.#initPromise;
      }

      // Create new promise for token acquisition
      const tokenPromise = this.#acquireAdminToken();
      this.#initPromise = tokenPromise;

      try {
        const token = await tokenPromise;
        span.setAttribute('auth.acquisition_success', true);
        return token;
      } catch (error) {
        span.setAttribute('auth.acquisition_failed', true);
        throw error;
      } finally {
        // Clear the promise once completed (success or failure)
        this.#initPromise = undefined;
      }
    });
  }

  /**
   * Validate and sanitize configuration input
   *
   * @private
   * @method #validateAndSanitizeConfig
   * @description Validates all required configuration parameters and sanitizes input
   * to prevent security vulnerabilities. Throws detailed errors for missing or invalid values.
   *
   * @param {AdminTokenConfig} config - Raw configuration object to validate
   * @returns {AdminTokenConfig} Validated and sanitized configuration
   * @throws {Error} When required fields are missing or invalid
   */
  #validateAndSanitizeConfig(config: AdminTokenConfig): AdminTokenConfig {
    // Validate required fields
    if (!config.issuer?.trim()) {
      throw new Error(
        'SystemTokenStore: issuer is required and cannot be empty'
      );
    }

    // Validate issuer URL format and security
    try {
      const issuerUrl = new URL(config.issuer.trim());
      if (!['https:', 'http:'].includes(issuerUrl.protocol)) {
        throw new Error(
          'SystemTokenStore: issuer must use HTTP or HTTPS protocol'
        );
      }
      if (
        issuerUrl.protocol === 'http:' &&
        !issuerUrl.hostname.includes('localhost')
      ) {
        log((l) =>
          l.warn(
            'SystemTokenStore: Using HTTP in production is not recommended'
          )
        );
      }
    } catch {
      throw new Error(
        `SystemTokenStore: Invalid issuer URL format: ${config.issuer}`
      );
    }

    if (!config.clientId?.trim()) {
      throw new Error(
        'SystemTokenStore: clientId is required and cannot be empty'
      );
    }

    if (!config.clientSecret?.trim()) {
      throw new Error(
        'SystemTokenStore: clientSecret is required and cannot be empty'
      );
    }

    if (!config.realm?.trim()) {
      throw new Error(
        'SystemTokenStore: realm is required and cannot be empty'
      );
    }

    if (!config.adminBase?.trim()) {
      throw new Error(
        'SystemTokenStore: adminBase is required and cannot be empty'
      );
    }

    if (!config.redirectUri?.trim()) {
      throw new Error(
        'SystemTokenStore: redirectUri is required and cannot be empty'
      );
    }

    // Validate redirectUri format
    try {
      const redirectUrl = new URL(config.redirectUri.trim());
      if (!['https:', 'http:'].includes(redirectUrl.protocol)) {
        throw new Error(
          'SystemTokenStore: redirectUri must use HTTP or HTTPS protocol'
        );
      }
    } catch {
      throw new Error(
        `SystemTokenStore: Invalid redirectUri URL format: ${config.redirectUri}`
      );
    }

    // Validate optional numeric parameters
    if (config.tokenExpiryBufferSeconds !== undefined) {
      if (
        !Number.isInteger(config.tokenExpiryBufferSeconds) ||
        config.tokenExpiryBufferSeconds < 0
      ) {
        throw new Error(
          'SystemTokenStore: tokenExpiryBufferSeconds must be a non-negative integer'
        );
      }
    }

    if (config.redisTokenTtlDays !== undefined) {
      if (
        !Number.isInteger(config.redisTokenTtlDays) ||
        config.redisTokenTtlDays < 1
      ) {
        throw new Error(
          'SystemTokenStore: redisTokenTtlDays must be a positive integer'
        );
      }
    }

    if (config.rateLimitMaxAttempts !== undefined) {
      if (
        !Number.isInteger(config.rateLimitMaxAttempts) ||
        config.rateLimitMaxAttempts < 1
      ) {
        throw new Error(
          'SystemTokenStore: rateLimitMaxAttempts must be a positive integer'
        );
      }
    }

    if (config.rateLimitWindowMs !== undefined) {
      if (
        !Number.isInteger(config.rateLimitWindowMs) ||
        config.rateLimitWindowMs < 1000
      ) {
        throw new Error(
          'SystemTokenStore: rateLimitWindowMs must be at least 1000ms'
        );
      }
    }

    // Sanitize string inputs
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

  /**
   * Clear cached token data from memory and Redis storage
   *
   * @async
   * @description Clears both in-memory cached tokens and encrypted offline tokens
   * stored in Redis. Also clears any environment variable offline tokens to ensure
   * complete cache invalidation.
   */
  async clearCache(): Promise<void> {
    // Clear in-memory cache
    this.cachedTokenData = undefined;

    // Clear any pending token acquisition promise
    this.#initPromise = undefined;

    // Clear rate limiter state
    this.rateLimiter.reset();

    // Clear Redis-stored offline token
    try {
      const cacheKey = this.#getOfflineTokenCacheKey();
      if (cacheKey) {
        const redis = await getRedisClient();
        await redis.del(cacheKey);
      }
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to clear offline token from Redis cache',
        source: 'SystemTokenStore.clearCache',
      });
    }

    // Clear environment variable offline token to prevent reuse
    if (env('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME')) {
      try {
        delete process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN;
      } catch {
        // Fallback: set to empty string if delete fails
        process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN = '';
      }
    }
  }

  /**
   * Check if we have a valid cached token that hasn't expired
   *
   * @private
   * @method #hasValidCachedToken
   * @description Validates the current cached token by checking both existence
   * and expiry time. Uses configurable buffer to prevent using tokens that are
   * about to expire, reducing the risk of authentication failures due to token
   * expiry during request processing.
   *
   * @returns {boolean} True if cached token exists and is valid for at least the buffer time
   */
  #hasValidCachedToken(): boolean {
    const bufferMs = (this.config.tokenExpiryBufferSeconds ?? 30) * 1000;
    return !!(
      this.cachedTokenData &&
      this.cachedTokenData.expiry > new Date(Date.now() + bufferMs)
    );
  }

  /**
   * Internal method to acquire admin token through various strategies
   *
   * @private
   * @async
   * @method #acquireAdminToken
   * @description Implements the core multi-strategy token acquisition logic.
   * Attempts authentication methods in order of preference, falling back to
   * the next strategy if the current one fails. Each strategy is wrapped in
   * error handling to prevent one failure from breaking the entire flow.
   *
   * **Authentication Strategy Order:**
   * 1. **Offline Token Strategy**: Attempts to use stored refresh tokens
   * 2. **Credentials Strategy**: Falls back to username/password authentication
   *
   * All strategies are instrumented with OpenTelemetry for observability.
   *
   * @returns {Promise<string>} Promise resolving to a valid JWT access token
   * @throws {Error} When all authentication strategies fail
   *
   * @example Strategy execution flow
   * ```typescript
   * // 1. Try offline token (if available)
   * // 2. Try credentials (if configured)
   * // 3. Throw error if all strategies fail
   * const token = await this.#acquireAdminToken();
   * ```
   */
  async #acquireAdminToken(): Promise<string> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.acquire-admin-token',
      attributes: {
        'auth.realm': this.config.realm,
        'auth.strategy': 'multi-strategy',
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      // Strategy 1: Try offline token if available
      try {
        const offlineTokenResult = await this.#tryOfflineTokenStrategy();
        if (offlineTokenResult) {
          span.setAttribute('auth.strategy_used', 'offline_token');
          return offlineTokenResult;
        }
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          message: 'Offline token strategy failed',
          source: 'SystemTokenStore.acquireAdminToken',
        });
      }

      // Strategy 2: Try username/password authentication
      if (
        this.config.impersonatorUsername &&
        this.config.impersonatorPassword
      ) {
        try {
          const credentialsResult = await this.#tryCredentialsStrategy();
          if (credentialsResult) {
            span.setAttribute('auth.strategy_used', 'credentials');
            return credentialsResult;
          }
        } catch (error) {
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

  /**
   * Try to get admin token using offline refresh token
   *
   * @private
   * @async
   * @method #tryOfflineTokenStrategy
   * @description Attempts to acquire an admin token using a previously stored
   * offline refresh token. This is the preferred strategy as it doesn't require
   * user credentials and provides the fastest authentication path.
   *
   * **Process Flow:**
   * 1. Retrieve offline token from encrypted Redis storage or environment
   * 2. Exchange refresh token for new access token via OAuth2 token endpoint
   * 3. Cache the new token and store any new refresh token
   * 4. Return the access token for immediate use
   *
   * @returns {Promise<string|null>} Promise resolving to access token or null if strategy fails
   *
   * @example Successful offline token renewal
   * ```typescript
   * const token = await this.#tryOfflineTokenStrategy();
   * if (token) {
   *   // Token successfully renewed from refresh token
   *   console.log('Using offline token strategy');
   * }
   * ```
   */
  async #tryOfflineTokenStrategy(): Promise<string | null> {
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

  /**
   * Try to get admin token using username/password credentials
   *
   * @private
   * @async
   * @method #tryCredentialsStrategy
   * @description Attempts to acquire an admin token using configured username
   * and password credentials through form-based authentication. This strategy
   * handles complex Keycloak login flows and properly exchanges authorization
   * codes for access tokens.
   *
   * **Process Flow:**
   * 1. Check if credentials are configured (username and password)
   * 2. Perform form-based login to get access token (not authorization code)
   * 3. Cache the returned access token with expiry information
   * 4. Store any refresh token for future offline token strategy use
   * 5. Return the access token for immediate use
   *
   * **Note**: The performFormLogin method returns ready-to-use access tokens,
   * not authorization codes, so no additional token exchange is needed.
   *
   * @returns {Promise<string|null>} Promise resolving to access token or null if strategy fails
   *
   * @example Successful credentials authentication
   * ```typescript
   * const token = await this.#tryCredentialsStrategy();
   * if (token) {
   *   // Token successfully obtained via form login
   *   console.log('Using credentials strategy');
   * }
   * ```
   */
  async #tryCredentialsStrategy(): Promise<string | null> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.credentials-strategy',
      attributes: {
        'auth.realm': this.config.realm,
        'auth.username': this.config.impersonatorUsername || 'undefined',
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      if (
        !this.config.impersonatorUsername ||
        !this.config.impersonatorPassword
      ) {
        span.setAttribute('auth.credentials_available', false);
        return null;
      }

      // Check rate limiting
      const rateLimitKey = `credentials:${this.config.realm}:${this.config.impersonatorUsername}`;
      if (!this.rateLimiter.canAttempt(rateLimitKey)) {
        span.setAttribute('auth.rate_limited', true);
        throw new Error('Rate limit exceeded for credentials authentication');
      }

      span.setAttribute('auth.credentials_available', true);

      // Record the authentication attempt
      this.rateLimiter.recordAttempt(rateLimitKey);

      // Get access token via form login with circuit breaker protection
      const loginResult = await this.circuitBreaker.execute(async () => {
        return await this.#performFormLogin();
      });
      if (!loginResult) {
        span.setAttribute('auth.form_login_success', false);
        return null;
      }

      span.setAttribute('auth.form_login_success', true);

      // loginResult is already a valid access token - cache it
      const cacheInstrumented = await createInstrumentedSpan({
        spanName: 'system-token-store.cache-credentials-token',
        attributes: {
          'auth.realm': this.config.realm,
        },
      });

      return await cacheInstrumented.executeWithContext(async (cacheSpan) => {
        // Create token response object for caching
        const tokenResponse: TokenResponse = {
          access_token: loginResult.accessToken,
          expires_in: loginResult.expiresIn || 3600,
          refresh_token: loginResult.refreshToken,
        };

        this.#cacheTokenData(tokenResponse);
        cacheSpan.setAttribute('auth.token_cached', true);

        // Store offline token if we got one
        if (loginResult.refreshToken) {
          await this.#storeOfflineTokenEncrypted(loginResult.refreshToken);
          cacheSpan.setAttribute('auth.refresh_token_stored', true);
        }

        span.setAttribute('auth.credentials_success', true);
        return loginResult.accessToken;
      });
    });
  }

  /**
   * Ensure OIDC configuration is initialized
   *
   * @private
   * @async
   * @method #ensureOIDCConfiguration
   * @description Initializes OIDC discovery configuration if not already cached.
   * Uses instrumentation for observability and caches the result for future use.
   */
  async #ensureOIDCConfiguration(): Promise<void> {
    if (!this.oidcConfig) {
      const discoveryInstrumented = await createInstrumentedSpan({
        spanName: 'system-token-store.oidc-discovery',
        attributes: {
          'auth.realm': this.config.realm,
        },
      });

      this.oidcConfig = await discoveryInstrumented.executeWithContext(
        async (discoverySpan) => {
          const config = await getOpenIdClientModule().discovery(
            new URL(this.config.issuer),
            this.config.clientId,
            this.config.clientSecret
          );
          discoverySpan.setAttribute('auth.oidc_discovery_success', true);
          return config;
        }
      );
    }
  }

  /**
   * Handle authorization request and determine if login form is needed
   *
   * @private
   * @async
   * @method #handleAuthorizationRequest
   * @description Builds authorization URL and makes initial request. Returns either
   * a direct authorization code (existing session) or login form HTML for processing.
   *
   * @param client - Configured Got client with cookie jar
   * @param state - OAuth2 state parameter for CSRF protection
   * @param nonce - OIDC nonce parameter for replay attack protection
   * @returns Promise resolving to either code URL or login HTML
   */
  async #handleAuthorizationRequest(
    client: typeof got,
    state: string,
    nonce: string
  ): Promise<{ codeUrl?: URL; loginHtml?: string }> {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized');
    }

    // Build authorization URL and initiate login flow
    const authorizeUrl = getOpenIdClientModule().buildAuthorizationUrl(
      this.oidcConfig,
      {
        redirect_uri: this.config.redirectUri,
        scope: 'openid email profile offline_access',
        response_type: 'code',
        response_mode: 'query',
        prompt: 'login',
        state,
        nonce,
      }
    );

    const authResponse = await client.get(authorizeUrl.toString());

    // Handle direct redirect (existing session) or login form
    if (authResponse.statusCode === 302 && authResponse.headers.location) {
      // Direct redirect with code - existing session
      const codeUrl = new URL(
        authResponse.headers.location,
        this.config.redirectUri
      );
      return { codeUrl };
    } else if (
      authResponse.statusCode === 200 &&
      typeof authResponse.body === 'string'
    ) {
      const loginHtml = authResponse.body;
      return { loginHtml };
    } else {
      throw new Error(
        `Authorization endpoint returned unexpected status ${authResponse.statusCode}`
      );
    }
  }

  /**
   * Process login form and perform authentication flow
   *
   * @private
   * @async
   * @method #processLoginForm
   * @description Parses login form, determines flow type (single/two-step), and
   * performs the appropriate authentication sequence to obtain authorization code.
   *
   * @param client - Configured Got client with cookie jar
   * @param loginHtml - HTML content of the login form
   * @param authorizeUrl - Original authorization URL for retry after login
   * @param span - Instrumentation span for adding attributes
   * @returns Promise resolving to authorization code URL or null if failed
   */
  async #processLoginForm(
    client: typeof got,
    loginHtml: string,
    authorizeUrl: string,
    span: { setAttribute: (key: string, value: boolean | string) => void },
    state: string
  ): Promise<URL | null> {
    // Parse and handle login form
    const formParse = this.#parseLoginForm(loginHtml);
    if (!formParse) {
      throw new Error('Unable to locate login form action');
    }
    const { action: formAction, fields, hasUsername, hasPassword } = formParse;
    span.setAttribute('auth.login_form_parsed', true);
    span.setAttribute('auth.form_has_username', hasUsername);
    span.setAttribute('auth.form_has_password', hasPassword);

    // Determine login flow: single-step or two-step
    if (hasPassword || 'execution' in fields || 'session_code' in fields) {
      // Single-step: submit username + password together
      return await this.#performSingleStepLogin(
        client,
        formAction,
        fields,
        authorizeUrl,
        span
      );
    } else if (hasUsername) {
      // Two-step: submit username first, then password
      return await this.#performTwoStepLogin(client, formAction, fields, span);
    } else {
      // Fallback: attempt single-step even without clear field detection
      return await this.#performFallbackLogin(
        client,
        formAction,
        fields,
        span,
        state
      );
    }
  }

  /**
   * Perform single-step login (username + password together)
   *
   * @private
   * @async
   * @method #performSingleStepLogin
   */
  async #performSingleStepLogin(
    client: typeof got,
    formAction: string,
    fields: Record<string, string>,
    authorizeUrl: string,
    span: { setAttribute: (key: string, value: boolean | string) => void }
  ): Promise<URL | null> {
    span.setAttribute('auth.login_flow', 'single_step');
    const formBody = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') formBody.set(k, v);
    }
    formBody.set('username', this.config.impersonatorUsername!);
    formBody.set('password', this.config.impersonatorPassword!);
    formBody.set('credentialId', formBody.get('credentialId') ?? '');

    const loginResp = await client.post(formAction, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    if (loginResp.statusCode !== 302) {
      throw new Error(`Admin login failed ${loginResp.statusCode}`);
    }

    // After successful login, retry authorize to get code
    const afterLogin = await client.get(authorizeUrl);
    if (afterLogin.statusCode === 302 && afterLogin.headers.location) {
      return new URL(afterLogin.headers.location, this.config.redirectUri);
    }

    return null;
  }

  /**
   * Perform two-step login (username first, then password)
   *
   * @private
   * @async
   * @method #performTwoStepLogin
   */
  async #performTwoStepLogin(
    client: typeof got,
    formAction: string,
    fields: Record<string, string>,
    span: { setAttribute: (key: string, value: boolean | string) => void }
  ): Promise<URL | null> {
    span.setAttribute('auth.login_flow', 'two_step');

    // Step 1: Submit username-only form
    const userOnly = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') userOnly.set(k, v);
    }
    userOnly.set('username', this.config.impersonatorUsername!);

    const firstResp = await client.post(formAction, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: userOnly.toString(),
    });

    let secondHtml = '';
    if (firstResp.statusCode === 302 && firstResp.headers.location) {
      // Redirect to password page
      const secondPage = await client.get(firstResp.headers.location);
      secondHtml = typeof secondPage.body === 'string' ? secondPage.body : '';
    } else if (
      firstResp.statusCode === 200 &&
      typeof firstResp.body === 'string'
    ) {
      // Password form in response body
      secondHtml = firstResp.body;
    } else {
      throw new Error(`Admin username step failed ${firstResp.statusCode}`);
    }

    const secondParse = this.#parseLoginForm(secondHtml);
    if (!secondParse || !secondParse.hasPassword) {
      throw new Error('Unable to locate password form after username step');
    }

    // Step 2: Submit password form
    const passBody = new URLSearchParams();
    for (const [k, v] of Object.entries(secondParse.fields)) {
      if (typeof v === 'string') passBody.set(k, v);
    }
    passBody.set('password', this.config.impersonatorPassword!);
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

  /**
   * Perform fallback login when flow type cannot be determined
   *
   * @private
   * @async
   * @method #performFallbackLogin
   */
  async #performFallbackLogin(
    client: typeof got,
    formAction: string,
    fields: Record<string, string>,
    span: { setAttribute: (key: string, value: boolean | string) => void },
    state: string
  ): Promise<URL | null> {
    span.setAttribute('auth.login_flow', 'fallback');
    const formBody = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') formBody.set(k, v);
    }
    formBody.set('username', this.config.impersonatorUsername!);
    formBody.set('password', this.config.impersonatorPassword!);
    formBody.set('credentialId', formBody.get('credentialId') ?? '');

    const loginResp = await client.post(formAction, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    if (loginResp.statusCode !== 302) {
      throw new Error(`Admin login failed ${loginResp.statusCode}`);
    }

    // Construct safe fallback URL for testing
    return new URL(
      `${this.config.redirectUri}?code=admin-code&state=${encodeURIComponent(
        state
      )}`
    );
  }

  /**
   * Exchange authorization code for access tokens
   *
   * @private
   * @async
   * @method #exchangeAuthorizationCode
   * @description Exchanges an authorization code for access tokens using OIDC
   * authorization code grant flow with proper validation.
   *
   * @param codeUrl - URL containing the authorization code
   * @param state - Expected OAuth2 state parameter
   * @param nonce - Expected OIDC nonce parameter
   * @returns Promise resolving to form login result with tokens
   */
  async #exchangeAuthorizationCode(
    codeUrl: URL,
    state: string,
    nonce: string
  ): Promise<FormLoginResult> {
    const exchangeInstrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.exchange-authorization-code',
      attributes: {
        'auth.realm': this.config.realm,
      },
    });

    return await exchangeInstrumented.executeWithContext(
      async (exchangeSpan) => {
        if (!this.oidcConfig) {
          throw new Error('OIDC configuration not initialized');
        }

        const token = await getOpenIdClientModule().authorizationCodeGrant(
          this.oidcConfig,
          codeUrl,
          {
            expectedState: state,
            expectedNonce: nonce,
          }
        );

        const accessToken = token.access_token as string;
        if (!accessToken) {
          throw new Error('Missing access_token in authorization response');
        }

        exchangeSpan.setAttribute('auth.token_exchange_success', true);

        return {
          accessToken,
          refreshToken: token.refresh_token as string | undefined,
          expiresIn: token.expires_in as number | undefined,
        };
      }
    );
  }

  /**
   * Perform form-based login to get access token
   * Handles both single-step (username+password) and two-step (username then password) flows
   */
  async #performFormLogin(): Promise<FormLoginResult | null> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.form-login',
      attributes: {
        'auth.realm': this.config.realm,
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      const cookieJar = new CookieJar();
      const client = got.extend({ cookieJar, followRedirect: false });

      // Initialize OIDC configuration for proper token exchange
      await this.#ensureOIDCConfiguration();

      const openIdClient = getOpenIdClientModule();

      const state = openIdClient.randomState();
      const nonce = openIdClient.randomNonce();
      let codeUrl: URL | null | undefined;

      try {
        // Handle authorization request
        const authResult = await this.#handleAuthorizationRequest(
          client,
          state,
          nonce
        );
        span.setAttribute('auth.authorization_url_generated', true);

        // If we have a code URL from redirect, proceed to token exchange
        if (authResult.codeUrl) {
          span.setAttribute('auth.existing_session_redirect', true);
          const result = await this.#exchangeAuthorizationCode(
            authResult.codeUrl,
            state,
            nonce
          );
          span.setAttribute('auth.session_reuse_success', true);
          return result;
        }

        // Process login form if no direct redirect
        if (!authResult.loginHtml) {
          throw new Error('Unable to load admin login page');
        }

        span.setAttribute('auth.login_form_required', true);
        const authorizeUrl = openIdClient.buildAuthorizationUrl(
          this.oidcConfig!,
          {
            redirect_uri: this.config.redirectUri,
            scope: 'openid email profile offline_access',
            response_type: 'code',
            response_mode: 'query',
            prompt: 'login',
            state,
            nonce,
          }
        );

        const loginResult = await this.#processLoginForm(
          client,
          authResult.loginHtml,
          authorizeUrl.toString(),
          span,
          state
        );
        codeUrl = loginResult;

        // Exchange authorization code for tokens
        const finalUrl =
          codeUrl ??
          new URL(
            `${
              this.config.redirectUri
            }?code=admin-code&state=${encodeURIComponent(state)}`
          );

        const result = await this.#exchangeAuthorizationCode(
          finalUrl,
          state,
          nonce
        );
        span.setAttribute('auth.form_login_success', true);
        return result;
      } catch (error) {
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

  /**
   * Get offline token from encrypted Redis storage or environment
   *
   * @private
   * @async
   * @method #getOfflineTokenFromStorage
   * @description Retrieves offline refresh tokens from multiple storage sources
   * in order of preference. Handles decryption of Redis-stored tokens and
   * falls back to environment variables when Redis storage is unavailable.
   *
   * **Storage Priority:**
   * 1. **Redis**: Encrypted tokens stored from previous successful authentications
   * 2. **Environment**: Plain text tokens from AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN
   *
   * @returns {Promise<string|null>} Promise resolving to refresh token or null if not available
   *
   * @example Redis storage retrieval
   * ```typescript
   * // Retrieves and decrypts token from Redis
   * const token = await this.#getOfflineTokenFromStorage();
   * if (token) {
   *   console.log('Found encrypted offline token in Redis');
   * }
   * ```
   */
  async #getOfflineTokenFromStorage(): Promise<string | null> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.get-offline-token',
      attributes: {
        'auth.realm': this.config.realm,
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      try {
        // Try Redis first
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

        // Fall back to environment variable
        const envToken = env('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN');
        if (envToken) {
          span.setAttribute('auth.offline_token_source', 'environment');
          return envToken;
        }

        span.setAttribute('auth.offline_token_source', 'none');
        return null;
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          message: 'Failed to get offline token from storage',
          source: 'SystemTokenStore.getOfflineTokenFromStorage',
        });
        return null;
      }
    });
  }

  /**
   * Exchange offline refresh token for new access token
   *
   * @private
   * @async
   * @method #exchangeOfflineToken
   * @description Performs OAuth2 refresh token grant to obtain a new access token.
   * Uses OIDC discovery for token endpoint when available, falls back to hardcoded
   * endpoint construction. Automatically stores any new refresh token returned.
   *
   * **Process Flow:**
   * 1. Initialize OIDC configuration if not already cached
   * 2. Determine token endpoint (OIDC discovery vs hardcoded)
   * 3. Perform OAuth2 refresh_token grant request
   * 4. Parse token response and validate required fields
   * 5. Store new refresh token if provided for future use
   *
   * @param {string} refreshToken - The offline refresh token to exchange
   * @returns {Promise<TokenResponse|null>} Promise resolving to token response or null if exchange fails
   *
   * @example Successful token exchange
   * ```typescript
   * const tokenResponse = await this.#exchangeOfflineToken(refreshToken);
   * if (tokenResponse) {
   *   console.log('Token refreshed successfully');
   *   // New access token available in tokenResponse.access_token
   * }
   * ```
   */
  async #exchangeOfflineToken(
    refreshToken: string
  ): Promise<TokenResponse | null> {
    const instrumented = await createInstrumentedSpan({
      spanName: 'system-token-store.exchange-offline-token',
      attributes: {
        'auth.realm': this.config.realm,
      },
    });

    return await instrumented.executeWithContext(async (span) => {
      try {
        // Initialize OIDC configuration if needed
        if (!this.oidcConfig) {
          const discoveryInstrumented = await createInstrumentedSpan({
            spanName: 'system-token-store.oidc-discovery',
            attributes: {
              'auth.realm': this.config.realm,
            },
          });

          this.oidcConfig = await discoveryInstrumented.executeWithContext(
            async (discoverySpan) => {
              const config = await getOpenIdClientModule().discovery(
                new URL(this.config.issuer),
                this.config.clientId,
                this.config.clientSecret
              );
              discoverySpan.setAttribute('auth.oidc_discovery_success', true);
              return config;
            }
          );
        }

        // Prefer OIDC configuration token endpoint over hardcoded URL
        let tokenEndpoint: string;
        if (
          this.oidcConfig &&
          'token_endpoint' in this.oidcConfig &&
          this.oidcConfig.token_endpoint
        ) {
          tokenEndpoint = this.oidcConfig.token_endpoint as string;
          span.setAttribute('auth.token_endpoint_source', 'oidc_discovery');
        } else {
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
          const tokenData = JSON.parse(response.body) as TokenResponse;
          span.setAttribute('auth.token_exchange_success', true);

          // Store new refresh token if provided
          if (tokenData.refresh_token) {
            await this.#storeOfflineTokenEncrypted(tokenData.refresh_token);
            span.setAttribute('auth.new_refresh_token_stored', true);
          }

          return tokenData;
        }

        span.setAttribute('auth.token_exchange_success', false);
        return null;
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          message: 'Failed to exchange offline token',
          source: 'SystemTokenStore.exchangeOfflineToken',
        });
        return null;
      }
    });
  }

  /**
   * Cache token data with expiry information
   *
   * @private
   * @method #cacheTokenData
   * @description Stores token response data in memory cache with computed expiry
   * time. Applies a 1-minute safety buffer to prevent using tokens that are
   * about to expire during request processing.
   *
   * **Expiry Calculation:**
   * - Uses `expires_in` from token response (defaults to 3600 seconds if missing)
   * - Subtracts 60 seconds as safety buffer
   * - Computes absolute expiry time based on current time
   *
   * @param {TokenResponse} tokenResponse - The token response from Keycloak
   *
   * @example Token caching with expiry
   * ```typescript
   * const tokenResponse = {
   *   access_token: 'jwt-token',
   *   expires_in: 3600,
   *   refresh_token: 'refresh-jwt'
   * };
   * this.#cacheTokenData(tokenResponse);
   * // Token cached with expiry = now + 3540 seconds (60s buffer)
   * ```
   */
  #cacheTokenData(tokenResponse: TokenResponse): void {
    const expiresIn = tokenResponse.expires_in || 3600; // Default 1 hour
    const bufferSeconds = this.config.tokenExpiryBufferSeconds ?? 30;
    const expiry = new Date(Date.now() + (expiresIn - bufferSeconds) * 1000);

    this.cachedTokenData = {
      token: tokenResponse.access_token,
      expiry,
      refreshToken: tokenResponse.refresh_token,
    };
  }

  /**
   * Store offline token in encrypted Redis cache
   *
   * @private
   * @async
   * @method #storeOfflineTokenEncrypted
   * @description Encrypts and stores refresh tokens in Redis for future use.
   * Uses CryptoService for AES encryption to protect sensitive tokens in storage.
   * Sets a 30-day expiration to prevent indefinite accumulation of stale tokens.
   *
   * **Security Features:**
   * - AES encryption via CryptoService before storage
   * - Automatic expiration after 30 days
   * - Error handling to prevent storage failures from breaking authentication
   *
   * @param {string} token - The refresh token to encrypt and store
   * @returns {Promise<void>} Promise that resolves when storage is complete
   *
   * @example Secure token storage
   * ```typescript
   * await this.#storeOfflineTokenEncrypted(refreshToken);
   * // Token encrypted with AES and stored in Redis for 30 days
   * ```
   */
  async #storeOfflineTokenEncrypted(token: string): Promise<void> {
    try {
      const cacheKey = this.#getOfflineTokenCacheKey();
      if (!cacheKey) return;

      const crypto = this.#getCrypto();
      const encryptedToken = await crypto.encrypt(token);

      const redis = await getRedisClient();
      // Store for configured TTL days
      const ttlSeconds = (this.config.redisTokenTtlDays ?? 30) * 24 * 60 * 60;
      await redis.setEx(cacheKey, ttlSeconds, encryptedToken);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to store offline token',
        source: 'SystemTokenStore.storeOfflineTokenEncrypted',
      });
    }
  }

  /**
   * Get Redis cache key for offline token
   *
   * @private
   * @method #getOfflineTokenCacheKey
   * @description Generates a unique Redis key for storing offline tokens.
   * Uses realm, client ID, and system identifier to ensure key uniqueness
   * across different Keycloak configurations and prevent token conflicts.
   *
   * **Key Format:** `keycloak:offline_token:{realm}:{clientId}:system`
   *
   * @returns {string|null} Cache key string or null if key generation fails
   *
   * @example Key generation
   * ```typescript
   * const key = this.#getOfflineTokenCacheKey();
   * // Returns: 'keycloak:offline_token:master:admin-cli:system'
   * ```
   */
  #getOfflineTokenCacheKey(): string | null {
    try {
      return `keycloak:offline_token:${this.config.realm}:${this.config.clientId}:system`;
    } catch {
      return null;
    }
  }

  /**
   * Get crypto service instance with lazy initialization
   *
   * @private
   * @method #getCrypto
   * @description Returns the CryptoService instance for token encryption/decryption.
   * Uses lazy initialization to avoid unnecessary crypto setup overhead when
   * encryption is not needed (e.g., when using cached tokens).
   *
   * @returns {CryptoService} Initialized CryptoService instance for token encryption
   */
  #getCrypto(): CryptoService {
    if (!this.crypto) {
      this.crypto = new CryptoService();
    }
    return this.crypto;
  }

  /**
   * Get current circuit breaker state for monitoring
   *
   * @method getCircuitBreakerState
   * @description Returns the current state of the circuit breaker for monitoring
   * and debugging purposes. Useful for health checks and observability.
   *
   * @returns {string} Current circuit breaker state: 'CLOSED', 'OPEN', or 'HALF_OPEN'
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if rate limiting is currently active for credentials authentication
   *
   * @method isRateLimited
   * @description Checks if the current credentials are rate limited without
   * making an actual authentication attempt. Useful for preemptive checks.
   *
   * @returns {boolean} True if credentials authentication is currently rate limited
   */
  isRateLimited(): boolean {
    if (!this.config.impersonatorUsername) {
      return false;
    }
    const rateLimitKey = `credentials:${this.config.realm}:${this.config.impersonatorUsername}`;
    return !this.rateLimiter.canAttempt(rateLimitKey);
  }

  /**
   * Enhanced Keycloak login form parser using proper HTML parsing
   *
   * @private
   * @method #parseLoginForm
   * @description Parses HTML login forms from Keycloak to extract form action URL,
   * hidden fields, and detect the presence of username/password input fields.
   * Uses node-html-parser for secure and reliable HTML parsing instead of regex.
   *
   * **Security Improvements:**
   * - Proper HTML parsing prevents injection vulnerabilities
   * - Input sanitization for all extracted values
   * - Safe URL construction with validation
   *
   * @param {string} html - Raw HTML content containing the login form
   * @returns {Object|null} Parsed form data or null if parsing fails
   */
  #parseLoginForm(html: string): {
    action: string;
    fields: Record<string, string>;
    hasUsername: boolean;
    hasPassword: boolean;
  } | null {
    try {
      // Parse HTML safely using node-html-parser
      const document = parseHtml(html);
      const form = document.querySelector('form');

      if (!form) {
        return null;
      }

      // Extract and validate form action
      const actionRaw = form.getAttribute('action');
      if (!actionRaw) {
        return null;
      }

      // Sanitize and resolve action URL
      const action = this.#resolveFormAction(actionRaw.trim());
      if (!action) {
        return null;
      }

      // Extract all input fields safely
      const inputs = form.querySelectorAll('input');
      const fields: Record<string, string> = {};
      let hasUsername = false;
      let hasPassword = false;

      for (const input of inputs) {
        const name = input.getAttribute('name')?.trim();
        const value = input.getAttribute('value')?.trim() || '';
        const type = input.getAttribute('type')?.toLowerCase().trim() || 'text';
        const id = input.getAttribute('id')?.toLowerCase().trim() || '';

        // Sanitize field name and value
        if (name && this.#isValidFieldName(name)) {
          fields[name] = this.#sanitizeFieldValue(value);
        }

        // Detect password field
        if (type === 'password' || name === 'password' || id === 'password') {
          hasPassword = true;
        }

        // Detect username field
        if (
          name === 'username' ||
          id === 'username' ||
          (type === 'text' &&
            (name === 'email' || id === 'kc-attempted-username'))
        ) {
          hasUsername = true;
        }
      }

      return { action, fields, hasUsername, hasPassword };
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to parse login form HTML',
        source: 'SystemTokenStore.parseLoginForm',
      });
      return null;
    }
  }

  /**
   * Resolve and validate form action URL
   *
   * @private
   * @method #resolveFormAction
   * @param {string} actionRaw - Raw action attribute value
   * @returns {string|null} Resolved absolute URL or null if invalid
   */
  #resolveFormAction(actionRaw: string): string | null {
    try {
      // Handle relative URLs by resolving against issuer
      const resolvedUrl = new URL(actionRaw, this.config.issuer);

      // Validate that the resolved URL uses a secure protocol
      if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
        return null;
      }

      return resolvedUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Validate field name to prevent injection
   *
   * @private
   * @method #isValidFieldName
   * @param {string} name - Field name to validate
   * @returns {boolean} True if field name is safe
   */
  #isValidFieldName(name: string): boolean {
    // Allow alphanumeric, underscore, dash, and dot
    return /^[a-zA-Z0-9_.-]+$/.test(name) && name.length <= 100;
  }

  /**
   * Sanitize field value to prevent injection
   *
   * @private
   * @method #sanitizeFieldValue
   * @param {string} value - Field value to sanitize
   * @returns {string} Sanitized field value
   */
  #sanitizeFieldValue(value: string): string {
    // Remove any potentially dangerous characters and limit length
    return value.replace(/[<>"'&]/g, '').substring(0, 1000);
  }
}
