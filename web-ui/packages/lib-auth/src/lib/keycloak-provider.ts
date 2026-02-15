import type { Provider } from '@auth/core/providers';
import KeyCloak, { KeycloakProfile } from 'next-auth/providers/keycloak';
import { env } from '@compliance-theater/env';

export const setupKeyCloakProvider = (): Provider[] => {
  const providerArgs = {
    clientId: env('AUTH_KEYCLOAK_CLIENT_ID'),
    clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET'),
    issuer: env('AUTH_KEYCLOAK_ISSUER'),
    authorization: {
      params: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
        scope: env('AUTH_KEYCLOAK_SCOPE'),
      },
    },
    allowDangerousEmailAccountLinking: true,
  };
  const keycloak = KeyCloak<KeycloakProfile>(providerArgs);
  return [keycloak];
};
