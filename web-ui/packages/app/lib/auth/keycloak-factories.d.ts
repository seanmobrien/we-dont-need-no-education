/**
 * Keycloak factory functions
 * @module @/lib/auth/keycloak-factories
 *
 * This declaration file exposes a minimal, documented surface for creating and
 * interacting with a configured Keycloak Admin client. The runtime implementation
 * wraps the upstream Keycloak Admin SDK and normalizes the interface used across
 * the codebase so callers can rely on a small, well-documented subset of APIs.
 */

declare module '@/lib/auth/keycloak-factories' {
  /**
   * Supported HTTP methods used when constructing Keycloak API requests.
   */
  type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

  /**
   * Arguments used by helpers that build and execute Keycloak REST requests.
   *
   * This interface captures common options used across the small set of
   * Keycloak helper utilities in the codebase. Implementations should treat
   * these values as hints for request construction (path interpolation,
   * query serialization, headers, and payload shaping).
   */
  export interface RequestArgs {
    /** The HTTP method to use for the request. */
    method: Method;

    /**
     * Optional path fragment appended to the configured Keycloak base URL.
     * When provided, callers are responsible for ensuring the path is
     * properly encoded or composed from safe segments.
     */
    path?: string;

    /**
     * Keys that should be replaced into the path when constructing the URL.
     * For example, if path is '/users/{id}' then `urlParamKeys` may contain
     * ['id'] and the runtime will substitute values from a provided params map.
     */
    urlParamKeys?: string[];

    /**
     * Keys to include as query parameters. The runtime will read values from
     * the payload or params and append them to the request query string.
     */
    queryParamKeys?: string[];

    /**
     * Optional mapping for key transformation when building the request.
     * Useful when caller uses different property names than the remote API.
     * Example: { localId: 'id' } will rename `localId` to `id` before sending.
     */
    keyTransform?: Record<string, string>;

    /**
     * When true, helper functions should treat 404 responses as non-fatal and
     * return `undefined` (or an empty result) rather than throwing an error.
     */
    catchNotFound?: boolean;

    /**
     * When the payload is a wrapper object, `payloadKey` indicates which
     * property contains the actual request body that should be sent upstream.
     */
    payloadKey?: string;

    /**
     * In some Keycloak APIs the ID of a created resource is returned via the
     * `Location` header. When present, `returnResourceIdInLocationHeader`
     * instructs helpers to extract the given `field` name from the created
     * resource and return it as the operation result.
     */
    returnResourceIdInLocationHeader?: {
      field: string;
    };

    /**
     * Keys to ignore when filtering payload/params. Ignored keys will not be
     * removed even if they appear in `urlParamKeys` or `queryParamKeys`.
     */
    ignoredKeys?: string[];

    /**
     * Additional headers to include in the HTTP request. Accepts the same
     * shapes as the Fetch API: an array of tuples, a plain record, or a
     * `Headers` instance.
     */
    headers?: [string, string][] | Record<string, string> | Headers;
  }

  /**
   * Connection configuration used to initialize the Keycloak client.
   *
   * All properties are optional; the runtime will apply sensible defaults
   * when values are omitted. `baseUrl` and `realmName` are the most common
   * values used to target a specific Keycloak instance/realm.
   */
  export type ConnectionConfig = {
    /** Base URL of the Keycloak server (e.g. 'https://auth.example.com'). */
    baseUrl?: string;

    /** Realm name to scope requests (e.g. 'master' or 'myrealm'). */
    realmName?: string;

    /** Optional global RequestInit to apply to all outgoing HTTP calls. */
    requestOptions?: RequestInit;

    /** Optional defaults for RequestArgs (currently only `catchNotFound`). */
    requestArgOptions?: Pick<RequestArgs, 'catchNotFound'>;
  };

  /**
   * Minimal surface of the Keycloak Admin client used by the application.
   *
   * The upstream Keycloak SDK exposes many more methods; we only declare the
   * commonly-used subset here so callers can rely on a stable, well-typed
   * shape without depending on a specific Keycloak SDK version.
   */
  export type KeycloakAdminClient = {
    /**
     * User management helpers. The `find` method returns matching users with
     * their id, username and email when available.
     */
    users: {
      find(query: {
        username?: string;
        email?: string;
        /**
         * Full-text search string. Implementation may perform partial or
         * fuzzy matching depending on Keycloak server configuration.
         */
        search?: string;
        /** If true, perform an exact search match when supported. */
        exact?: boolean;
      }): Promise<Array<{ id: string; username?: string; email?: string }>>;
    };

    /* Miscellaneous admin subsystems (left as opaque types). */
    userStorageProvider: unknown;
    groups: unknown;
    roles: unknown;
    organizations: unknown;
    workflows: unknown;
    clients: unknown;
    realms: unknown;
    clientScopes: unknown;
    clientPolicies: unknown;
    identityProviders: unknown;
    components: unknown;
    serverInfo: unknown;
    whoAmI: unknown;
    attackDetection: unknown;
    authenticationManagement: unknown;
    cache: unknown;

    /** Base URL the client was configured with. */
    baseUrl: string;
    /** Realm the client is scoped to. */
    realmName: string;

    /** OAuth2 scopes requested when obtaining tokens (optional). */
    scope?: string;

    /** Currently stored access token (may be undefined). */
    accessToken?: string;
    /** Optional refresh token used by the client to refresh access tokens. */
    refreshToken?: string;

    /**
     * Authenticate the admin client using provided credentials. The exact
     * credential shape depends on the runtime adapter (admin-cli token, client
     * credentials, etc.). Implementations should persist tokens on success.
     */
    auth(credentials: unknown): Promise<void>;

    /** Register a custom token provider (used for impersonation/multi-tenant flows). */
    registerTokenProvider(provider: unknown): void;

    /** Set the cached access token used for outgoing requests. */
    setAccessToken(token: string): void;

    /** Retrieve the currently stored access token, if any. */
    getAccessToken(): Promise<string | undefined>;

    /** Get low-level RequestInit used by the client for outgoing HTTP calls. */
    getRequestOptions(): RequestInit | undefined;

    /**
     * Return global request-argument defaults (for example catchNotFound).
     * Useful when helper utilities need to inherit common request behavior.
     */
    getGlobalRequestArgOptions():
      | Pick<RequestArgs, 'catchNotFound'>
      | undefined;

    /** Update the client's runtime configuration (baseUrl, realmName, etc.). */
    setConfig(connectionConfig: ConnectionConfig): void;
  };
  /**
   * Create a configured Keycloak Admin client.
   *
   * `config` parameter is optional; when omitted the implementation should
   * read configuration from environment or application config stores.
   *
   * @param config Optional connection configuration to override defaults.
   */
  export function keycloakAdminClientFactory(
    config: ConnectionConfig,
  ): KeycloakAdminClient;
}
