type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
export interface RequestArgs {
  method: Method;
  path?: string;
  urlParamKeys?: string[];
  queryParamKeys?: string[];
  keyTransform?: Record<string, string>;
  catchNotFound?: boolean;
  payloadKey?: string;
  returnResourceIdInLocationHeader?: {
    field: string;
  };
  /**
   * Keys to be ignored, meaning that they will not be filtered out of the request payload even if they are a part of `urlParamKeys` or `queryParamKeys`,
   */
  ignoredKeys?: string[];
  headers?: [string, string][] | Record<string, string> | Headers;
}

export type ConnectionConfig = {
  baseUrl?: string;
  realmName?: string;
  requestOptions?: RequestInit;
  requestArgOptions?: Pick<RequestArgs, 'catchNotFound'>;
};

export type KeycloakAdminClient = {
  users: unknown;
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
  baseUrl: string;
  realmName: string;
  scope?: string;
  accessToken?: string;
  refreshToken?: string;
  auth(credentials: unknown): Promise<void>;
  registerTokenProvider(provider: unknown): void;
  setAccessToken(token: string): void;
  getAccessToken(): Promise<string | undefined>;
  getRequestOptions(): RequestInit | undefined;
  getGlobalRequestArgOptions(): Pick<RequestArgs, 'catchNotFound'> | undefined;
  setConfig(connectionConfig: ConnectionConfig): void;
};

let KeycloakAdminClientImpl: any = null;

/**
 * Create a configured Keycloak Admin client.
 *
 * This factory wraps the KeycloakAdminClient constructor and provides a single
 * place to create clients in the codebase. The passed `config` object is
 * forwarded directly to the upstream Keycloak admin client library.
 *
 * @param {ConnectionConfig} config - Connection settings for the Keycloak Admin client.
 * @returns {KeycloakAdminClient} An initialized Keycloak admin client instance.
 *
 * @example
 * ```ts
 * import { keycloakAdminClientFactory } from '@/lib/auth/keycloak-factories';
 * const client = keycloakAdminClientFactory({ baseUrl: 'https://auth', realmName: 'master' });
 * ```
 */
export const keycloakAdminClientFactory = (
  config: ConnectionConfig,
): KeycloakAdminClient => {
  if (!KeycloakAdminClientImpl) {
    KeycloakAdminClientImpl =
      require('@keycloak/keycloak-admin-client').default;
  }
  return new KeycloakAdminClientImpl(config);
};
