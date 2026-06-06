import KeycloakProvider from 'next-auth/providers/keycloak';

import type { Provider } from './contracts';

type KeycloakProviderFactory = (options?: Record<string, unknown>) => Provider;

export const keycloakProvider: KeycloakProviderFactory =
  KeycloakProvider as unknown as KeycloakProviderFactory;