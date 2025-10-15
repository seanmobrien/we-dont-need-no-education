import type { Provider } from '@auth/core/providers';
import { env } from '../site-util/env';

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
        scope: 'openid profile email roles',
      },
    },
    allowDangerousEmailAccountLinking: true,
  };
  // const keycloak = KeyCloak<KeycloakProfile>(providerArgs);
  const keycloak = {
    id: 'keycloak',
    name: 'Keycloak',
    type: 'oidc',
    style: { brandColor: '#428bca' },
    options: providerArgs,
  } as Provider;
  return [keycloak];
};
