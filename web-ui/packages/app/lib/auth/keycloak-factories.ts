import { SingletonProvider } from '@compliance-theater/typescript';

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
  users: {
    find(query: {
      username?: string;
      email?: string;
      search?: string;
      exact?: boolean;
    }): Promise<Array<{ id?: string; username?: string; email?: string }>>;
  };
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

export const keycloakAdminClientFactory = async (
  config: ConnectionConfig
): Promise<KeycloakAdminClient> => {
  const keycloakAdminClientModule =
    await SingletonProvider.Instance.getRequired(
      Symbol.for(
        '@no-education/dynamic-modules/@keycloak/keycloak-admin-client'
      ),
      async () => {
        const mod = await import('@keycloak/keycloak-admin-client');
        return mod;
      }
    );
  return new keycloakAdminClientModule.default(config);
};
