import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { ConnectionConfig } from '@keycloak/keycloak-admin-client/lib/client';

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
): KeycloakAdminClient => new KeycloakAdminClient(config);
